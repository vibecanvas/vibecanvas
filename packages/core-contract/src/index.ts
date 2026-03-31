import { oc, populateContractRouterPaths } from "@orpc/contract";
import canvasContract from "./canvas.contract";
import dbContract from "./db.contract";
import fileContract from "./file.contract";
import filesystemContract from "./filesystem.contract";
import filetreeContract from "./filetree.contract";
import notificationContract from "./notification.contract";
import ptyContract from "./pty.contract";

export * from "./canvas.contract";
export * from "./file.contract";
export * from "./filesystem.contract";
export * from "./filetree.contract";
export * from "./db.contract";
export * from "./notification.contract";
export * from "./pty.contract";

export const contract = oc.router({
  canvas: canvasContract,
  file: fileContract,
  filesystem: filesystemContract,
  filetree: filetreeContract,
  pty: ptyContract,
  db: dbContract,
  notification: notificationContract,
});

export const apiContract = populateContractRouterPaths(
  oc.router({ api: contract }),
);

export default contract;
