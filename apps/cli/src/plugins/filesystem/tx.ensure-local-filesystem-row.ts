import type { IDbService } from '@vibecanvas/service-db/IDbService';
import type { IFilesystemService } from '@vibecanvas/service-filesystem/IFilesystemService';
import type { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import type { hostname, homedir } from 'node:os';
import type { join } from 'node:path';
import type { ICliConfig } from '../../config';

type TMachineConfig = {
  machineId: string;
};

const MACHINE_CONFIG_FILE = 'machine.json';

function readMachineConfig(deps: { readFileSync: typeof readFileSync }, path: string): TMachineConfig | null {
  try {
    const raw = deps.readFileSync(path, 'utf8');
    const parsed = JSON.parse(raw) as Partial<TMachineConfig>;
    if (!parsed || typeof parsed.machineId !== 'string' || parsed.machineId.length === 0) {
      return null;
    }
    return { machineId: parsed.machineId };
  } catch {
    return null;
  }
}

function writeMachineConfig(deps: { writeFileSync: typeof writeFileSync }, path: string, config: TMachineConfig) {
  deps.writeFileSync(path, `${JSON.stringify(config, null, 2)}\n`, 'utf8');
}

function resolveMachineId(
  deps: {
    join: typeof join,
    mkdirSync: typeof mkdirSync,
    readFileSync: typeof readFileSync,
    writeFileSync: typeof writeFileSync,
    randomUUID: () => string
  },
  configPath: string,
): string {
  deps.mkdirSync(configPath, { recursive: true });
  const machineConfigPath = deps.join(configPath, MACHINE_CONFIG_FILE);
  const existing = readMachineConfig(deps, machineConfigPath);
  if (existing) return existing.machineId;

  const machineId = deps.randomUUID();
  writeMachineConfig(deps, machineConfigPath, { machineId });
  return machineId;
}

function resolveFilesystemLabel(deps: { hostname: typeof hostname }): string {
  const host = deps.hostname().trim();
  return host.length > 0 ? host : 'Local filesystem';
}

type TPortalFilesystem = {
  db: IDbService,
  filesystem: IFilesystemService,
  join: typeof join,
  mkdirSync: typeof mkdirSync,
  readFileSync: typeof readFileSync,
  writeFileSync: typeof writeFileSync,
  hostname: typeof hostname,
  randomUUID: () => string,
  homedir: typeof homedir,
}

type TArgsFilesystem = {
  config: ICliConfig
}

export async function txEnsureLocalFilesystemRow(portal: TPortalFilesystem, args: TArgsFilesystem) {
  const machineId = resolveMachineId({
    join: portal.join,
    mkdirSync: portal.mkdirSync,
    readFileSync: portal.readFileSync,
    writeFileSync: portal.writeFileSync,
    randomUUID: portal.randomUUID,
  }, args.config.configPath);
  const label = resolveFilesystemLabel({ hostname: portal.hostname });
  const homePath = portal.homedir();
  const existing = portal.db.filesystem.findByMachineId(machineId);

  if (!existing) {
    portal.db.filesystem.create({
      id: portal.randomUUID(),
      label,
      kind: 'local',
      machine_id: machineId,
      home_path: homePath,
    });
    return;
  }

  if (existing.label === label && existing.kind === 'local' && existing.home_path === homePath) {
    return;
  }

  portal.db.filesystem.updateById({
    id: existing.id,
    label,
    kind: 'local',
    home_path: homePath,
  });
}