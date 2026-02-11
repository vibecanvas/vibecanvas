import { type Options, type SDKResultMessage, type SDKUserMessage, query } from "@anthropic-ai/claude-agent-sdk";
import fxClaudeRuntime, {
    type TClaudeRuntimeOptions,
    type TClaudeRuntimeSource,
    type TClaudeRuntimeStatus as TCoreClaudeRuntimeStatus,
} from "@vibecanvas/core/claude-agent/fx.claude-runtime";
import { existsSync } from "fs";
import { createRequire } from "module";
import path from "path";

const require = createRequire(import.meta.url);

function resolveSdkCliPathForDev(): string | null {
    if (process.env.VIBECANVAS_COMPILED === "true") return null;

    try {
        const sdkPath = require.resolve("@anthropic-ai/claude-agent-sdk/sdk.mjs");
        const cliPath = path.join(path.dirname(sdkPath), "cli.js");
        return existsSync(cliPath) ? cliPath : null;
    } catch {
        return null;
    }
}

export type TClaudeRuntimeStatus = {
    available: boolean;
    source: TClaudeRuntimeSource;
    reason: string | null;
    options: TClaudeRuntimeOptions;
    detected: TCoreClaudeRuntimeStatus["detected"];
};

function resolveRuntimeStatus(): TClaudeRuntimeStatus {
    const [runtimeResult, runtimeError] = fxClaudeRuntime(
        {
            fs: { existsSync },
            process: { env: process.env },
            runtime: {
                which: (command) => Bun.which(command) ?? null,
                isCompiled: process.env.VIBECANVAS_COMPILED === "true",
                resolveSdkCliPathForDev,
            },
        },
        {}
    );

    if (runtimeError) {
        return {
            available: false,
            source: "none",
            reason: runtimeError.externalMessage?.en ?? runtimeError.code,
            options: {},
            detected: {
                bunPath: Bun.which("bun") ?? null,
                nodePath: Bun.which("node") ?? null,
                claudePath: null,
            },
        };
    }

    return runtimeResult;
}

export class ClaudeRuntimeError extends Error {
    code = "SRV.CLAUDE_AGENT.RUNTIME_UNAVAILABLE" as const;

    constructor(message: string) {
        super(message);
        this.name = "ClaudeRuntimeError";
    }
}

export class ClaudeAgent {
    private static pool: Map<string, ClaudeAgent> = new Map();
    private static runtimeStatus: TClaudeRuntimeStatus | null = null;
    private sessionId: string | null = null;
    private queuedMessages: SDKUserMessage[] = [];
    private resolveWaiting: (() => void) | null = null;
    private isConnectedToClaudeInstance: boolean = false;
    private claudeOptions: Options = {};
    private cycleWaiters: Array<{
        resolve: (message: SDKResultMessage | null) => void;
        reject: (error: unknown) => void;
    }> = [];
    private disconnectedWaiters: Array<() => void> = [];
    private isCycleOpen: boolean = false;
    private settledCycleResult: SDKResultMessage | null = null;

    constructor(sessionId: string | null, claudeOptions?: Options ) {
        if(sessionId && ClaudeAgent.pool.has(sessionId)) {
            return ClaudeAgent.pool.get(sessionId)!;
        };

        this.claudeOptions = claudeOptions ?? {};
        if(!this.claudeOptions.abortController) {
            this.claudeOptions.abortController = new AbortController();
        }

        this.sessionId = sessionId;
        // not added to pool -> must wait for first message to set sessionId
        return this;
    }

    private async *messageIterator(): AsyncIterable<SDKUserMessage> {
        while (true) {
            while (this.queuedMessages.length > 0) {
                yield this.queuedMessages.shift()!;
            }
            await new Promise<void>((resolve) => {
                this.resolveWaiting = resolve;
            });
        }
    }

    private waitForCycleResult(): Promise<SDKResultMessage | null> {
        if (!this.isCycleOpen) {
            return Promise.resolve(this.settledCycleResult);
        }

        return new Promise<SDKResultMessage | null>((resolve, reject) => {
            this.cycleWaiters.push({ resolve, reject });
        });
    }

    private resolveCycleWaiters(message: SDKResultMessage | null) {
        this.settledCycleResult = message;
        this.isCycleOpen = false;
        for (const waiter of this.cycleWaiters) {
            waiter.resolve(message);
        }
        this.cycleWaiters = [];
    }

    private rejectCycleWaiters(error: unknown) {
        this.isCycleOpen = false;
        this.settledCycleResult = null;
        for (const waiter of this.cycleWaiters) {
            waiter.reject(error);
        }
        this.cycleWaiters = [];
    }

    private waitForDisconnect(): Promise<void> {
        if (!this.isConnectedToClaudeInstance) {
            return Promise.resolve();
        }

        return new Promise<void>((resolve) => {
            this.disconnectedWaiters.push(resolve);
        });
    }

    private resolveDisconnectWaiters() {
        for (const resolve of this.disconnectedWaiters) {
            resolve();
        }
        this.disconnectedWaiters = [];
    }

    public static get instances() {
        return ClaudeAgent.pool;
    }

    public static bootstrapRuntime(): TClaudeRuntimeStatus {
        if (!ClaudeAgent.runtimeStatus) {
            ClaudeAgent.runtimeStatus = resolveRuntimeStatus();
        }
        return ClaudeAgent.runtimeStatus;
    }

    public static getRuntimeStatus(): TClaudeRuntimeStatus {
        return ClaudeAgent.bootstrapRuntime();
    }

    private static getRuntimeOptions(): Partial<Options> {
        const runtimeStatus = ClaudeAgent.bootstrapRuntime();
        if (!runtimeStatus.available) {
            throw new ClaudeRuntimeError(
                runtimeStatus.reason ?? "Claude runtime is unavailable"
            );
        }
        return runtimeStatus.options;
    }

    /**
     * Send message to the agent
     */
    async *send(prompt: Omit<SDKUserMessage, 'session_id'> & { session_id?: string }) {
        // error in sdk, does not need session_id https://platform.claude.com/docs/en/agent-sdk/sessions on first message
        this.queuedMessages.push(prompt as unknown as SDKUserMessage);

        // If a runtime is already active, append to its input stream.
        // Current turn only ends when a result arrives and the input queue is empty.
        if (this.isConnectedToClaudeInstance) {
            this.resolveWaiting?.();
            this.resolveWaiting = null;

            // Runtime is in the process of closing a drained turn.
            // This prompt belongs to the next turn, not the settled one.
            if (!this.isCycleOpen) {
                await this.waitForDisconnect();

                // Another caller may have started the next runtime while we waited.
                if (this.isConnectedToClaudeInstance) {
                    const nextCycleResult = await this.waitForCycleResult();
                    if (nextCycleResult) {
                        yield nextCycleResult;
                    }
                    return;
                }

                this.isConnectedToClaudeInstance = true;
                this.isCycleOpen = true;
                this.settledCycleResult = null;
            } else {
                const cycleResult = await this.waitForCycleResult();
                if (cycleResult) {
                    yield cycleResult;
                }
                return;
            }
        }

        if (!this.isConnectedToClaudeInstance) {
            this.isConnectedToClaudeInstance = true;
            this.isCycleOpen = true;
            this.settledCycleResult = null;
        }

        let finalCycleResult: SDKResultMessage | null = null;

        try {
        const runtimeOptions = ClaudeAgent.getRuntimeOptions();
        const iterator = query({
            prompt: this.messageIterator(),
            options: {
                ...runtimeOptions,
                ...this.claudeOptions,
                resume: this.sessionId ?? undefined
            },
        });

        for await (const message of iterator) {
            if (message.type === 'system' && message.subtype === 'init') {
                this.sessionId = message.session_id;
                ClaudeAgent.pool.set(this.sessionId, this);
            }

            yield message;

            if (message.type === 'result') {
                finalCycleResult = message;

                // Keep the current turn alive while user input keeps arriving.
                if (this.queuedMessages.length === 0) {
                    this.resolveCycleWaiters(finalCycleResult);
                    return;
                }
            }
        }

        this.resolveCycleWaiters(finalCycleResult);
        } catch (error) {
            this.rejectCycleWaiters(error);
            throw error;
        } finally {
            this.isConnectedToClaudeInstance = false;
            this.resolveDisconnectWaiters();
        }
    }

    [Symbol.dispose]() {
        if (this.sessionId) {
            ClaudeAgent.pool.get(this.sessionId)?.claudeOptions.abortController?.abort();
            ClaudeAgent.pool.delete(this.sessionId);
        }

        this.rejectCycleWaiters(new Error("ClaudeAgent disposed"));
    }


}
