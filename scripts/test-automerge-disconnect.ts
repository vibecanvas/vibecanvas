#!/usr/bin/env bun

import path from "path"

type TExpectMode = "stable" | "disconnect"
type TProbeMode = "automerge" | "raw"

type TArgs = {
  url: string
  durationMs: number
  clients: number
  expect: TExpectMode
  reconnectDelayMs: number
  mode: TProbeMode
  verbose: boolean
}

type TProbeStats = {
  clientId: string
  socketInstances: number
  opens: number
  closes: number
  closeCodes: number[]
  abnormalCloses: number
  errors: number
}

type TProbe = {
  stats: TProbeStats
  stop: () => void
}

const STATS_PREFIX = "__AUTOMERGE_PROBE_STATS__"

function parseArgs(): TArgs {
  const args = Bun.argv.slice(2)
  const getArg = (name: string): string | undefined => {
    const idx = args.indexOf(name)
    if (idx === -1) return undefined
    return args[idx + 1]
  }

  if (args.includes("--help") || args.includes("-h")) {
    console.log("Usage: bun run scripts/test-automerge-disconnect.ts [options]")
    console.log("")
    console.log("Options:")
    console.log("  --url <ws-url>         WebSocket URL (default: ws://127.0.0.1:3000/automerge)")
    console.log("  --duration <ms>        Probe window in ms (default: 22000)")
    console.log("  --clients <n>          Number of concurrent clients (default: 2)")
    console.log("  --expect <mode>        stable | disconnect (default: stable)")
    console.log("  --mode <kind>          automerge | raw (default: automerge)")
    console.log("  --reconnect-delay <ms> Reconnect delay after abnormal close (default: 5000)")
    console.log("  --verbose              Print per-event logs")
    process.exit(0)
  }

  const url = getArg("--url") ?? "ws://127.0.0.1:3000/automerge"
  const durationMs = Number(getArg("--duration") ?? "22000")
  const clients = Number(getArg("--clients") ?? "2")
  const expectRaw = getArg("--expect") ?? "stable"
  const modeRaw = getArg("--mode") ?? "automerge"
  const reconnectDelayMs = Number(getArg("--reconnect-delay") ?? "5000")
  const verbose = args.includes("--verbose")

  if (!Number.isFinite(durationMs) || durationMs < 1000) {
    throw new Error("--duration must be a number >= 1000")
  }
  if (!Number.isInteger(clients) || clients < 1) {
    throw new Error("--clients must be an integer >= 1")
  }
  if (!Number.isFinite(reconnectDelayMs) || reconnectDelayMs < 100) {
    throw new Error("--reconnect-delay must be a number >= 100")
  }
  if (expectRaw !== "stable" && expectRaw !== "disconnect") {
    throw new Error("--expect must be one of: stable, disconnect")
  }
  if (modeRaw !== "automerge" && modeRaw !== "raw") {
    throw new Error("--mode must be one of: automerge, raw")
  }

  return {
    url,
    durationMs,
    clients,
    expect: expectRaw,
    reconnectDelayMs,
    mode: modeRaw,
    verbose,
  }
}

function now(): string {
  return new Date().toISOString()
}

function log(verbose: boolean, message: string): void {
  if (!verbose) return
  console.log(`[automerge-disconnect-probe:${now()}] ${message}`)
}

function createRawProbe(url: string, index: number, reconnectDelayMs: number, verbose: boolean): TProbe {
  const clientId = `probe-raw-${index}-${Date.now()}`
  const stats: TProbeStats = {
    clientId,
    socketInstances: 0,
    opens: 0,
    closes: 0,
    closeCodes: [],
    abnormalCloses: 0,
    errors: 0,
  }

  let stopped = false
  let activeSocket: WebSocket | null = null
  let reconnectTimer: ReturnType<typeof setTimeout> | undefined

  const scheduleReconnect = () => {
    if (stopped) return
    clearTimeout(reconnectTimer)
    reconnectTimer = setTimeout(() => {
      if (stopped) return
      connect()
    }, reconnectDelayMs)
  }

  const connect = () => {
    stats.socketInstances += 1
    const socket = new WebSocket(url)
    activeSocket = socket

    socket.addEventListener("open", () => {
      stats.opens += 1
      log(verbose, `${clientId} socket open (instances=${stats.socketInstances})`)
    })

    socket.addEventListener("error", () => {
      stats.errors += 1
      log(verbose, `${clientId} socket error`)
    })

    socket.addEventListener("close", (event) => {
      stats.closes += 1
      stats.closeCodes.push(event.code)
      if (event.code !== 1000) stats.abnormalCloses += 1
      log(verbose, `${clientId} socket close code=${event.code} reason=${event.reason || "(none)"}`)
      if (!stopped && event.code !== 1000) scheduleReconnect()
    })
  }

  connect()

  return {
    stats,
    stop: () => {
      stopped = true
      clearTimeout(reconnectTimer)
      if (activeSocket && activeSocket.readyState === WebSocket.OPEN) {
        activeSocket.close(1000, "probe done")
      }
    },
  }
}

async function runRawMode(args: TArgs): Promise<TProbeStats[]> {
  const probes: TProbe[] = []
  try {
    for (let i = 0; i < args.clients; i += 1) {
      probes.push(createRawProbe(args.url, i + 1, args.reconnectDelayMs, args.verbose))
    }
    await Bun.sleep(args.durationMs)
  } finally {
    for (const probe of probes) probe.stop()
  }
  return probes.map((p) => p.stats)
}

async function runAutomergeMode(args: TArgs): Promise<TProbeStats[]> {
  const spaDir = path.join(process.cwd(), "apps", "spa")

  const workerSource = `
const patchKey = "__vibecanvas_negative_timeout_patch__";
if (!globalThis[patchKey]) {
  const nativeSetTimeout = globalThis.setTimeout.bind(globalThis);
  globalThis.setTimeout = ((handler, timeout, ...args) => {
    const delay = typeof timeout === "number" && timeout < 0 ? 0 : timeout;
    return nativeSetTimeout(handler, delay, ...args);
  });
  globalThis[patchKey] = true;
}

const { Repo } = await import("@automerge/automerge-repo");
const { BrowserWebSocketClientAdapter } = await import("@automerge/automerge-repo-network-websocket");

const STATS_PREFIX = ${JSON.stringify(STATS_PREFIX)};
const url = process.argv[1];
const durationMs = Number(process.argv[2]);
const clients = Number(process.argv[3]);
const verbose = process.argv[4] === "1";

function log(msg) {
  if (!verbose) return;
  console.log(msg);
}

const probes = [];

for (let i = 0; i < clients; i += 1) {
  const adapter = new BrowserWebSocketClientAdapter(url);
  const clientId = \`probe-am-\${i + 1}-\${Date.now()}\`;
  const stats = {
    clientId,
    socketInstances: 0,
    opens: 0,
    closes: 0,
    closeCodes: [],
    abnormalCloses: 0,
    errors: 0,
  };

  let currentSocket;
  const attach = () => {
    const socket = adapter.socket;
    if (!socket || socket === currentSocket) return;
    currentSocket = socket;
    stats.socketInstances += 1;

    socket.addEventListener("open", () => {
      stats.opens += 1;
      log(\`[worker] \${clientId} open\`);
    });

    socket.addEventListener("error", () => {
      stats.errors += 1;
      log(\`[worker] \${clientId} error\`);
    });

    socket.addEventListener("close", (event) => {
      stats.closes += 1;
      stats.closeCodes.push(event.code);
      if (event.code !== 1000) stats.abnormalCloses += 1;
      log(\`[worker] \${clientId} close code=\${event.code}\`);
    });
  };

  const pollId = setInterval(attach, 100);
  attach();

  const repo = new Repo({
    network: [adapter],
    peerId: clientId,
  });

  probes.push({ adapter, pollId, stats, repo });
}

await Bun.sleep(durationMs);

for (const probe of probes) {
  clearInterval(probe.pollId);
  try {
    if (probe.adapter.socket && probe.adapter.socket.readyState === WebSocket.OPEN) {
      probe.adapter.socket.close(1000, "probe done");
    }
  } catch {}
}

await Bun.sleep(200);
console.log(STATS_PREFIX + JSON.stringify(probes.map((p) => p.stats)));
process.exit(0);
`

  const proc = Bun.spawn({
    cmd: [
      "bun",
      "-e",
      workerSource,
      args.url,
      String(args.durationMs),
      String(args.clients),
      args.verbose ? "1" : "0",
    ],
    cwd: spaDir,
    stdout: "pipe",
    stderr: "pipe",
    env: process.env,
  })

  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ])

  if (args.verbose && stdout.trim()) {
    console.log(stdout.trim())
  }
  if (stderr.trim()) {
    console.error(stderr.trim())
  }

  const line = stdout
    .split("\n")
    .map((s) => s.trim())
    .find((s) => s.startsWith(STATS_PREFIX))

  if (!line) {
    throw new Error("Automerge worker did not return stats")
  }

  const json = line.slice(STATS_PREFIX.length)
  return JSON.parse(json) as TProbeStats[]
}

function printSummary(all: TProbeStats[]): void {
  console.log("[automerge-disconnect-probe] Summary")
  for (const stats of all) {
    const codes = stats.closeCodes.length > 0 ? stats.closeCodes.join(",") : "none"
    console.log(
      `  - ${stats.clientId} opens=${stats.opens} closes=${stats.closes} abnormal=${stats.abnormalCloses} sockets=${stats.socketInstances} errors=${stats.errors} closeCodes=[${codes}]`,
    )
  }
}

function assertExpectation(allStats: TProbeStats[], expect: TExpectMode): void {
  const totalAbnormal = allStats.reduce((sum, s) => sum + s.abnormalCloses, 0)
  const totalOpens = allStats.reduce((sum, s) => sum + s.opens, 0)
  const totalCloses = allStats.reduce((sum, s) => sum + s.closes, 0)

  if (totalOpens === 0 && totalCloses === 0) {
    throw new Error("No socket activity observed. Is the server running and URL correct?")
  }

  if (expect === "stable") {
    if (totalAbnormal > 0) {
      throw new Error(`Expected stable connection, but observed ${totalAbnormal} abnormal close event(s)`)
    }
    console.log("[automerge-disconnect-probe] PASS stable: no abnormal closes observed")
    return
  }

  if (totalAbnormal === 0) {
    throw new Error("Expected reconnect/disconnect behavior, but observed zero abnormal closes")
  }
  console.log(`[automerge-disconnect-probe] PASS disconnect: observed ${totalAbnormal} abnormal close event(s)`)
}

async function main(): Promise<void> {
  const args = parseArgs()
  console.log("[automerge-disconnect-probe] Starting")
  console.log(`[automerge-disconnect-probe] url=${args.url}`)
  console.log(
    `[automerge-disconnect-probe] mode=${args.mode} clients=${args.clients} durationMs=${args.durationMs} reconnectDelayMs=${args.reconnectDelayMs} expect=${args.expect}`,
  )

  const stats = args.mode === "raw" ? await runRawMode(args) : await runAutomergeMode(args)
  printSummary(stats)
  assertExpectation(stats, args.expect)
}

main().catch((error) => {
  console.error(`[automerge-disconnect-probe] FAIL ${error instanceof Error ? error.message : String(error)}`)
  process.exit(1)
})
