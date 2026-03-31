import { ORPCError } from "@orpc/server";
import { baseOs } from "../orpc.base";

const list = baseOs.api.pty.list.handler(async ({ input, context: { ptyService } }) => {
  return ptyService.list(input.workingDirectory);
});

const create = baseOs.api.pty.create.handler(async ({ input, context: { ptyService } }) => {
  return ptyService.create(input.workingDirectory, input.body);
});

const get = baseOs.api.pty.get.handler(async ({ input, context: { ptyService } }) => {
  const pty = ptyService.get(input.workingDirectory, input.path.ptyID);
  if (!pty) throw new ORPCError("NOT_FOUND", { message: "PTY not found" });
  return pty;
});

const update = baseOs.api.pty.update.handler(async ({ input, context: { ptyService } }) => {
  const pty = ptyService.update(input.workingDirectory, input.path.ptyID, input.body);
  if (!pty) throw new ORPCError("NOT_FOUND", { message: "PTY not found" });
  return pty;
});

const remove = baseOs.api.pty.remove.handler(async ({ input, context: { ptyService } }) => {
  const removed = await ptyService.remove(input.workingDirectory, input.path.ptyID);
  if (!removed) throw new ORPCError("NOT_FOUND", { message: "PTY not found" });
  return true;
});

export const pty = {
  list,
  create,
  get,
  update,
  remove,
};
