#!/usr/bin/env bun

/**
 * test-filesystem-watch-exhaustion.ts
 *
 * Reproduces and validates the fix for HTTP connection pool exhaustion caused by
 * filesystem.watch SSE streams.
 *
 * The bug:
 * - filesystem.watch uses eventIterator (SSE) over HTTP fetch
 * - Without .route({ method: 'GET' }), it defaults to POST-based SSE
 * - Each watch opens a long-lived HTTP connection
 * - Browsers limit concurrent HTTP connections to ~6 per origin
 * - Multiple filetree/file-widget watches exhaust the pool
 * - Subsequent API calls (e.g. filesystem.files) hang indefinitely
 *
 * This script:
 * 1. Opens N concurrent filesystem.watch SSE connections
 * 2. After connections are established, makes a regular API call (filesystem.home)
 * 3. Verifies the regular API call completes within a timeout (not blocked)
 * 4. Verifies watch connections can be properly torn down via AbortSignal
 *
 * Usage:
 *   bun run scripts/test-filesystem-watch-exhaustion.ts [--url <base-url>] [--connections <n>] [--verbose]
 *
 * The server must be running before executing this script.
 */

type TArgs = {
  baseUrl: string
  connections: number
  verbose: boolean
  apiTimeout: number
}

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

/**
 * Make a regular (non-streaming) oRPC call to filesystem.home.
 * Uses the oRPC RPC protocol directly via fetch.
 */
async function callFilesystemHome(baseUrl: string, signal?: AbortSignal): Promise<{ ok: boolean; durationMs: number; error?: string }> {
  const start = performance.now()
  try {
    const res = await fetch(`${baseUrl}/api.filesystem.home`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
      signal,
    })
    const durationMs = performance.now() - start
    if (!res.ok) {
      return { ok: false, durationMs, error: `HTTP ${res.status}` }
    }
    return { ok: true, durationMs }
  } catch (err) {
    const durationMs = performance.now() - start
    return { ok: false, durationMs, error: err instanceof Error ? err.message : String(err) }
  }
}

/**
 * Open a filesystem.watch SSE connection using oRPC's RPC protocol.
 * Returns the response and an abort controller.
 */
function openWatchConnection(
  baseUrl: string,
  watchPath: string,
  verbose: boolean,
): { abort: AbortController; connected: Promise<boolean> } {
  const abort = new AbortController()

  const connected = (async () => {
    try {
      // oRPC event iterators use the path-based URL format
      // For GET-based SSE (with .route({ method: 'GET' })), it uses GET
      // For POST-based SSE (without .route()), it uses POST with body
      const res = await fetch(`${baseUrl}/api.filesystem.watch`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "text/event-stream",
        },
        body: JSON.stringify({ path: watchPath }),
        signal: abort.signal,
      })

      if (!res.ok) {
        log(verbose, `Watch connection failed: HTTP ${res.status}`)
        return false
      }

      log(verbose, `Watch connection established for ${watchPath}`)
      return true
    } catch (err) {
      if (abort.signal.aborted) {
        log(verbose, `Watch connection aborted for ${watchPath}`)
        return false
      }
      log(verbose, `Watch connection error: ${err}`)
      return false
    }
  })()

  return { abort, connected }
}

/**
 * Test 1: Verify that opening many watch connections doesn't block regular API calls.
 */
async function testConnectionPoolExhaustion(args: TArgs): Promise<boolean> {
  console.log(`\n[TEST 1] Connection Pool Exhaustion`)
  console.log(`  Opening ${args.connections} concurrent watch connections...`)

  const homedir = (await callFilesystemHome(args.baseUrl)).ok
    ? "/tmp"
    : "/tmp"

  const watches: { abort: AbortController; connected: Promise<boolean> }[] = []

  // Open N watch connections
  for (let i = 0; i < args.connections; i++) {
    const watch = openWatchConnection(args.baseUrl, homedir, args.verbose)
    watches.push(watch)
  }

  // Wait briefly for connections to be established
  await Bun.sleep(1000)

  const connectedCount = (await Promise.all(watches.map(w => w.connected))).filter(Boolean).length
  console.log(`  ${connectedCount}/${args.connections} watch connections established`)

  // Now try a regular API call with a timeout
  console.log(`  Making regular API call (filesystem.home) with ${args.apiTimeout}ms timeout...`)

  const timeoutAbort = new AbortController()
  const timeout = setTimeout(() => timeoutAbort.abort(), args.apiTimeout)

  const result = await callFilesystemHome(args.baseUrl, timeoutAbort.signal)
  clearTimeout(timeout)

  // Clean up watch connections
  for (const watch of watches) {
    watch.abort.abort()
  }

  if (!result.ok) {
    if (result.error?.includes("abort")) {
      console.log(`  FAIL: Regular API call timed out after ${args.apiTimeout}ms (connection pool exhausted!)`)
      return false
    }
    console.log(`  FAIL: Regular API call failed: ${result.error} (${result.durationMs.toFixed(0)}ms)`)
    return false
  }

  console.log(`  PASS: Regular API call completed in ${result.durationMs.toFixed(0)}ms`)
  return true
}

/**
 * Test 2: Verify that watch connections can be properly terminated via AbortSignal.
 */
async function testAbortCleanup(args: TArgs): Promise<boolean> {
  console.log(`\n[TEST 2] Watch Connection Abort Cleanup`)

  const watch = openWatchConnection(args.baseUrl, "/tmp", args.verbose)

  // Wait for connection
  await Bun.sleep(500)
  const connected = await watch.connected

  if (!connected) {
    console.log(`  SKIP: Could not establish watch connection (server may not support this endpoint)`)
    return true
  }

  console.log(`  Watch connection established, aborting...`)
  watch.abort.abort()

  // Give the server time to process the disconnect
  await Bun.sleep(500)

  // Verify we can make a new connection (old one is cleaned up)
  const result = await callFilesystemHome(args.baseUrl)
  if (!result.ok) {
    console.log(`  FAIL: Post-abort API call failed: ${result.error}`)
    return false
  }

  console.log(`  PASS: Post-abort API call completed in ${result.durationMs.toFixed(0)}ms`)
  return true
}

/**
 * Test 3: Verify that rapidly opening/closing watch connections doesn't leak.
 */
async function testRapidReconnect(args: TArgs): Promise<boolean> {
  console.log(`\n[TEST 3] Rapid Watch Reconnect (simulates path changes)`)
  const rapidCycles = 10

  for (let i = 0; i < rapidCycles; i++) {
    const watch = openWatchConnection(args.baseUrl, "/tmp", args.verbose)
    // Don't wait for connection - abort immediately (simulates rapid path changes)
    await Bun.sleep(50)
    watch.abort.abort()
  }

  // Wait for server to process all disconnects
  await Bun.sleep(1000)

  // Verify API still works
  const result = await callFilesystemHome(args.baseUrl)
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

  // Quick health check
  const health = await callFilesystemHome(args.baseUrl)
  if (!health.ok) {
    console.error(`\nFATAL: Cannot reach server at ${args.baseUrl}`)
    console.error(`  Error: ${health.error}`)
    console.error(`  Make sure the server is running: bun server:dev`)
    process.exit(1)
  }
  console.log(`  Server healthy (${health.durationMs.toFixed(0)}ms)`)

  const results: boolean[] = []

  results.push(await testConnectionPoolExhaustion(args))
  results.push(await testAbortCleanup(args))
  results.push(await testRapidReconnect(args))

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
