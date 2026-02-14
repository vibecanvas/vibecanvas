import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { txConfigPath } from "@vibecanvas/core/vibecanvas-config/index";

const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000;

type TState = {
  lastCheckedAt: string;
};

function stateFilePath(): string | null {
  const [configPathData] = txConfigPath({ fs: { existsSync, mkdirSync } }, { isCompiled: VIBECANVAS_COMPILED });
  if (!configPathData) return null;
  return join(configPathData.configDir, "autoupdate-state.json");
}

function getLastCheckedAt(): number | null {
  const filePath = stateFilePath();
  if (!filePath || !existsSync(filePath)) return null;

  try {
    const raw = readFileSync(filePath, "utf8");
    const state = JSON.parse(raw) as TState;
    const timestamp = Date.parse(state.lastCheckedAt);
    return Number.isFinite(timestamp) ? timestamp : null;
  } catch {
    return null;
  }
}

function setLastCheckedAt(now = new Date()): void {
  const filePath = stateFilePath();
  if (!filePath) return;
  writeFileSync(filePath, JSON.stringify({ lastCheckedAt: now.toISOString() }, null, 2));
}

function shouldCheckNow(now = Date.now()): boolean {
  const lastCheckedAt = getLastCheckedAt();
  if (!lastCheckedAt) return true;
  return now - lastCheckedAt >= CHECK_INTERVAL_MS;
}

export { shouldCheckNow, setLastCheckedAt, getLastCheckedAt, CHECK_INTERVAL_MS };
