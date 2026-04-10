import { basePtyOs } from './orpc';

const apiGetPty = basePtyOs.get.handler(async ({ input, context }) => {
  return context.pty.get(input.workingDirectory, input.path.ptyID) ?? null;
});

export { apiGetPty };
