#!/usr/bin/env bun

/**
 * Publish all built dist packages to npm using Bun CLI.
 *
 * Behavior:
 * - Requires `NPM_TOKEN` to be set in env.
 * - Uses `bun pm view <name>@<version>` to detect already-published versions.
 * - For each package, always runs `bun publish --dry-run` before real publish.
 * - Publishes in parallel (configurable with --concurrency).
 * - Safe to retry: already-published versions are skipped.
 *
 * Tag notes:
 * - --tag latest  -> default stable channel used by `npm i vibecanvas`
 * - --tag beta    -> opt-in channel used by `npm i vibecanvas@beta`
 * - --tag nightly -> opt-in channel used by `npm i vibecanvas@nightly`
 *
 * Usage examples:
 * - NPM_TOKEN=xxxx bun run scripts/publish-npm.ts
 * - NPM_TOKEN=xxxx bun run scripts/publish-npm.ts --tag beta --concurrency 6
 * - NPM_TOKEN=xxxx bun run scripts/publish-npm.ts --no-wrapper
 */

import path from "path"

type TReleaseManifest = {
  targets: Record<string, { packageName: string }>
}

type TPackageTask = {
  dir: string
  name: string
  version: string
}

type TPackageResult = {
  task: TPackageTask
  status: "published" | "skipped" | "failed"
  message: string
}

type TArgs = {
  tag: string
  concurrency: number
  includeWrapper: boolean
  networkConcurrency?: number
}

type TCmdResult = {
  exitCode: number
  stdout: string
  stderr: string
}

function parseArgs(argv: string[]): TArgs {
  const get = (flag: string): string | undefined => {
    const index = argv.indexOf(flag)
    if (index < 0) return undefined
    return argv[index + 1]
  }

  const inlineTag = argv.find((arg) => arg.startsWith("--tag="))?.slice("--tag=".length)
  const tag = inlineTag ?? get("--tag") ?? "latest"

  const inlineConcurrency = argv.find((arg) => arg.startsWith("--concurrency="))?.slice("--concurrency=".length)
  const concurrencyRaw = inlineConcurrency ?? get("--concurrency") ?? "10"
  const concurrencyNum = Number(concurrencyRaw)

  if (!Number.isInteger(concurrencyNum) || concurrencyNum < 1) {
    throw new Error(`Invalid --concurrency value: ${concurrencyRaw}`)
  }

  const inlineNetworkConcurrency = argv
    .find((arg) => arg.startsWith("--network-concurrency="))
    ?.slice("--network-concurrency=".length)
  const networkConcurrencyRaw = inlineNetworkConcurrency ?? get("--network-concurrency")

  if (networkConcurrencyRaw !== undefined) {
    const value = Number(networkConcurrencyRaw)
    if (!Number.isInteger(value) || value < 1) {
      throw new Error(`Invalid --network-concurrency value: ${networkConcurrencyRaw}`)
    }
  }

  return {
    tag,
    concurrency: concurrencyNum,
    includeWrapper: !argv.includes("--no-wrapper"),
    networkConcurrency: networkConcurrencyRaw ? Number(networkConcurrencyRaw) : undefined,
  }
}

async function runCommand(command: string[], cwd: string): Promise<TCmdResult> {
  const proc = Bun.spawn({
    cmd: command,
    cwd,
    stdout: "pipe",
    stderr: "pipe",
    env: process.env,
  })

  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ])

  return { exitCode, stdout, stderr }
}

function progressBar(done: number, total: number, width = 28): string {
  if (total <= 0) return "[----------------------------]"
  const ratio = Math.max(0, Math.min(1, done / total))
  const filled = Math.round(ratio * width)
  return `[${"#".repeat(filled)}${"-".repeat(width - filled)}]`
}

function shortMessage(result: TPackageResult): string {
  const first = result.message.split("\n")[0]
  return first.length > 120 ? `${first.slice(0, 117)}...` : first
}

function assertNpmToken(): void {
  const token = process.env.NPM_TOKEN?.trim()
  if (!token) {
    throw new Error("Missing required NPM_TOKEN environment variable. Set NPM_TOKEN before running publish.")
  }
}

async function isPublished(task: TPackageTask, rootDir: string): Promise<boolean> {
  const result = await runCommand(["bun", "pm", "view", `${task.name}@${task.version}`, "version"], rootDir)
  return result.exitCode === 0
}

function bunPublishArgs(publishArgs: TArgs, dryRun: boolean): string[] {
  const command = ["bun", "publish", "--access", "public", "--tag", publishArgs.tag]
  if (dryRun) command.push("--dry-run")
  if (publishArgs.networkConcurrency !== undefined) {
    command.push("--network-concurrency", String(publishArgs.networkConcurrency))
  }
  return command
}

async function publishOne(task: TPackageTask, args: TArgs, rootDir: string): Promise<TPackageResult> {
  const alreadyPublished = await isPublished(task, rootDir)
  if (alreadyPublished) {
    return {
      task,
      status: "skipped",
      message: "already published",
    }
  }

  const dryRun = await runCommand(bunPublishArgs(args, true), task.dir)
  if (dryRun.exitCode !== 0) {
    return {
      task,
      status: "failed",
      message: `dry-run failed\n${dryRun.stderr || dryRun.stdout}`,
    }
  }

  const publish = await runCommand(bunPublishArgs(args, false), task.dir)
  if (publish.exitCode !== 0) {
    return {
      task,
      status: "failed",
      message: `publish failed\n${publish.stderr || publish.stdout}`,
    }
  }

  return {
    task,
    status: "published",
    message: "published successfully",
  }
}

async function mapWithConcurrency<TItem, TResult>(
  items: TItem[],
  limit: number,
  worker: (item: TItem) => Promise<TResult>,
): Promise<TResult[]> {
  const results: TResult[] = new Array(items.length)
  let nextIndex = 0

  async function runWorker(): Promise<void> {
    while (true) {
      const currentIndex = nextIndex
      nextIndex += 1

      if (currentIndex >= items.length) return
      results[currentIndex] = await worker(items[currentIndex])
    }
  }

  const workers = Array.from({ length: Math.min(limit, items.length) }, () => runWorker())
  await Promise.all(workers)
  return results
}

async function loadTasks(rootDir: string, includeWrapper: boolean): Promise<TPackageTask[]> {
  const distDir = path.join(rootDir, "dist")
  const manifestPath = path.join(distDir, "release-manifest.json")
  const manifestFile = Bun.file(manifestPath)

  if (!(await manifestFile.exists())) {
    throw new Error(`Missing release manifest: ${manifestPath}`)
  }

  const manifest = await manifestFile.json() as TReleaseManifest
  const tasks: TPackageTask[] = []

  for (const target of Object.values(manifest.targets)) {
    const dir = path.join(distDir, target.packageName)
    const pkgPath = path.join(dir, "package.json")
    const pkg = await Bun.file(pkgPath).json() as { name: string; version: string }
    tasks.push({ dir, name: pkg.name, version: pkg.version })
  }

  tasks.sort((a, b) => a.name.localeCompare(b.name))

  if (includeWrapper) {
    const wrapperDir = path.join(distDir, "vibecanvas")
    const wrapperPkgPath = path.join(wrapperDir, "package.json")
    const wrapperPkgFile = Bun.file(wrapperPkgPath)

    if (await wrapperPkgFile.exists()) {
      const pkg = await wrapperPkgFile.json() as { name: string; version: string }
      tasks.push({ dir: wrapperDir, name: pkg.name, version: pkg.version })
    }
  }

  return tasks
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const rootDir = path.join(path.dirname(new URL(import.meta.url).pathname), "..")

  console.log("[publish] Checking NPM_TOKEN...")
  assertNpmToken()
  console.log("[publish] NPM_TOKEN is set")

  const tasks = await loadTasks(rootDir, args.includeWrapper)
  if (tasks.length === 0) {
    console.log("[publish] No packages found in dist/")
    return
  }

  console.log(`[publish] Found ${tasks.length} package(s)`)
  console.log(`[publish] tag=${args.tag} concurrency=${args.concurrency}${args.networkConcurrency ? ` networkConcurrency=${args.networkConcurrency}` : ""}`)
  for (const task of tasks) {
    console.log(`  - ${task.name}@${task.version}`)
  }

  let finished = 0
  const total = tasks.length

  const results = await mapWithConcurrency(tasks, args.concurrency, async (task) => {
    console.log(`\n[publish:start] ${task.name}@${task.version}`)
    const result = await publishOne(task, args, rootDir)
    finished += 1
    console.log(`[publish:done]  ${task.name}@${task.version} -> ${result.status} (${shortMessage(result)})`)
    console.log(`[progress] ${progressBar(finished, total)} ${finished}/${total}`)
    return result
  })

  const published = results.filter((r) => r.status === "published")
  const skipped = results.filter((r) => r.status === "skipped")
  const failed = results.filter((r) => r.status === "failed")

  console.log("\n[publish] Summary")
  console.log(`- published: ${published.length}`)
  console.log(`- skipped: ${skipped.length}`)
  console.log(`- failed: ${failed.length}`)

  if (failed.length > 0) {
    for (const result of failed) {
      console.error(`\n[failed] ${result.task.name}@${result.task.version}`)
      console.error(result.message)
    }
    process.exit(1)
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
