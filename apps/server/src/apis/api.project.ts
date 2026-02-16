import { ctrlDirFiles, ctrlDirHome, ctrlDirList } from "@vibecanvas/core/project-fs/index";
import { readdirSync, existsSync, statSync } from "fs";
import { homedir } from "os";
import { dirname, join } from "path";
import { baseOs } from "../orpc.base";

const dirPortal = {
  os: { homedir },
  fs: { readdirSync, existsSync, statSync },
  path: { dirname, join },
};

const home = baseOs.api.project.dir.home.handler(async ({ }) => {
  const [result, error] = ctrlDirHome(dirPortal, {});
  if (error || !result) {
    return { type: error?.code ?? "ERROR", message: error?.externalMessage?.en ?? "Failed to get home directory" };
  }
  return result;
});

const list = baseOs.api.project.dir.list.handler(async ({ input }) => {
  const [result, error] = ctrlDirList(dirPortal, { path: input.query.path });
  if (error || !result) {
    return { type: error?.code ?? "ERROR", message: error?.externalMessage?.en ?? "Failed to list directory" };
  }
  return result;
});

const files = baseOs.api.project.dir.files.handler(async ({ input }) => {
  const home = homedir();
  const [result, error] = ctrlDirFiles(dirPortal, {
    path: input.query.path ?? home,
    glob_pattern: input.query.glob_pattern,
    max_depth: input.query.max_depth,
  });
  if (error || !result) {
    return { type: error?.code ?? "ERROR", message: error?.externalMessage?.en ?? "Failed to list files" };
  }
  return result;
});

export const project = {
  dir: {
    home,
    list,
    files,
  },
};
