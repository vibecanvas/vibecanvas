function escapeRegex(value: string) {
  return value.replace(/[|\\{}()[\]^$+?.]/g, '\\$&');
}

function fnGlobMatch(value: string, pattern?: string): boolean {
  if (!pattern) return true;

  const source = `^${escapeRegex(pattern).replace(/\*/g, '.*')}$`;
  return new RegExp(source, 'i').test(value);
}

export { fnGlobMatch };
