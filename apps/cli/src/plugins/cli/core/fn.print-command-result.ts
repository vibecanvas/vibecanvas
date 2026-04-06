export function fnPrintCommandResult(result: unknown, wantsJson: boolean, extraFields?: Record<string, unknown>): never {
  if (wantsJson) {
    const payload = typeof result === 'object' && result !== null && extraFields !== undefined
      ? { ...result, ...Object.fromEntries(Object.entries(extraFields).filter(([, value]) => value !== undefined)) }
      : result
    process.stdout.write(`${JSON.stringify(payload)}\n`)
    process.exit(0)
  }

  console.log(result)
  process.exit(0)
}

export function fnPrintCommandError(error: unknown, wantsJson: boolean): never {
  if (wantsJson && typeof error !== 'string') {
    process.stderr.write(`${JSON.stringify(error)}\n`)
    process.exit(1)
  }

  console.error(error)
  process.exit(1)
}
