# NPM Distribution Setup

## Table of Contents
- [Requirements](#requirements)
- [Overview](#overview)
- [Build Strategy](#build-strategy)
- [Implementation Steps](#implementation-steps)
- [Key Changes](#key-changes)
- [Files to Create/Modify](#files-to-createmodify)
- [Verification](#verification)
- [Data Flow](#data-flow)

---

## Requirements

1. Install via `npm install -g vibecanvas` or `npx vibecanvas`
2. Install via `curl -fsSL https://vibecanvas.dev/install | bash`
3. Cross-platform support: macOS (arm64/x64), Linux (arm64/x64/musl), Windows (x64)
4. Users only download their platform's binary (~50MB), not all platforms (~300MB)
5. CLI should start the server and open the SPA

**Assumptions:**
- Using Bun's compile feature for single-file executables
- Using npm `optionalDependencies` with `os`/`cpu` fields for selective downloads
- Server entry point bundles both API + SPA assets
- Reference: `docs/guide-npm-distribution.md`

**Learnings from OpenCode install script:**
- Detect Rosetta 2 on macOS (use ARM binary even in x64 terminal)
- Detect musl for Alpine Linux
- Detect AVX2 for baseline builds on older CPUs
- Support `--version` flag to install specific version
- Support `--binary` flag for local testing
- Support `--no-modify-path` for CI/Docker
- Check if already installed before downloading
- Verify release exists (HTTP 404 check) before downloading
- Shell-agnostic PATH configuration (fish, zsh, bash)
- GitHub Actions integration via `$GITHUB_PATH`

---

## Overview

```
packages/
├── vibecanvas/                      # Main wrapper package (~5KB)
│   ├── package.json                 # optionalDependencies → platform packages
│   ├── bin/vibecanvas               # Node.js launcher script
│   ├── postinstall.mjs              # Verification script
│   └── install.sh                   # Curl install script
│
├── vibecanvas-darwin-arm64/         # Platform-specific packages (~50MB each)
│   ├── package.json                 # os: ["darwin"], cpu: ["arm64"]
│   └── bin/vibecanvas               # Compiled binary
│
├── vibecanvas-darwin-x64/
├── vibecanvas-linux-x64/
├── vibecanvas-linux-arm64/
├── vibecanvas-linux-x64-musl/
├── vibecanvas-linux-arm64-musl/
├── vibecanvas-linux-x64-baseline/   # Older CPUs without AVX2
├── vibecanvas-windows-x64/
└── vibecanvas-windows-x64-baseline/

scripts/
└── build-dist.ts                    # Multi-platform build script
```

---

## Build Strategy

### Hybrid Approach: Local + GitHub Actions

| Task | Where | When |
|------|-------|------|
| Development/testing | Local (`--single`) | During development |
| Release builds | GitHub Actions | On git tag push |

**Why hybrid:**
- Bun can cross-compile all platforms from macOS
- Local builds for fast iteration
- CI builds for automated releases

### Local Build (Cross-Compilation)

```bash
# Build only current platform (fast, for testing)
bun scripts/build-dist.ts --single

# Build all platforms from your Mac
bun scripts/build-dist.ts
```

### GitHub Actions (Automated Releases)

```bash
# Tag a release → CI builds all platforms → uploads to GitHub Releases + npm
git tag v0.0.1
git push --tags
```

**GitHub Actions Free Tier:**
| Repo Type | Minutes/Month |
|-----------|---------------|
| Public | Unlimited |
| Private | 2,000 |

---

## Implementation Steps

### Step 1: Create main wrapper package

**packages/vibecanvas/package.json**

```json
{
  "name": "vibecanvas",
  "version": "0.0.1",
  "description": "Visual devtool for Bun.js codebases",
  "author": "Omar Ezzat",
  "license": "ISC",
  "bin": {
    "vibecanvas": "./bin/vibecanvas"
  },
  "files": ["bin", "postinstall.mjs", "install.sh"],
  "scripts": {
    "postinstall": "node postinstall.mjs"
  },
  "optionalDependencies": {
    "vibecanvas-darwin-arm64": "0.0.1",
    "vibecanvas-darwin-x64": "0.0.1",
    "vibecanvas-linux-arm64": "0.0.1",
    "vibecanvas-linux-x64": "0.0.1",
    "vibecanvas-linux-x64-baseline": "0.0.1",
    "vibecanvas-linux-arm64-musl": "0.0.1",
    "vibecanvas-linux-x64-musl": "0.0.1",
    "vibecanvas-windows-x64": "0.0.1",
    "vibecanvas-windows-x64-baseline": "0.0.1"
  },
  "engines": { "node": ">=18" },
  "keywords": ["bun", "devtools", "visual", "canvas", "cli"]
}
```

### Step 2: Create launcher script

**packages/vibecanvas/bin/vibecanvas**

```javascript
#!/usr/bin/env node
const { spawn } = require('child_process');
const os = require('os');

const platform = os.platform();
const arch = os.arch();

// Build package name based on platform
const pkgName = [
  'vibecanvas',
  platform === 'win32' ? 'windows' : platform,
  arch,
].join('-');

// Try to resolve the platform-specific binary
let binaryPath;
const attempts = [
  pkgName,
  `${pkgName}-baseline`,
  `${pkgName}-musl`,
];

for (const pkg of attempts) {
  try {
    binaryPath = require.resolve(`${pkg}/bin/vibecanvas`);
    break;
  } catch {}
}

if (!binaryPath) {
  console.error(`No binary found for platform: ${platform}-${arch}`);
  console.error(`Tried: ${attempts.join(', ')}`);
  console.error('\nSupported platforms:');
  console.error('  - darwin-arm64 (macOS Apple Silicon)');
  console.error('  - darwin-x64 (macOS Intel)');
  console.error('  - linux-arm64');
  console.error('  - linux-x64');
  console.error('  - windows-x64');
  process.exit(1);
}

// Spawn the binary with all arguments
const child = spawn(binaryPath, process.argv.slice(2), {
  stdio: 'inherit',
  env: process.env,
});

child.on('error', (err) => {
  console.error(`Failed to start vibecanvas: ${err.message}`);
  process.exit(1);
});

child.on('exit', (code) => process.exit(code ?? 0));
```

### Step 3: Create postinstall script

**packages/vibecanvas/postinstall.mjs**

```javascript
import { platform, arch } from 'os';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const os = platform();
const cpu = arch();

const pkgName = ['vibecanvas', os === 'win32' ? 'windows' : os, cpu].join('-');

try {
  require.resolve(`${pkgName}/bin/vibecanvas`);
  console.log(`vibecanvas: found ${pkgName} binary`);
} catch {
  console.warn(`vibecanvas: no binary for ${os}-${cpu}, will try fallback at runtime`);
}
```

### Step 4: Create build script

**scripts/build-dist.ts**

```typescript
#!/usr/bin/env bun
import path from "path"
import pkg from "../package.json"

const __dirname = path.dirname(new URL(import.meta.url).pathname)
const rootDir = path.join(__dirname, "..")
const version = pkg.version

// Platform targets
const targets = [
  { os: "darwin", arch: "arm64" },
  { os: "darwin", arch: "x64" },
  { os: "linux", arch: "arm64" },
  { os: "linux", arch: "x64" },
  { os: "linux", arch: "x64", avx2: false },      // baseline
  { os: "linux", arch: "arm64", abi: "musl" },
  { os: "linux", arch: "x64", abi: "musl" },
  { os: "win32", arch: "x64" },
  { os: "win32", arch: "x64", avx2: false },      // baseline
] as const

// Flags
const singleFlag = process.argv.includes("--single")
const filteredTargets = singleFlag
  ? targets.filter(t => t.os === process.platform && t.arch === process.arch && !("avx2" in t))
  : targets

await Bun.$`rm -rf ${rootDir}/dist`
await Bun.$`mkdir -p ${rootDir}/dist`

for (const target of filteredTargets) {
  // Build package name: vibecanvas-{os}-{arch}[-baseline][-musl]
  const name = [
    "vibecanvas",
    target.os === "win32" ? "windows" : target.os,
    target.arch,
    "avx2" in target && !target.avx2 ? "baseline" : undefined,
    "abi" in target ? target.abi : undefined,
  ].filter(Boolean).join("-")

  console.log(`Building ${name}...`)

  const distDir = `${rootDir}/dist/${name}`
  await Bun.$`mkdir -p ${distDir}/bin`

  // Bun compile target format
  const bunTarget = [
    "bun",
    target.os,
    target.arch,
    "avx2" in target && !target.avx2 ? "baseline" : undefined,
    "abi" in target ? target.abi : undefined,
  ].filter(Boolean).join("-")

  // Compile server (includes SPA assets)
  await Bun.build({
    entrypoints: [`${rootDir}/apps/server/src/server.ts`],
    compile: {
      target: bunTarget as any,
      outfile: `${distDir}/bin/vibecanvas`,
    },
    minify: true,
    define: {
      VIBECANVAS_VERSION: JSON.stringify(version),
    },
  })

  // Create platform package.json
  await Bun.write(
    `${distDir}/package.json`,
    JSON.stringify({
      name,
      version,
      os: [target.os],
      cpu: [target.arch],
      bin: { vibecanvas: "./bin/vibecanvas" },
      description: `Vibecanvas binary for ${target.os} ${target.arch}`,
      license: "ISC",
    }, null, 2)
  )
}

// Copy wrapper package to dist
await Bun.$`cp -r ${rootDir}/packages/vibecanvas ${rootDir}/dist/vibecanvas`

console.log("\nBuild complete! Packages in dist/")
console.log("\nTo test locally:")
console.log("  ./dist/vibecanvas-darwin-arm64/bin/vibecanvas --version")
```

### Step 5: Create curl install script (OpenCode-style)

**packages/vibecanvas/install.sh**

```bash
#!/usr/bin/env bash
set -euo pipefail

APP=vibecanvas
REPO="omarezzat/vibecanvas"

# Colors
RED='\033[0;31m'
MUTED='\033[0;2m'
NC='\033[0m'

usage() {
    cat <<EOF
Vibecanvas Installer

Usage: install.sh [options]

Options:
    -h, --help              Display this help message
    -v, --version <version> Install a specific version (e.g., 0.0.1)
    -b, --binary <path>     Install from a local binary instead of downloading
        --no-modify-path    Don't modify shell config files (.zshrc, .bashrc, etc.)

Examples:
    curl -fsSL https://vibecanvas.dev/install | bash
    curl -fsSL https://vibecanvas.dev/install | bash -s -- --version 0.0.1
    ./install.sh --binary /path/to/vibecanvas
EOF
}

requested_version=""
no_modify_path=false
binary_path=""

while [[ $# -gt 0 ]]; do
    case "$1" in
        -h|--help) usage; exit 0 ;;
        -v|--version)
            requested_version="${2:-}"
            [[ -z "$requested_version" ]] && echo -e "${RED}Error: --version requires argument${NC}" && exit 1
            shift 2 ;;
        -b|--binary)
            binary_path="${2:-}"
            [[ -z "$binary_path" ]] && echo -e "${RED}Error: --binary requires argument${NC}" && exit 1
            shift 2 ;;
        --no-modify-path) no_modify_path=true; shift ;;
        *) echo -e "${RED}Unknown option: $1${NC}" >&2; shift ;;
    esac
done

INSTALL_DIR="${VIBECANVAS_INSTALL_DIR:-$HOME/.vibecanvas/bin}"
mkdir -p "$INSTALL_DIR"

# Skip detection if using local binary
if [[ -n "$binary_path" ]]; then
    if [[ ! -f "$binary_path" ]]; then
        echo -e "${RED}Error: Binary not found at ${binary_path}${NC}"
        exit 1
    fi
    specific_version="local"
else
    # Detect OS
    raw_os=$(uname -s)
    case "$raw_os" in
        Darwin*) os="darwin" ;;
        Linux*) os="linux" ;;
        MINGW*|MSYS*|CYGWIN*) os="windows" ;;
        *) echo -e "${RED}Unsupported OS: $raw_os${NC}"; exit 1 ;;
    esac

    # Detect arch
    arch=$(uname -m)
    [[ "$arch" == "aarch64" ]] && arch="arm64"
    [[ "$arch" == "x86_64" ]] && arch="x64"

    # Rosetta 2 detection (macOS running x64 under ARM)
    if [[ "$os" == "darwin" && "$arch" == "x64" ]]; then
        rosetta_flag=$(sysctl -n sysctl.proc_translated 2>/dev/null || echo 0)
        [[ "$rosetta_flag" == "1" ]] && arch="arm64"
    fi

    # musl detection (Alpine Linux)
    is_musl=false
    if [[ "$os" == "linux" ]]; then
        [[ -f /etc/alpine-release ]] && is_musl=true
        command -v ldd >/dev/null 2>&1 && ldd --version 2>&1 | grep -qi musl && is_musl=true
    fi

    # AVX2 detection (baseline for older CPUs)
    needs_baseline=false
    if [[ "$arch" == "x64" ]]; then
        if [[ "$os" == "linux" ]] && ! grep -qi avx2 /proc/cpuinfo 2>/dev/null; then
            needs_baseline=true
        fi
        if [[ "$os" == "darwin" ]]; then
            avx2=$(sysctl -n hw.optional.avx2_0 2>/dev/null || echo 0)
            [[ "$avx2" != "1" ]] && needs_baseline=true
        fi
    fi

    # Build target name
    target="$os-$arch"
    [[ "$needs_baseline" == "true" ]] && target="$target-baseline"
    [[ "$is_musl" == "true" ]] && target="$target-musl"

    # Archive format
    archive_ext=".tar.gz"
    [[ "$os" == "windows" ]] && archive_ext=".zip"

    filename="$APP-$target$archive_ext"

    # Get version
    if [[ -z "$requested_version" ]]; then
        specific_version=$(curl -s "https://api.github.com/repos/$REPO/releases/latest" | sed -n 's/.*"tag_name": *"v\([^"]*\)".*/\1/p')
        [[ -z "$specific_version" ]] && echo -e "${RED}Failed to fetch latest version${NC}" && exit 1
        url="https://github.com/$REPO/releases/latest/download/$filename"
    else
        requested_version="${requested_version#v}"  # Strip leading 'v'
        specific_version="$requested_version"
        # Verify release exists
        http_status=$(curl -sI -o /dev/null -w "%{http_code}" "https://github.com/$REPO/releases/tag/v${requested_version}")
        if [[ "$http_status" == "404" ]]; then
            echo -e "${RED}Error: Release v${requested_version} not found${NC}"
            echo -e "${MUTED}Available: https://github.com/$REPO/releases${NC}"
            exit 1
        fi
        url="https://github.com/$REPO/releases/download/v${requested_version}/$filename"
    fi

    # Check if already installed
    if command -v vibecanvas >/dev/null 2>&1; then
        installed_version=$(vibecanvas --version 2>/dev/null || echo "")
        if [[ "$installed_version" == "$specific_version" ]]; then
            echo -e "${MUTED}Version ${NC}$specific_version${MUTED} already installed${NC}"
            exit 0
        fi
        echo -e "${MUTED}Upgrading from ${NC}$installed_version${MUTED} to ${NC}$specific_version"
    fi
fi

# Install
if [[ -n "$binary_path" ]]; then
    echo -e "\n${MUTED}Installing from: ${NC}$binary_path"
    cp "$binary_path" "$INSTALL_DIR/vibecanvas"
else
    echo -e "\n${MUTED}Installing vibecanvas ${NC}$specific_version${MUTED} for ${NC}$target"
    tmp_dir="${TMPDIR:-/tmp}/vibecanvas_install_$$"
    mkdir -p "$tmp_dir"

    curl -# -L -o "$tmp_dir/$filename" "$url"

    if [[ "$os" == "linux" ]]; then
        tar -xzf "$tmp_dir/$filename" -C "$tmp_dir"
    else
        unzip -q "$tmp_dir/$filename" -d "$tmp_dir"
    fi

    mv "$tmp_dir/vibecanvas" "$INSTALL_DIR/"
    rm -rf "$tmp_dir"
fi

chmod 755 "$INSTALL_DIR/vibecanvas"

# PATH configuration
add_to_path() {
    local config_file=$1
    local command=$2
    if grep -Fxq "$command" "$config_file" 2>/dev/null; then
        return
    elif [[ -w "$config_file" ]]; then
        echo -e "\n# vibecanvas" >> "$config_file"
        echo "$command" >> "$config_file"
        echo -e "${MUTED}Added to PATH in ${NC}$config_file"
    fi
}

if [[ "$no_modify_path" != "true" && ":$PATH:" != *":$INSTALL_DIR:"* ]]; then
    current_shell=$(basename "$SHELL")
    case $current_shell in
        fish)
            config="$HOME/.config/fish/config.fish"
            [[ -f "$config" ]] && add_to_path "$config" "fish_add_path $INSTALL_DIR"
            ;;
        zsh)
            config="${ZDOTDIR:-$HOME}/.zshrc"
            [[ -f "$config" ]] && add_to_path "$config" "export PATH=$INSTALL_DIR:\$PATH"
            ;;
        *)
            config="$HOME/.bashrc"
            [[ -f "$config" ]] && add_to_path "$config" "export PATH=$INSTALL_DIR:\$PATH"
            ;;
    esac
fi

# GitHub Actions support
if [[ "${GITHUB_ACTIONS:-}" == "true" ]]; then
    echo "$INSTALL_DIR" >> "$GITHUB_PATH"
fi

echo -e "\n${MUTED}vibecanvas installed successfully!${NC}"
echo -e "\n${MUTED}To start:${NC}"
echo -e "  cd <project>"
echo -e "  vibecanvas"
echo -e "\n${MUTED}Docs: ${NC}https://vibecanvas.dev/docs"
```

### Step 6: Create GitHub Actions workflow

**.github/workflows/release.yml**

```yaml
name: Release

on:
  push:
    tags:
      - 'v*'

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: oven-sh/setup-bun@v2
        with:
          bun-version: latest

      - run: bun install

      - run: bun scripts/build-dist.ts

      - uses: actions/upload-artifact@v4
        with:
          name: dist
          path: dist/

  publish-npm:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/download-artifact@v4
        with:
          name: dist
          path: dist/

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          registry-url: 'https://registry.npmjs.org'

      - name: Publish platform packages
        run: |
          for pkg in dist/vibecanvas-*; do
            echo "Publishing $pkg..."
            cd "$pkg"
            npm publish --access public || true
            cd -
          done
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}

      - name: Publish main package
        run: |
          cd dist/vibecanvas
          npm publish --access public
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}

  publish-github:
    needs: build
    runs-on: ubuntu-latest
    permissions:
      contents: write
    steps:
      - uses: actions/download-artifact@v4
        with:
          name: dist
          path: dist/

      - name: Create archives
        run: |
          cd dist
          for dir in vibecanvas-*/; do
            name="${dir%/}"
            if [[ "$name" == *"windows"* ]]; then
              zip -r "${name}.zip" "$name"
            else
              tar -czf "${name}.tar.gz" -C "$name/bin" vibecanvas
            fi
          done

      - name: Upload to GitHub Releases
        uses: softprops/action-gh-release@v1
        with:
          files: |
            dist/*.tar.gz
            dist/*.zip
```

### Step 7: Add npm scripts to root package.json

```json
{
  "scripts": {
    "build:dist": "bun scripts/build-dist.ts",
    "build:dist:local": "bun scripts/build-dist.ts --single"
  }
}
```

---

## Key Changes

### Wrapper package pattern

```
User runs: npm install -g vibecanvas
                    │
                    ▼
┌─────────────────────────────────────────────────────┐
│  vibecanvas package (5KB)                           │
│  ├── optionalDependencies check os/cpu             │
│  └── only downloads matching platform binary       │
└─────────────────────────────────────────────────────┘
                    │
                    ▼ (npm auto-selects)
┌─────────────────────────────────────────────────────┐
│  vibecanvas-darwin-arm64 (50MB) ← macOS M1/M2/M3  │
│  vibecanvas-darwin-x64 (50MB)   ← macOS Intel     │
│  vibecanvas-linux-x64 (50MB)    ← Standard Linux  │
│  etc...                                            │
└─────────────────────────────────────────────────────┘
```

### Install script features (from OpenCode)

| Feature | Purpose |
|---------|---------|
| Rosetta 2 detection | ARM binary for M1+ Macs in x64 terminal |
| musl detection | Alpine/Docker gets correct binary |
| AVX2 detection | Older CPUs get baseline build |
| `--version` flag | Install specific release |
| `--binary` flag | Local testing without download |
| `--no-modify-path` | CI/Docker friendly |
| Version check | Skip if already installed |
| HTTP 404 check | Fail fast with clear error |
| `$GITHUB_PATH` | Works in GitHub Actions |

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `packages/vibecanvas/package.json` | Create | Main npm package with optionalDependencies |
| `packages/vibecanvas/bin/vibecanvas` | Create | Node.js launcher script |
| `packages/vibecanvas/postinstall.mjs` | Create | Postinstall verification |
| `packages/vibecanvas/install.sh` | Create | Curl install script (OpenCode-style) |
| `scripts/build-dist.ts` | Create | Multi-platform build script |
| `package.json` (root) | Modify | Add workspace + scripts |
| `.github/workflows/release.yml` | Create | CI/CD for releases |

---

## Verification

### Local Testing

```bash
# Build for current platform only
bun build:dist:local

# Test the binary directly
./dist/vibecanvas-darwin-arm64/bin/vibecanvas --version
./dist/vibecanvas-darwin-arm64/bin/vibecanvas

# Test install script with local binary
bash packages/vibecanvas/install.sh --binary ./dist/vibecanvas-darwin-arm64/bin/vibecanvas

# Test npm link
cd dist/vibecanvas-darwin-arm64 && npm link
vibecanvas --version
```

### Full Build (Cross-Compile)

```bash
# Build all platforms from your Mac
bun build:dist

# Check output
ls -la dist/
# vibecanvas/
# vibecanvas-darwin-arm64/
# vibecanvas-darwin-x64/
# vibecanvas-linux-x64/
# vibecanvas-linux-arm64/
# vibecanvas-linux-x64-musl/
# ...
```

### Test Linux binary with Docker

```bash
docker run --rm -v $(pwd)/dist:/dist ubuntu:22.04 /dist/vibecanvas-linux-x64/bin/vibecanvas --version
docker run --rm -v $(pwd)/dist:/dist alpine:3.19 /dist/vibecanvas-linux-x64-musl/bin/vibecanvas --version
```

### Release (Automated)

```bash
# Tag triggers GitHub Actions
git tag v0.0.1
git push --tags

# CI will:
# 1. Build all platforms
# 2. Publish to npm registry
# 3. Upload to GitHub Releases
```

---

## Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                         BUILD                                    │
│  Local: bun build:dist    OR    CI: GitHub Actions on tag       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Distribution Channels                          │
└─────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌───────────────┐   ┌───────────────┐   ┌───────────────────────┐
│ npm install   │   │ curl install  │   │ GitHub Releases       │
│ -g vibecanvas │   │ script        │   │ (tar.gz binaries)     │
└───────┬───────┘   └───────┬───────┘   └───────────┬───────────┘
        │                   │                       │
        ▼                   ▼                       ▼
┌───────────────┐   ┌───────────────┐   ┌───────────────────────┐
│ npm registry  │   │ GitHub Releases│  │ Direct download       │
│ optionalDeps  │   │ detects:      │   │                       │
│ selects OS    │   │ • Rosetta 2   │   │                       │
│               │   │ • musl        │   │                       │
│               │   │ • AVX2        │   │                       │
└───────┬───────┘   └───────┬───────┘   └───────────┬───────────┘
        │                   │                       │
        └───────────────────┼───────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│               Platform Binary (~50MB)                            │
│  Standalone Bun executable with:                                │
│  - Server (Elysia API)                                          │
│  - SPA assets (bundled)                                         │
│  - SQLite (bun:sqlite)                                          │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                      User runs vibecanvas                        │
│  1. Starts HTTP server on port 7496                             │
│  2. Opens browser to localhost:7496                             │
│  3. Creates ~/.vibecanvas/vibecanvas.sqlite                     │
└─────────────────────────────────────────────────────────────────┘
```

**Data involved:**
- Package metadata: version, os, cpu constraints
- Binary: ~50MB compiled Bun executable per platform
- User data: ~/.vibecanvas/vibecanvas.sqlite (created at runtime)
