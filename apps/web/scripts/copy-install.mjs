import { chmod, copyFile } from "node:fs/promises";
import { resolve } from "node:path";

const sourcePath = resolve(process.cwd(), "../../scripts/install.sh");
const targetPath = resolve(process.cwd(), "dist/install");

await copyFile(sourcePath, targetPath);
await chmod(targetPath, 0o755);

console.log(`Copied ${sourcePath} -> ${targetPath}`);
