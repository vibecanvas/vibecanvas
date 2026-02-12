import { join } from "path";
import { readdirSync, existsSync, statSync } from "fs";

const newVersion = process.argv[2];

if (!newVersion) {
  console.error("Usage: bun scripts/update-version.ts <new-version>");
  process.exit(1);
}

const rootDir = join(import.meta.dir, "..");
const dirsToScan = ["apps", "packages"];

const targetDirs = [rootDir];

for (const scanDir of dirsToScan) {
  const fullPath = join(rootDir, scanDir);
  if (existsSync(fullPath)) {
    for (const entry of readdirSync(fullPath)) {
      if (entry.startsWith(".")) continue;
      const entryPath = join(fullPath, entry);
      if (statSync(entryPath).isDirectory()) {
        targetDirs.push(entryPath);
      }
    }
  }
}

for (const dir of targetDirs) {
  const pkgPath = join(dir, "package.json");
  if (existsSync(pkgPath)) {
    try {
      const file = Bun.file(pkgPath);
      const pkg = await file.json();
      const oldVersion = pkg.version;
      pkg.version = newVersion;
      await Bun.write(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
      console.log(`Updated ${pkgPath.replace(rootDir, ".")} : ${oldVersion || 'undefined'} -> ${newVersion}`);
    } catch (e) {
      console.error(`Error updating ${pkgPath}:`, e);
    }
  }
}
