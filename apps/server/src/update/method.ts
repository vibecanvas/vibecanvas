import type { TInstallMethod } from "./types";
import { getExecPath } from "../runtime";

function detectInstallMethod(): TInstallMethod {
  const execPath = getExecPath().toLowerCase();

  if (execPath.includes(".vibecanvas/bin") || execPath.includes(".vibecanvas\\bin")) {
    return "curl";
  }

  if (execPath.includes("node_modules") || execPath.includes("bunx") || execPath.includes("npm")) {
    return "npm";
  }

  return "unknown";
}

export default detectInstallMethod;
