import { basePtyOs } from './orpc';

const apiCreatePty = basePtyOs.create.handler(async ({ input, context }) => {
  return context.pty.create(input.workingDirectory, input.body);
});

export { apiCreatePty };
