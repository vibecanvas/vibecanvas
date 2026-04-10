# How to release Vibecanvas

Reference only:
- `.github/workflows/publish.yml`
- `.github/workflows/test.yml`
- `.github/workflows/deploy-web.yml`

## Stable
1. `bun run version:update -- 0.3.0`
2. Add `## 0.3.0` to `CHANGELOG.md`
3. Commit and push branch `release/v0.3.0`
4. GitHub Actions publishes npm `latest` and a normal GitHub release

## Beta
1. `bun run version:update -- 0.3.0-beta.1`
2. Add `## 0.3.0-beta.1` to `CHANGELOG.md`
3. Commit and push branch `release/v0.3.0-beta.1`
4. GitHub Actions publishes npm `beta` and a GitHub prerelease

## Nightly
1. `bun run version:update -- 0.3.0-nightly.20260409`
2. Add `## 0.3.0-nightly.20260409` to `CHANGELOG.md`
3. Commit and push branch `release/v0.3.0-nightly.20260409`
4. GitHub Actions publishes npm `nightly` and a GitHub prerelease
