const UPDATE_CHANNELS = ["stable", "beta", "nightly"] as const;
const RELEASES_API = "https://api.github.com/repos/vibecanvas/vibecanvas/releases" as const;

type TUpdateChannel = (typeof UPDATE_CHANNELS)[number];

type TServerEnv = {
  VIBECANVAS_VERSION?: string;
  VIBECANVAS_CHANNEL?: string;
  VIBECANVAS_DISABLE_AUTOUPDATE?: string;
  VIBECANVAS_CONFIG?: string;
};

function readEnv<K extends keyof TServerEnv>(key: K): TServerEnv[K] {
  return process.env[key];
}

function getServerVersion(): string {
  return readEnv("VIBECANVAS_VERSION") || "0.0.0";
}

function getUpdateChannel(): TUpdateChannel {
  const channel = readEnv("VIBECANVAS_CHANNEL");
  if (channel === "stable" || channel === "beta" || channel === "nightly") {
    return channel;
  }
  return "stable";
}

function isAutoUpdateDisabledFromEnv(): boolean {
  return readEnv("VIBECANVAS_DISABLE_AUTOUPDATE") === "1";
}

function getExecPath(): string {
  return process.execPath;
}

function getCliArgv(): readonly string[] {
  return Bun.argv;
}

export {
  RELEASES_API,
  getServerVersion,
  getUpdateChannel,
  isAutoUpdateDisabledFromEnv,
  getExecPath,
  getCliArgv,
  readEnv,
};
export type { TUpdateChannel, TServerEnv };
