#!/usr/bin/env bun

import path from "path"
import { Glob } from "bun"

type TArgs = {
  binaryPath?: string
  port: number
  startupTimeoutMs: number
  requestTimeoutMs: number
}

function parseArgs(): TArgs {
  const args = Bun.argv.slice(2)
  const getArg = (name: string): string | undefined => {
    const idx = args.indexOf(name)
    if (idx === -1) return undefined
    return args[idx + 1]
  }

  const binaryPath = getArg("--binary")
  const port = Number(getArg("--port") ?? "3339")
  const startupTimeoutMs = Number(getArg("--startup-timeout") ?? "15000")
  const requestTimeoutMs = Number(getArg("--request-timeout") ?? "8000")

  return { binaryPath, port, startupTimeoutMs, requestTimeoutMs }
}

async function resolveBinaryPath(inputPath?: string): Promise<string> {
  if (inputPath) return inputPath

  const rootDir = path.join(path.dirname(new URL(import.meta.url).pathname), "..")
  const osMap: Record<string, string> = {
    darwin: "darwin",
    linux: "linux",
    win32: "windows",
  }
  const archMap: Record<string, string> = {
    arm64: "arm64",
    x64: "x64",
  }
  const os = osMap[process.platform]
  const arch = archMap[process.arch]
  if (!os || !arch) {
    throw new Error(`Unsupported platform for auto-detect: ${process.platform}-${process.arch}`)
  }

  const pattern = `dist/vibecanvas-${os}-${arch}/bin/vibecanvas${process.platform === "win32" ? ".exe" : ""}`
  const fullPath = path.join(rootDir, pattern)
  if (await Bun.file(fullPath).exists()) {
    return fullPath
  }

  const fallbackGlob = new Glob(`dist/vibecanvas-${os}-${arch}*/bin/vibecanvas${process.platform === "win32" ? ".exe" : ""}`)
  for await (const match of fallbackGlob.scan(rootDir)) {
    return path.join(rootDir, match)
  }

  throw new Error("Could not auto-detect built binary. Pass --binary <path>.")
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

async function waitForHttpReady(baseUrl: string, timeoutMs: number): Promise<void> {
  const startedAt = Date.now()
  let lastError: unknown = null

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(`${baseUrl}/`, { method: "GET" })
      if (response.ok) return
      lastError = new Error(`Unexpected status: ${response.status}`)
    } catch (error) {
      lastError = error
    }

    await Bun.sleep(250)
  }

  throw new Error(`Server did not become ready in ${timeoutMs}ms. Last error: ${String(lastError)}`)
}

function extractAssetUrls(html: string): string[] {
  const urls = new Set<string>()
  const regex = /(?:src|href)="([^"]+)"/g
  let match: RegExpExecArray | null

  while ((match = regex.exec(html)) !== null) {
    const candidate = match[1]
    if (!candidate.startsWith("/")) continue
    if (candidate.startsWith("//")) continue
    if (candidate.startsWith("/api") || candidate.startsWith("/automerge")) continue
    urls.add(candidate)
  }

  return [...urls]
}

async function assertHttpAsset(baseUrl: string, assetPath: string, timeoutMs: number): Promise<void> {
  const response = await withTimeout(fetch(`${baseUrl}${assetPath}`), timeoutMs, `fetch ${assetPath}`)
  if (!response.ok) {
    throw new Error(`Asset ${assetPath} failed with status ${response.status}`)
  }

  const bytes = await response.arrayBuffer()
  if (bytes.byteLength === 0) {
    throw new Error(`Asset ${assetPath} returned empty body`)
  }
}

async function assertWsOpen(url: string, timeoutMs: number): Promise<WebSocket> {
  return withTimeout(
    new Promise<WebSocket>((resolve, reject) => {
      const ws = new WebSocket(url)

      ws.addEventListener("open", () => resolve(ws), { once: true })
      ws.addEventListener(
        "error",
        () => {
          reject(new Error(`WebSocket error at ${url}`))
        },
        { once: true },
      )
      ws.addEventListener(
        "close",
        (event) => {
          reject(new Error(`WebSocket closed before ready at ${url} (${event.code})`))
        },
        { once: true },
      )
    }),
    timeoutMs,
    `ws connect ${url}`,
  )
}

async function assertHttpApi(baseUrl: string, timeoutMs: number): Promise<void> {
  const response = await withTimeout(
    fetch(`${baseUrl}/api/canvas/list`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: "{}",
    }),
    timeoutMs,
    "fetch /api/canvas/list",
  )

  if (response.status === 404) {
    throw new Error("HTTP /api route was not matched (404)")
  }
}

async function main() {
  const args = parseArgs()
  const binaryPath = await resolveBinaryPath(args.binaryPath)
  const baseUrl = `http://127.0.0.1:${args.port}`
  const tempConfigDir = path.join(process.cwd(), `.tmp-binary-test-${Date.now()}`)

  console.log(`[test-binary] Using binary: ${binaryPath}`)
  console.log(`[test-binary] Base URL: ${baseUrl}`)

  const proc = Bun.spawn({
    cmd: [binaryPath, "serve", "--port", String(args.port)],
    stdout: "pipe",
    stderr: "pipe",
    env: {
      ...process.env,
      VIBECANVAS_HOME: tempConfigDir,
      VIBECANVAS_CONFIG_DIR: tempConfigDir,
    },
  })

  const stdoutPromise = new Response(proc.stdout).text()
  const stderrPromise = new Response(proc.stderr).text()

  try {
    await waitForHttpReady(baseUrl, args.startupTimeoutMs)
    console.log("[test-binary] PASS server startup")

    const rootResponse = await withTimeout(fetch(`${baseUrl}/`), args.requestTimeoutMs, "fetch /")
    if (!rootResponse.ok) {
      throw new Error(`GET / failed with ${rootResponse.status}`)
    }

    const rootHtml = await rootResponse.text()
    const contentType = rootResponse.headers.get("content-type") ?? ""
    if (!contentType.includes("text/html")) {
      throw new Error(`GET / has invalid content-type: ${contentType}`)
    }
    if (!rootHtml.includes("<div id=\"root\">")) {
      throw new Error("GET / html does not include root mount node")
    }
    console.log("[test-binary] PASS GET /")

    const assetUrls = extractAssetUrls(rootHtml)
    if (assetUrls.length === 0) {
      throw new Error("No static assets found in index.html")
    }

    for (const assetUrl of assetUrls) {
      await assertHttpAsset(baseUrl, assetUrl, args.requestTimeoutMs)
      console.log(`[test-binary] PASS asset ${assetUrl}`)
    }

    await assertHttpApi(baseUrl, args.requestTimeoutMs)
    console.log("[test-binary] PASS http /api")

    const automergeWs = await assertWsOpen(`ws://127.0.0.1:${args.port}/automerge`, args.requestTimeoutMs)
    await Bun.sleep(250)
    automergeWs.close(1000, "test done")
    console.log("[test-binary] PASS ws /automerge")

    console.log("[test-binary] All checks passed")
  } finally {
    proc.kill()

    const exitOrTimeout = Promise.race([
      proc.exited,
      Bun.sleep(5000).then(() => "timeout"),
    ])
    const result = await exitOrTimeout
    if (result === "timeout") {
      proc.kill(9)
      await proc.exited
    }

    await Bun.$`rm -rf ${tempConfigDir}`.quiet()

    const [stdout, stderr] = await Promise.allSettled([stdoutPromise, stderrPromise])
    const stdoutText = stdout.status === "fulfilled" ? stdout.value : ""
    const stderrText = stderr.status === "fulfilled" ? stderr.value : ""
    if (stdoutText.trim()) {
      console.log("[test-binary] server stdout:")
      console.log(stdoutText)
    }
    if (stderrText.trim()) {
      console.log("[test-binary] server stderr:")
      console.log(stderrText)
    }
  }
}

main().catch((error) => {
  console.error(`[test-binary] FAIL ${error instanceof Error ? error.message : String(error)}`)
  process.exit(1)
})
