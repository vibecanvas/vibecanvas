import { oc } from "@orpc/contract";
import agentLogsContract from "./agent-logs.contract";
import aiContract from "./ai.contract";
import canvasContract from "./canvas.contract";
import chatContract from "./chat.contract";
import dbContract from "./db.contract";
import fileContract from "./file.contract";
import filetreeContract from "./filetree.contract";
import notificationContract from "./notification.contract";
import projectDirContract from "./project-dir.contract";

export * from "./agent-logs.contract";
export * from "./canvas.contract";
export * from "./chat.contract";
export * from "./file.contract";
export * from "./filetree.contract";
export * from "./project-dir.contract";
export * from "./db.contract";
export * from "./notification.contract";

export const contract = oc.router({
  canvas: canvasContract,
  chat: chatContract,
  file: fileContract,
  filetree: filetreeContract,
  project: {
    dir: projectDirContract,
  },
  "agent-logs": agentLogsContract,
  ai: aiContract,
  db: dbContract,
  notification: notificationContract,
});

export default contract;
