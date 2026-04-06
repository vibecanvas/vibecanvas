function fnPermissionsToRwx(mode: number): string {
  const scopes = [6, 3, 0];
  return scopes.map((shift) => {
    const value = (mode >> shift) & 0b111;
    return `${value & 0b100 ? 'r' : '-'}${value & 0b010 ? 'w' : '-'}${value & 0b001 ? 'x' : '-'}`;
  }).join('');
}

export { fnPermissionsToRwx };
