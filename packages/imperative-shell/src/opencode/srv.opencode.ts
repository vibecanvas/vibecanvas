import { type OpencodeClient, createOpencodeClient, createOpencodeServer } from "@opencode-ai/sdk/v2";
import { createServer } from "node:net";
import { color } from "bun";

function isOpencodeInstalled(): boolean {
  const result = Bun.spawnSync(["opencode", "--version"], { stdout: "ignore", stderr: "ignore" })
  return result.exitCode === 0
}

type TGlobalWithOpencodeServicePromise = typeof globalThis & {
  __vibecanvasOpencodeServicePromise?: Promise<OpencodeService>
}

const globalWithOpencodeServicePromise = globalThis as TGlobalWithOpencodeServicePromise

/**
 * Checks if an existing opencode server is responsive on given port.
 * Used under Bun --watch to avoid spawning duplicate daemons on restart.
 */
async function isOpencodeHealthy(port: number): Promise<boolean> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 500)

  try {
    const response = await fetch(`http://127.0.0.1:${port}/global/health`, {
      signal: controller.signal,
    })
    clearTimeout(timeoutId)
    return response.status >= 200 && response.status < 300
  } catch (error) {
    clearTimeout(timeoutId)
    return false
  }
}

/**
 * Scans port range for a healthy opencode server to reuse.
 * Prevents port churn when Bun --watch restarts the process.
 */
async function findHealthyOpencodePort(startPort: number, endPort: number): Promise<number | null> {
  for (let port = startPort; port <= endPort; port++) {
    if (await isOpencodeHealthy(port)) {
      return port
    }
  }
  return null
}

function checkPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = createServer()
    server.once('error', () => {
      resolve(false)
    })
    server.once('listening', () => {
      server.close()
      resolve(true)
    })
    server.listen(port, '127.0.0.1')
  })
}

/**
 * Finds an unused port for spawning a new opencode server.
 * Only called when no existing healthy server is found.
 */
async function findAvailablePort(startPort: number, endPort: number): Promise<number> {
  for (let port = startPort; port <= endPort; port++) {
    if (await checkPortAvailable(port)) {
      return port
    }
  }
  throw new Error(`No available ports found between ${startPort} and ${endPort}`)
}

/**
 * Use as singleton
 */
export class OpencodeService {
  private opencodeClients: { [chatId: string]: OpencodeClient } = {}

  private constructor(
    private opencodeServer: { url: string; close(): void },
    ownsServer: boolean
  ) {
    if (ownsServer) {
      process.once('SIGINT', () => {
        this.opencodeServer.close()
      })
      process.once('SIGTERM', () => {
        this.opencodeServer.close()
      })
      process.once('exit', () => {
        this.opencodeServer.close()
      })
    }
  }

  /**
   * Singleton init: reuses existing opencode server if healthy.
   * Prevents daemon leaks across Bun --watch restarts.
   */
  static async init(): Promise<OpencodeService> {
    if (globalWithOpencodeServicePromise.__vibecanvasOpencodeServicePromise) {
      return globalWithOpencodeServicePromise.__vibecanvasOpencodeServicePromise
    }

    globalWithOpencodeServicePromise.__vibecanvasOpencodeServicePromise = (async () => {
      if (!isOpencodeInstalled()) {
        const red = color("red", "ansi")
        const reset = "\x1b[0m"
        console.error(`${red}[Opencode] opencode is not installed. Install it with: bun install -g opencode-ai${reset}`)
        process.exit(1)
      }

      // Try to reuse an existing healthy opencode server
      const existingPort = await findHealthyOpencodePort(4096, 4196)
      if (existingPort !== null) {
        return new OpencodeService(
          { url: `http://127.0.0.1:${existingPort}`, close() { } },
          false
        )
      }

      // No existing server, start a new one
      const port = await findAvailablePort(4096, 4196)

      const opencodeServer = await createOpencodeServer({
        port,
        config: {
          autoupdate: false,
        }
      })

      return new OpencodeService(opencodeServer, true)
    })().catch((error) => {
      delete globalWithOpencodeServicePromise.__vibecanvasOpencodeServicePromise
      throw error
    })

    return globalWithOpencodeServicePromise.__vibecanvasOpencodeServicePromise
  }

  getClient(chatId: string, directory?: string) {
    if (this.opencodeClients[chatId]) return this.opencodeClients[chatId];

    this.opencodeClients[chatId] = createOpencodeClient({
      baseUrl: this.opencodeServer.url,
      directory
    })
    return this.opencodeClients[chatId];
  }

  closeClient(chatId: string) {
    if (this.opencodeClients[chatId]) {
      this.opencodeClients[chatId].instance.dispose()
      delete this.opencodeClients[chatId];
    }
  }
}