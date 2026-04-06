export function fnPrintCommandResult(result: unknown, wantsJson: boolean, extraFields?: Record<string, unknown>): void {
  if (wantsJson) {
    const payload = typeof result === 'object' && result !== null && extraFields !== undefined
      ? { ...result, ...Object.fromEntries(Object.entries(extraFields).filter(([, value]) => value !== undefined)) }
      : result;
    process.stdout.write(`${JSON.stringify(payload)}\n`);
    process.exitCode = 0;
    return;
  }

  console.log(result);
  process.exitCode = 0;
}

export function fnPrintCommandError(error: unknown, wantsJson: boolean): void {
  if (wantsJson && typeof error !== 'string') {
    process.stderr.write(`${JSON.stringify(error)}\n`);
    process.exitCode = 1;
    return;
  }

  console.error(error);
  process.exitCode = 1;
}
