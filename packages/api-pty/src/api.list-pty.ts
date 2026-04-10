import { basePtyOs } from './orpc';

const apiListPty = basePtyOs.list.handler(async ({ input, context }) => {
  return context.pty.list(input.workingDirectory);
});

export { apiListPty };
