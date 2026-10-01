import { cp, mkdir, rm, readFile } from "node:fs/promises"
import { join } from "node:path"

const root = process.cwd()
const manifest = JSON.parse(await readFile(join(root, "extension", "manifest.json"), "utf8"))
if (manifest.manifest_version !== 3 || !manifest.action?.default_popup || !manifest.background?.service_worker) {
  throw new Error("Invalid extension manifest")
}
await rm(join(root, "dist"), { recursive: true, force: true })
await mkdir(join(root, "dist"), { recursive: true })
await cp(join(root, "extension"), join(root, "dist"), { recursive: true })
console.log("Built unpacked extension in dist/")
