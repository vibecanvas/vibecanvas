import { platform, arch } from "os"
import { createRequire } from "module"

const require = createRequire(import.meta.url)

const os = platform()
const cpu = arch()
const baseName = ["vibecanvas", os === "win32" ? "windows" : os, cpu].join("-")

// Try to find the platform binary
const attempts = [baseName, `${baseName}-baseline`, `${baseName}-musl`]

let found = false
for (const pkgName of attempts) {
  try {
    require.resolve(`${pkgName}/package.json`)
    console.log(`vibecanvas: found ${pkgName} binary`)
    found = true
    break
  } catch {
    // Try next
  }
}

if (!found) {
  console.warn(`vibecanvas: no binary for ${os}-${cpu}`)
  console.warn(`vibecanvas: will try fallback at runtime`)
}
