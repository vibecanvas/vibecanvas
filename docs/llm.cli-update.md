# CLI auto-update investigation (CLI only)

This document covers only the CLI update mechanism in `packages/opencode`.
It does not cover the desktop/Tauri updater.

## Progress

- [x] Baseline investigation captured (current behavior, gates, method detection, failure model).
- [x] Step 1 - Build pipeline metadata in `scripts/build.ts` (checksums, release manifest, `--channel`).
- [x] Step 2 - Installer hardening in `scripts/install.sh` (channel option + checksum verification).
- [x] Step 3 - Runtime updater module in `apps/server/src/update/*`.
- [x] Step 4 - Startup auto-check hook in `apps/server/src/server.ts` (delayed, non-blocking, 24h cadence).
- [x] Step 5 - Manual command surface in `apps/server/src/server.ts` (`--version`, `upgrade`).
- [x] Step 6 - Tests and docs updates.

Current step: Completed.

Step 3 notes:
- Added update runtime module files under `apps/server/src/update/*`.
- Moved pure policy/version decision logic into `packages/functional-core/src/cli-update/*` and consumed it from server updater.

Step 5 notes:
- Added `vibecanvas --version`.
- Added `vibecanvas upgrade --check --method <curl|npm|unknown> --target-version <version>`.
- Manual output now reports current version, latest version, method, and action taken.

Step 6 notes:
- Added updater tests:
  - `apps/server/src/update/method.test.ts`
  - `apps/server/src/update/policy.test.ts`
  - `apps/server/src/update/latest.test.ts`
  - `apps/server/src/update/index.test.ts`
- Ran `bun test apps/server/src/update` and all tests passed.

## What actually triggers auto-update

Auto-update is only triggered from the TUI startup path:

- `packages/opencode/src/cli/cmd/tui/thread.ts:159` schedules `checkUpgrade` with `setTimeout(..., 1000)`.
- `packages/opencode/src/cli/cmd/tui/thread.ts:160` fire-and-forgets the RPC call (`.catch(() => {})`).
- `packages/opencode/src/cli/cmd/tui/worker.ts:124` handles the RPC method.
- `packages/opencode/src/cli/cmd/tui/worker.ts:125` wraps execution in `Instance.provide(...)` + `InstanceBootstrap`.
- `packages/opencode/src/cli/cmd/tui/worker.ts:129` calls `upgrade()` and also swallows errors.

So the check is:

- startup-only (once per TUI launch),
- delayed by ~1 second,
- best-effort/non-blocking,
- silent on failure by design.

```text
TUI thread starts
   |
   | (after 1s)
   v
client.call("checkUpgrade", { directory })
   |
   v
worker.rpc.checkUpgrade()
   |
   v
Instance.provide(..., init=InstanceBootstrap)
   |
   v
cli/upgrade.upgrade()
   |
   +--> Installation.method()
   +--> Installation.latest(method)
   +--> policy gates
   +--> Installation.upgrade(method, latest) [maybe]
   +--> Bus publish [maybe]
```

## Control gates and precedence

Main flow is in `packages/opencode/src/cli/upgrade.ts:6`:

1. Read global config (`Config.global()`) - `packages/opencode/src/cli/upgrade.ts:7`
2. Detect install method - `packages/opencode/src/cli/upgrade.ts:8`
3. Resolve latest version for that method - `packages/opencode/src/cli/upgrade.ts:9`
4. Exit if no latest or already current - `packages/opencode/src/cli/upgrade.ts:10-11`
5. Apply policy gates - `packages/opencode/src/cli/upgrade.ts:13-21`
6. Attempt upgrade and emit success event - `packages/opencode/src/cli/upgrade.ts:22-23`

Policy behavior:

- `autoupdate` schema is tri-state optional: `boolean | "notify"` in `packages/opencode/src/config/config.ts:987-992`.
- Hard disable: `config.autoupdate === false` OR `OPENCODE_DISABLE_AUTOUPDATE` (`packages/opencode/src/cli/upgrade.ts:13`, `packages/opencode/src/flag/flag.ts:12`).
- Notify-only: publish `installation.update-available`, do not install (`packages/opencode/src/cli/upgrade.ts:16-18`).
- Install path: only if not disabled, not notify, and `method !== "unknown"` (`packages/opencode/src/cli/upgrade.ts:21`).

Important non-obvious detail:

- Auto-update reads `Config.global()` (`packages/opencode/src/cli/upgrade.ts:7`), not merged project config (`Config.get()`).
- `Config.global` is loaded from global files under `Global.Path.config` (`packages/opencode/src/config/config.ts:1149-1155`).

## Method detection internals

Method detection is in `packages/opencode/src/installation/index.ts:60-114`.

Detection order/logic:

- Fast path: if `process.execPath` includes `.opencode/bin` or `.local/bin`, method is `"curl"` (`:61-62`).
- Otherwise run manager list commands (`npm/yarn/pnpm/bun/brew/scoop/choco`) and match installed package names (`:65-93`, `:104-110`).
- Checks are sorted to prefer manager name found in `process.execPath` (`:96-102`).
- Name matching differs:
  - brew/choco/scoop expect `opencode` (`:107`),
  - npm/yarn/pnpm/bun expect `opencode-ai` (`:107`).
- If nothing matches, return `"unknown"` (`:113`).

## Brew path

### Latest version lookup

`Installation.latest("brew")` has special behavior in `packages/opencode/src/installation/index.ts:189-199`:

- It first resolves which formula is installed via `getBrewFormula()` (`:123-129`).
- If formula is core `opencode`, it uses Homebrew API stable version (`https://formulae.brew.sh/api/formula/opencode.json`) (`:191-197`).
- If formula is tap `anomalyco/tap/opencode`, it does not use Homebrew API branch and later falls through to GitHub releases fallback (`:239-245`).

### Upgrade execution

Upgrade command for brew is in `packages/opencode/src/installation/index.ts:149-155`:

- `brew upgrade <formula>`
- with `HOMEBREW_NO_AUTO_UPDATE=1`

Non-obvious implications:

- `target` is computed and compared before install, but brew install command itself does not pin a specific version.
- Effective installed version is whatever brew currently serves for that formula.

## NPM path

### Latest version lookup

For `npm`, `pnpm`, `bun` methods (`packages/opencode/src/installation/index.ts:201-214`):

- Registry is read via `npm config get registry` and normalized (`:202-206`).
- Lookup URL is `${registry}/opencode-ai/${channel}` (`:208`), where `channel = Installation.CHANNEL` (`:207`).

`Installation.CHANNEL` is compile-time injected:

- define in build: `OPENCODE_CHANNEL` from `Script.channel` (`packages/opencode/script/build.ts:161`).
- channel derivation in script package (`packages/script/src/index.ts:25-31`, `:64-66`).

This means npm "latest" for auto-update is actually dist-tag based on compiled channel (for example `latest`, `dev`, etc.), not always npm `latest`.

### Upgrade execution

Upgrade command is version-pinned:

- npm: `npm install -g opencode-ai@${target}` (`packages/opencode/src/installation/index.ts:140-142`)
- pnpm: `pnpm install -g opencode-ai@${target}` (`:143-145`)
- bun: `bun install -g opencode-ai@${target}` (`:146-148`)

## Binary (curl-installed) path

In current code, "binary" auto-update maps to method `"curl"`.

### Detection

- If executable path indicates user-local install (`.opencode/bin` or `.local/bin`), method is `"curl"` (`packages/opencode/src/installation/index.ts:61-62`).

### Latest version lookup

- There is no method-specific `curl` branch in `latest()`.
- It therefore uses final fallback: GitHub releases latest API (`packages/opencode/src/installation/index.ts:239-245`).

### Upgrade execution

- Executes install script with version env:
  - `curl -fsSL https://opencode.ai/install | bash`
  - `VERSION=${target}` in environment
  - (`packages/opencode/src/installation/index.ts:34-39`)

## Manual `opencode upgrade` vs auto-update

Manual command path lives in `packages/opencode/src/cli/cmd/upgrade.ts`.

Shared behavior:

- Uses same `Installation.method()`, `Installation.latest()`, and `Installation.upgrade()` primitives.

Differences:

- Manual path is explicit/interactive; auto path is silent/background.
- Manual path allows `--method` override (`packages/opencode/src/cli/cmd/upgrade.ts:15-20`).
- Manual path supports explicit target argument (`:11-14`, `:45`).
- If detected method is `unknown`, manual command asks "Install anyways?" (`:29-43`), while auto-update simply returns (`packages/opencode/src/cli/upgrade.ts:21`).
- Manual path reports failures to terminal (`packages/opencode/src/cli/cmd/upgrade.ts:57-67`); auto path swallows them (`packages/opencode/src/cli/upgrade.ts:24`).

## Failure model and observability

Failure handling in auto path is intentionally quiet:

- TUI thread RPC invocation swallows failures (`packages/opencode/src/cli/cmd/tui/thread.ts:160`).
- Worker wrapper swallows failures (`packages/opencode/src/cli/cmd/tui/worker.ts:129`).
- Upgrade execution swallows failures (`packages/opencode/src/cli/upgrade.ts:24`).

Other behavior:

- If latest version fetch fails, auto-update no-ops (`packages/opencode/src/cli/upgrade.ts:9-10`).
- Only positive events are emitted:
  - `installation.update-available` in notify mode (`packages/opencode/src/cli/upgrade.ts:17`)
  - `installation.updated` on successful install (`packages/opencode/src/cli/upgrade.ts:23`)
- No failure event is published from this auto path.

## Edge cases and gotchas

1. Auto-update policy scope is global config only

- `Config.global()` is used, not merged project config (`packages/opencode/src/cli/upgrade.ts:7` vs `packages/opencode/src/config/config.ts:1308-1314`).

2. `notify` mode still announces updates even when install method is unknown

- Unknown-method guard is after notify branch (`packages/opencode/src/cli/upgrade.ts:16-21`).

3. Brew latest source and install source can diverge

- Tap formula path resolves latest via GitHub fallback but installs via brew formula upgrade (`packages/opencode/src/installation/index.ts:123-129`, `:149-155`, `:239-245`).

4. Channel-coupled npm lookup can silently no-op

- If registry lacks dist-tag matching compiled `OPENCODE_CHANNEL`, latest fetch fails and auto-check exits silently (`packages/opencode/src/installation/index.ts:208-213`, `packages/opencode/src/cli/upgrade.ts:9-10`).

5. Auto-update cadence is startup-only

- There is no recurring timer loop; each TUI launch performs at most one delayed attempt (`packages/opencode/src/cli/cmd/tui/thread.ts:159-161`).

## Verification playbook

Local commands for validating behavior:

1. Check compiled channel/version used by update logic

```bash
bun --cwd packages/opencode -e 'import { Installation } from "./src/installation/index.ts"; console.log({ channel: Installation.CHANNEL, version: Installation.VERSION })'
```

2. Check detected method + latest resolution

```bash
bun --cwd packages/opencode -e 'import { Installation } from "./src/installation/index.ts"; const m = await Installation.method(); const l = await Installation.latest(m).catch((e) => ({ error: String(e) })); console.log({ method: m, latest: l })'
```

3. Validate tri-state policy from global config

```bash
mkdir -p ~/.config/opencode
printf '{"$schema":"https://opencode.ai/config.json","autoupdate":"notify"}\n' > ~/.config/opencode/opencode.json
```

4. Validate env override hard-disable

```bash
OPENCODE_DISABLE_AUTOUPDATE=1 opencode
```

5. Compare manual path behavior

```bash
opencode upgrade --method brew
opencode upgrade --method npm
opencode upgrade --method curl
```
