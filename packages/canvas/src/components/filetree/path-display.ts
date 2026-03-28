function normalizePath(path: string): string {
  const normalized = path.replaceAll("\\", "/");
  if (normalized === "/") return "/";
  return normalized.replace(/\/+$/, "");
}

export function toTildePath(path: string, homePath: string | null): string {
  if (!homePath) return path;

  const normalizedPath = normalizePath(path);
  const normalizedHome = normalizePath(homePath);

  if (normalizedPath === normalizedHome) return "~";
  if (normalizedPath.startsWith(`${normalizedHome}/`)) {
    return `~${normalizedPath.slice(normalizedHome.length)}`;
  }

  return path;
}
