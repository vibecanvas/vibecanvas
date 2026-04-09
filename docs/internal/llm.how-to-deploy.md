# Vibecanvas deployment and release guide

This file explains how deploy and release work in this repo.

## Big picture

There are two different deploy paths.

1. **Web docs deploy**
   - Workflow: `.github/workflows/deploy-web.yml`
   - Trigger: push to `main` or manual run
   - Builds `apps/web`
   - Deploys to GitHub Pages

2. **CLI/binary release deploy**
   - Workflow: `.github/workflows/publish.yml`
   - Trigger: push to branch matching `release/v*` or manual run
   - Validates version
   - Runs tests
   - Builds release binaries
   - Publishes npm packages
   - Creates git tag
   - Creates GitHub release with assets

## Test flow

Workflow: `.github/workflows/test.yml`

Runs on:
- every push
- pull requests to `main`
- manual run

Jobs:
- `test`
  - checkout
  - setup Bun `1.3.10`
  - `bun install --frozen-lockfile`
  - `bun run test`
- `test-binary`
  - depends on `test`
  - builds one Linux binary with `bun run scripts/build.ts --single`
  - tests binary with `bun run scripts/test-binary.ts --port 3339`

This is normal CI guard.

## Release flow

Workflow: `.github/workflows/publish.yml`

Runs on:
- push to branches like `release/v0.2.2`
- manual run

### Step 1: version checks

Job: `check-version`

It does these checks:
- root `package.json` version must match `apps/vibecanvas/package.json`
- branch name must be `release/v<version>`
- git tag `v<version>` must not already exist
- `CHANGELOG.md` must contain section `## <version>`

If any check fails, release stops.

### Step 2: test

Job: `test`

Runs full test suite again before release.

### Step 3: build release artifacts

Job: `build-release-artifacts`

Runs:
- `bun install --frozen-lockfile`
- `bun run scripts/build.ts`

This creates `dist/` with:
- compiled platform binaries
- wrapper package
- checksums
- `dist/release-manifest.json`

### Step 4: test Linux binary

Job: `test-linux-binary`

Runs built Linux x64 binary and checks startup.

### Step 5: publish release

Job: `publish-release`

Runs:
- `bun run scripts/publish-npm.ts`
- creates and pushes git tag `v<version>`
- `bun run scripts/release.ts --tag "v$VERSION" --notes-file "$NOTES_FILE" --fail-if-exists`

This publishes to:
- npm
- GitHub tags
- GitHub Releases

## How channels work

Channel logic lives in `scripts/release-channel.ts`.

Rules:
- version with no prerelease suffix => `stable`
- version containing `-beta...` => `beta`
- version containing `-nightly...` => `nightly`

Examples:
- `0.2.2` => `stable`
- `0.3.0-beta.1` => `beta`
- `0.3.0-nightly.20260409` => `nightly`

## How build picks channel

`scripts/build.ts`:
- reads version from `apps/vibecanvas/package.json`
- infers channel from version by default
- can be overridden with `--channel stable|beta|nightly`
- writes channel into build metadata
- writes `release-manifest.json`

Examples:

```bash
bun run scripts/build.ts
bun run scripts/build.ts --channel beta
bun run scripts/build.ts --single
```

Use override only if you know what you are doing.

Best path is simple:
- stable version string for stable
- beta version string for beta
- nightly version string for nightly

## How npm publish picks tag

`scripts/publish-npm.ts`:
- reads version
- infers npm tag from version if `--tag` not passed

Rules:
- `stable` => npm tag `latest`
- `beta` => npm tag `beta`
- `nightly` => npm tag `nightly`

So:
- stable releases install with plain `npm i -g vibecanvas`
- beta releases install with `npm i -g vibecanvas@beta`
- nightly releases install with `npm i -g vibecanvas@nightly`

Examples:

```bash
bun run scripts/publish-npm.ts
bun run scripts/publish-npm.ts --tag beta
bun run scripts/publish-npm.ts --tag nightly
```

## How GitHub release marks prerelease

`scripts/release.ts` reads `dist/release-manifest.json`.

Rule:
- non-stable channel => GitHub release created with `--prerelease`
- stable => normal GitHub release

So beta and nightly show as prerelease on GitHub.

## How to cut a stable release

1. Update both versions:
   - `package.json`
   - `apps/vibecanvas/package.json`
2. Use stable version format. Example:
   - `0.2.3`
3. Add changelog section:

```md
## 0.2.3
- change 1
- change 2
```

4. Push branch:

```bash
git checkout -b release/v0.2.3
git push origin release/v0.2.3
```

5. GitHub Actions does the rest.

Result:
- npm tag: `latest`
- GitHub release: normal release
- install channel: stable

## How to cut a beta release

1. Update both versions to beta form. Example:
   - `0.3.0-beta.1`
2. Add matching changelog section:

```md
## 0.3.0-beta.1
- change 1
- change 2
```

3. Push branch:

```bash
git checkout -b release/v0.3.0-beta.1
git push origin release/v0.3.0-beta.1
```

Result:
- npm tag: `beta`
- GitHub release: prerelease
- install channel: beta

## How to cut a nightly release

Same flow.

Use nightly version format. Example:
- `0.3.0-nightly.20260409`

Branch:

```bash
git checkout -b release/v0.3.0-nightly.20260409
git push origin release/v0.3.0-nightly.20260409
```

Result:
- npm tag: `nightly`
- GitHub release: prerelease
- install channel: nightly

## Local manual release commands

Build all:

```bash
bun install --frozen-lockfile
bun run scripts/build.ts
```

Publish npm with inferred tag:

```bash
bun run scripts/publish-npm.ts
```

Publish npm with explicit tag:

```bash
bun run scripts/publish-npm.ts --tag beta
bun run scripts/publish-npm.ts --tag nightly
```

Create GitHub release from built `dist/`:

```bash
bun run scripts/release.ts --tag v0.2.3 --notes-file ./notes.md
```

## Install paths by channel

There are two install paths.

### 1. Install from npm

Stable:

```bash
npm i -g vibecanvas
bun add -g vibecanvas
pnpm add -g vibecanvas
```

Beta:

```bash
npm i -g vibecanvas@beta
bun add -g vibecanvas@beta
pnpm add -g vibecanvas@beta
```

Nightly:

```bash
npm i -g vibecanvas@nightly
bun add -g vibecanvas@nightly
pnpm add -g vibecanvas@nightly
```

### 2. Install from install script

Install script: `scripts/install.sh`

Supported flags:
- `--version <version>`
- `--channel stable|beta|nightly`

Examples:

Stable latest:

```bash
curl -fsSL https://vibecanvas.dev/install | bash
curl -fsSL https://vibecanvas.dev/install | bash -s -- --channel stable
```

Latest beta:

```bash
curl -fsSL https://vibecanvas.dev/install | bash -s -- --channel beta
```

Latest nightly:

```bash
curl -fsSL https://vibecanvas.dev/install | bash -s -- --channel nightly
```

Exact version:

```bash
curl -fsSL https://vibecanvas.dev/install | bash -s -- --version 0.2.3
curl -fsSL https://vibecanvas.dev/install | bash -s -- --version 0.3.0-beta.1
curl -fsSL https://vibecanvas.dev/install | bash -s -- --version 0.3.0-nightly.20260409
```

Notes:
- if `--version` is set, script installs exact version
- if `--version` is not set, script resolves latest release for chosen channel
- default channel is `stable`

## Upgrade path by channel

CLI upgrade code uses install script too.

See `apps/cli/src/plugins/cli/cmds/cmd.upgrade.ts`.

It runs form like:

```bash
curl -fsSL https://vibecanvas.dev/install | bash -s -- --version <version> --channel <channel> --no-modify-path
```

Important:
- upgrade path passes exact version
- channel still travels with command
- exact version is what decides the artifact

## Coolify deployment

Repo Dockerfile supports build-time channel selection.

File: `Dockerfile`

Build args:
- `VIBECANVAS_VERSION`
- `VIBECANVAS_CHANNEL`

Logic:
- if `VIBECANVAS_VERSION` is non-empty, Docker install uses `--version`
- else Docker install uses `--channel`
- default channel is `stable`

Relevant Dockerfile block:

```dockerfile
ARG VIBECANVAS_VERSION=""
ARG VIBECANVAS_CHANNEL="stable"

RUN set -eux; \
    if [ -n "$VIBECANVAS_VERSION" ]; then \
      curl -fsSL https://vibecanvas.dev/install | bash -s -- --version "$VIBECANVAS_VERSION"; \
    else \
      curl -fsSL https://vibecanvas.dev/install | bash -s -- --channel "$VIBECANVAS_CHANNEL"; \
    fi; \
    cp /root/.vibecanvas/bin/vibecanvas /usr/local/bin/vibecanvas
```

In Coolify:
- set env vars as **Build Variables**
- for Dockerfile deploys, Coolify injects them as Docker `ARG`

Examples:

Stable default:
- leave both unset

Latest beta:
- `VIBECANVAS_VERSION=`
- `VIBECANVAS_CHANNEL=beta`

Exact beta:
- `VIBECANVAS_VERSION=0.3.0-beta.1`
- `VIBECANVAS_CHANNEL=beta`

Exact stable:
- `VIBECANVAS_VERSION=0.2.3`
- `VIBECANVAS_CHANNEL=stable`

Rule:
- version wins over channel

## Fast checklist

### Stable
- version like `0.2.3`
- branch `release/v0.2.3`
- npm tag `latest`
- install script default or `--channel stable`

### Beta
- version like `0.3.0-beta.1`
- branch `release/v0.3.0-beta.1`
- npm tag `beta`
- install with `@beta` or `--channel beta`

### Nightly
- version like `0.3.0-nightly.20260409`
- branch `release/v0.3.0-nightly.20260409`
- npm tag `nightly`
- install with `@nightly` or `--channel nightly`

## Source files

Main files for this system:
- `.github/workflows/test.yml`
- `.github/workflows/publish.yml`
- `.github/workflows/deploy-web.yml`
- `scripts/build.ts`
- `scripts/publish-npm.ts`
- `scripts/release.ts`
- `scripts/release-channel.ts`
- `scripts/install.sh`
- `Dockerfile`
