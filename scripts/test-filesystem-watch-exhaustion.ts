#!/usr/bin/env bun

import path from "path"

type TArgs = {
  baseUrl: string
  connections: number
  verbose: boolean
  apiTimeout: number
}

type TWatchConnection = {
  proc: Bun.Subprocess
  connected: Promise<boolean>
  close: () => Promise<void>
}

const frontendDir = path.join(import.meta.dir, "..", "apps", "frontend")
const WATCH_READY_PREFIX = "__WATCH_READY__"

function parseArgs(): TArgs {
  const args = Bun.argv.slice(2)
  const getArg = (name: string): string | undefined => {
    const idx = args.indexOf(name)
    if (idx === -1) return undefined
    return args[idx + 1]
  }

  if (args.includes("--help") || args.includes("-h")) {
    console.log("Usage: bun run scripts/test-filesystem-watch-exhaustion.ts [options]")
    console.log("")
    console.log("Options:")
    console.log("  --url <base-url>       Server base URL (default: http://127.0.0.1:3000)")
    console.log("  --connections <n>      Number of concurrent watch connections (default: 8)")
    console.log("  --api-timeout <ms>     Timeout for regular API calls (default: 5000)")
    console.log("  --verbose              Print detailed logs")
    process.exit(0)
  }

  return {
    baseUrl: getArg("--url") ?? "http://127.0.0.1:3000",
    connections: Number(getArg("--connections") ?? "8"),
    verbose: args.includes("--verbose"),
    apiTimeout: Number(getArg("--api-timeout") ?? "5000"),
  }
}

function log(verbose: boolean, msg: string) {
  if (!verbose) return
  console.log(`[watch-exhaustion:${new Date().toISOString()}] ${msg}`)
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs)
    promise
      .then((value) => {
        clearTimeout(timer)
        resolve(value)
      })
      .catch((error) => {
        clearTimeout(timer)
        reject(error)
      })
  })
}

function frontendWorkerSource(): string {
  return `
import { createORPCClient, createSafeClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/websocket";
import { apiContract } from "@vibecanvas/core-contract";

const mode = process.argv[1];
const baseUrl = process.argv[2];
const pathArg = process.argv[3] ?? "/tmp";
const watchId = process.argv[4] ?? crypto.randomUUID();

const websocket = new WebSocket(baseUrl.replace(/^http/, "ws") + "/api");
const client = createORPCClient(new RPCLink({ websocket }));
const safeClient = createSafeClient(client);

try {
  if (mode === "home") {
    const [err, result] = await safeClient.api.filesystem.home();
    if (err || !result || "type" in result) {
      console.error(err?.message ?? result?.message ?? "filesystem.home failed");
      process.exit(2);
    }
    console.log("ok");
    process.exit(0);
  }

  if (mode === "watch") {
    const abort = new AbortController();
    process.once("SIGTERM", () => abort.abort());
    process.once("SIGINT", () => abort.abort());

    const [err, iterator] = await safeClient.api.filesystem.watch(
      { path: pathArg, watchId },
      { signal: abort.signal },
    );

    if (err || !iterator) {
      console.error(err?.message ?? "filesystem.watch failed");
      process.exit(2);
    }

    console.log(${JSON.stringify(WATCH_READY_PREFIX)} + watchId);

    try {
      for await (const _event of iterator) {
        if (abort.signal.aborted) break;
      }
    } catch (error) {
      if (!abort.signal.aborted) {
        console.error(error instanceof Error ? error.message : String(error));
        process.exit(3);
      }
    }

    process.exit(0);
  }

  console.error("Unknown worker mode");
  process.exit(1);
} finally {
  try {
    websocket.close(1000, "done");
  } catch {}
}
`
}

function spawnFrontendWorker(args: string[]): Bun.Subprocess {
  return Bun.spawn({
    cmd: ["bun", "-e", frontendWorkerSource(), ...args],
    cwd: frontendDir,
    stdout: "pipe",
    stderr: "pipe",
    env: process.env,
  })
}

async function readProcessText(proc: Bun.Subprocess): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ])
  return { stdout, stderr, exitCode }
}

async function callFilesystemHome(baseUrl: string, timeoutMs: number): Promise<{ ok: boolean; durationMs: number; error?: string }> {
  const start = performance.now()
  const proc = spawnFrontendWorker(["home", baseUrl])

  try {
    const result = await withTimeout(readProcessText(proc), timeoutMs, "filesystem.home")
    const durationMs = performance.now() - start
    if (result.exitCode !== 0) {
      return { ok: false, durationMs, error: result.stderr.trim() || result.stdout.trim() || `worker exited ${result.exitCode}` }
    }
    return { ok: true, durationMs }
  } catch (error) {
    const durationMs = performance.now() - start
    proc.kill(9)
    return { ok: false, durationMs, error: error instanceof Error ? error.message : String(error) }
  }
}

function openWatchConnection(baseUrl: string, watchPath: string, verbose: boolean): TWatchConnection {
  const watchId = crypto.randomUUID()
  const proc = spawnFrontendWorker(["watch", baseUrl, watchPath, watchId])

  const connected = (async () => {
    await Bun.sleep(750)
    const exitCode = await Promise.race([proc.exited.then((code) => code), Bun.sleep(1).then(() => null)])
    if (typeof exitCode === "number") {
      const stderr = await new Response(proc.stderr).text()
      log(verbose, `Watch connection failed for ${watchId}: ${stderr.trim() || `worker exited ${exitCode}`}`)
      return false
    }

    log(verbose, `Watch connection established for ${watchPath} (${watchId})`)
    return true
  })()

  return {
    proc,
    connected,
    close: async () => {
      try {
        proc.kill()
      } catch {
        // ignore cleanup failures
      }
      const result = await Promise.race([proc.exited, Bun.sleep(1000).then(() => "timeout")])
      if (result === "timeout") {
        try {
          proc.kill(9)
          await proc.exited
        } catch {
          // ignore forced cleanup failures
        }
      }
    },
  }
}

async function testConnectionPoolExhaustion(args: TArgs): Promise<boolean> {
  console.log(`\n[TEST 1] Concurrent Watch Traffic`)
  console.log(`  Opening ${args.connections} concurrent watch connections...`)

  const watches: TWatchConnection[] = []

  try {
    for (let i = 0; i < args.connections; i += 1) {
      watches.push(openWatchConnection(args.baseUrl, "/tmp", args.verbose))
    }

    const connectedCount = (await Promise.all(watches.map((watch) => watch.connected))).filter(Boolean).length
    console.log(`  ${connectedCount}/${args.connections} watch connections established`)

    console.log(`  Making regular API call (filesystem.home) with ${args.apiTimeout}ms timeout...`)
    const result = await callFilesystemHome(args.baseUrl, args.apiTimeout)

    if (!result.ok) {
      console.log(`  FAIL: Regular API call failed: ${result.error} (${result.durationMs.toFixed(0)}ms)`)
      return false
    }

    console.log(`  PASS: Regular API call completed in ${result.durationMs.toFixed(0)}ms`)
    return true
  } finally {
    await Promise.all(watches.map((watch) => watch.close()))
  }
}

async function testAbortCleanup(args: TArgs): Promise<boolean> {
  console.log(`\n[TEST 2] Watch Connection Abort Cleanup`)

  const watch = openWatchConnection(args.baseUrl, "/tmp", args.verbose)
  const connected = await watch.connected

  if (!connected) {
    console.log("  SKIP: Could not establish watch connection")
    await watch.close()
    return true
  }

  console.log("  Watch connection established, aborting...")
  await watch.close()
  await Bun.sleep(500)

  const result = await callFilesystemHome(args.baseUrl, args.apiTimeout)
  if (!result.ok) {
    console.log(`  FAIL: Post-abort API call failed: ${result.error}`)
    return false
  }

  console.log(`  PASS: Post-abort API call completed in ${result.durationMs.toFixed(0)}ms`)
  return true
}

async function testRapidReconnect(args: TArgs): Promise<boolean> {
  console.log(`\n[TEST 3] Rapid Watch Reconnect`)
  const rapidCycles = 10

  for (let i = 0; i < rapidCycles; i += 1) {
    const watch = openWatchConnection(args.baseUrl, "/tmp", args.verbose)
    await Bun.sleep(50)
    await watch.close()
  }

  await Bun.sleep(1000)

  const result = await callFilesystemHome(args.baseUrl, args.apiTimeout)
  if (!result.ok) {
    console.log(`  FAIL: Post-rapid-reconnect API call failed: ${result.error}`)
    return false
  }

  console.log(`  PASS: After ${rapidCycles} rapid reconnects, API call completed in ${result.durationMs.toFixed(0)}ms`)
  return true
}

async function main() {
  const args = parseArgs()

  console.log("[filesystem-watch-exhaustion] Starting")
  console.log(`  baseUrl=${args.baseUrl}`)
  console.log(`  connections=${args.connections}`)
  console.log(`  apiTimeout=${args.apiTimeout}ms`)

  const health = await callFilesystemHome(args.baseUrl, args.apiTimeout)
  if (!health.ok) {
    console.error(`\nFATAL: Cannot reach server at ${args.baseUrl}`)
    console.error(`  Error: ${health.error}`)
    console.error("  Make sure the server is running: bun server:dev")
    process.exit(1)
  }
  console.log(`  Server healthy (${health.durationMs.toFixed(0)}ms)`)

  const results = [
    await testConnectionPoolExhaustion(args),
    await testAbortCleanup(args),
    await testRapidReconnect(args),
  ]

  const passed = results.filter(Boolean).length
  const total = results.length

  console.log(`\n[filesystem-watch-exhaustion] Results: ${passed}/${total} tests passed`)

  if (passed < total) {
    console.error("[filesystem-watch-exhaustion] FAIL")
    process.exit(1)
  }

  console.log("[filesystem-watch-exhaustion] PASS")
}

main().catch((err) => {
  console.error(`[filesystem-watch-exhaustion] FATAL: ${err instanceof Error ? err.message : String(err)}`)
  process.exit(1)
})
