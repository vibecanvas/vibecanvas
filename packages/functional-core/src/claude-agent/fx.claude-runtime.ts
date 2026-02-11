import type { Options } from "@anthropic-ai/claude-agent-sdk";

type TClaudeRuntimeSource = "env" | "path" | "sdk-dev" | "none";

type TClaudeRuntimeOptions = Pick<
  Options,
  "pathToClaudeCodeExecutable" | "executable" | "executableArgs"
>;

type TClaudeRuntimeStatus = {
  available: boolean;
  source: TClaudeRuntimeSource;
  reason: string | null;
  options: TClaudeRuntimeOptions;
  detected: {
    bunPath: string | null;
    nodePath: string | null;
    claudePath: string | null;
  };
};

type TPortal = {
  fs: {
    existsSync: (path: string) => boolean;
  };
  process: {
    env: Record<string, string | undefined>;
  };
  runtime: {
    which: (command: string) => string | null;
    isCompiled: boolean;
    resolveSdkCliPathForDev: () => string | null;
  };
};

type TArgs = {
  executableEnvVar?: string;
};

const SCRIPT_EXTENSIONS = [".js", ".mjs", ".cjs", ".ts", ".tsx", ".jsx"];

function isScriptPath(pathToExecutable: string): boolean {
  const lower = pathToExecutable.toLowerCase();
  return SCRIPT_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

function resolvePath(
  portal: TPortal,
  candidate: string | null | undefined
): string | null {
  if (!candidate) return null;
  const trimmed = candidate.trim();
  if (!trimmed) return null;

  if (portal.fs.existsSync(trimmed)) return trimmed;
  return portal.runtime.which(trimmed);
}

function unavailableStatus(
  source: TClaudeRuntimeSource,
  reason: string,
  detected: TClaudeRuntimeStatus["detected"]
): TClaudeRuntimeStatus {
  return {
    available: false,
    source,
    reason,
    options: {},
    detected,
  };
}

function fxClaudeRuntime(
  portal: TPortal,
  args: TArgs
): TErrTuple<TClaudeRuntimeStatus> {
  try {
    const executableEnvVar =
      args.executableEnvVar ?? "VIBECANVAS_CLAUDE_CODE_EXECUTABLE";

    const bunPath = portal.runtime.which("bun");
    const nodePath = portal.runtime.which("node");
    const detectedBase = {
      bunPath,
      nodePath,
      claudePath: null,
    };

    const fromEnvRaw = portal.process.env[executableEnvVar];
    const fromEnv = resolvePath(portal, fromEnvRaw);
    if (fromEnvRaw && !fromEnv) {
      return [
        unavailableStatus(
          "env",
          `${executableEnvVar} not found: "${fromEnvRaw}"`,
          detectedBase
        ),
        null,
      ];
    }

    const claudePath = resolvePath(portal, "claude");
    const claudeCodePath = resolvePath(portal, "claude-code");
    const sdkDevPath = portal.runtime.isCompiled
      ? null
      : portal.runtime.resolveSdkCliPathForDev();

    const resolvedPath = fromEnv ?? claudePath ?? claudeCodePath ?? sdkDevPath;
    if (!resolvedPath) {
      return [
        unavailableStatus(
          "none",
          `Claude Code executable not found. Install \`claude\`/\`claude-code\` or set ${executableEnvVar}.`,
          detectedBase
        ),
        null,
      ];
    }

    const source: TClaudeRuntimeSource = fromEnv
      ? "env"
      : claudePath || claudeCodePath
      ? "path"
      : "sdk-dev";

    const options: TClaudeRuntimeOptions = {
      pathToClaudeCodeExecutable: resolvedPath,
    };

    if (isScriptPath(resolvedPath)) {
      if (bunPath) {
        options.executable = "bun";
        options.executableArgs = [];
      } else if (nodePath) {
        options.executable = "node";
        options.executableArgs = [];
      } else {
        return [
          unavailableStatus(
            source,
            "Claude executable is a script but neither `bun` nor `node` is available on PATH.",
            {
              ...detectedBase,
              claudePath: resolvedPath,
            }
          ),
          null,
        ];
      }
    }

    return [
      {
        available: true,
        source,
        reason: null,
        options,
        detected: {
          ...detectedBase,
          claudePath: resolvedPath,
        },
      },
      null,
    ];
  } catch (error) {
    const internalMessage = error instanceof Error ? error.message : String(error);
    return [
      null,
      {
        code: "FX.CLAUDE.RUNTIME_RESOLVE.FAILED",
        statusCode: 500,
        externalMessage: { en: "Failed to resolve Claude runtime" },
        internalMessage,
      },
    ];
  }
}

export default fxClaudeRuntime;
export type {
  TPortal,
  TArgs,
  TClaudeRuntimeSource,
  TClaudeRuntimeOptions,
  TClaudeRuntimeStatus,
};
