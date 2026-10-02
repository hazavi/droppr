import test from "node:test"
import assert from "node:assert/strict"
import { createServer } from "node:http"
import { spawn } from "node:child_process"
import { existsSync } from "node:fs"
import { mkdtemp, readFile, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join, extname } from "node:path"

const chrome = [
  process.env.CHROME_PATH,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
].find((path) => path && existsSync(path))

test("an unreadable store page can be tracked and removal requires confirmation", async () => {
  assert.ok(chrome, "Chrome or Edge is required; set CHROME_PATH if installed elsewhere")
  const root = join(process.cwd(), "extension")
  const mock = `<script>
    window.__store = {};
    window.chrome = {
      storage: { local: { get: async () => window.__store, set: async (value) => Object.assign(window.__store, value) }, onChanged: { addListener() {} } },
      tabs: { query: async () => [{ id: 1, url: "https://www.amazon.com/dp/EXAMPLE", title: "Toothbrush" }], create: async () => {} },
      permissions: { request: async () => true },
      scripting: { executeScript: async () => [{ result: { error: "No product price found", image: location.origin + "/icons/droppr-16.png" } }] },
      runtime: { sendMessage: async () => ({ checked: 0, updated: 0, failed: 0 }) }
    };
  </script>`
  const runner = `<pre id="droppr-result"></pre><script>
    const waitFor = async (check) => { for (let i = 0; i < 40; i++) { if (check()) return; await new Promise((resolve) => setTimeout(resolve, 50)); } throw new Error("UI did not update"); };
    setTimeout(async () => {
      try {
        await waitFor(() => document.querySelector("#capture"));
        document.querySelector("#capture").click();
        await waitFor(() => document.querySelector("#preview-price-input"));
        document.querySelector("#preview-price-input").value = "427.37";
        document.querySelector("#preview-price-input").dispatchEvent(new Event("input", { bubbles: true }));
        document.querySelector("#preview-regular-price").value = "723.61";
        document.querySelector("#preview-currency").value = "DKK";
        document.querySelector("#preview-currency").dispatchEvent(new Event("change", { bubbles: true }));
        document.querySelector("#save-item").click();
        await waitFor(() => window.__store.items?.length === 1);
        const item = window.__store.items[0];
        await waitFor(() => document.querySelector("[data-remove]"));
        document.querySelector("[data-remove]").click();
        const dialogOpened = document.querySelector("#remove-dialog").open && document.querySelector("#remove-product-name").textContent === item.name;
        const stillTrackedBeforeConfirmation = window.__store.items.length === 1;
        document.querySelector("#cancel-remove").click();
        const cancelKeptProduct = !document.querySelector("#remove-dialog").open && window.__store.items.length === 1;
        document.querySelector("[data-remove]").click();
        document.querySelector("#confirm-remove").click();
        await waitFor(() => window.__store.items.length === 0);
        document.querySelector("#droppr-result").textContent = btoa(JSON.stringify({ price: item.currentPrice, regularPrice: item.originalPrice, currency: item.currency, name: item.name, image: item.image, dialogOpened, stillTrackedBeforeConfirmation, cancelKeptProduct, confirmRemovedProduct: !document.querySelector("#remove-dialog").open && window.__store.items.length === 0 }));
      } catch (error) { document.querySelector("#droppr-result").textContent = btoa(JSON.stringify({ error: error.message })); }
    }, 50);
  </script>`
  const html = (await readFile(join(root, "popup.html"), "utf8"))
    .replace('<script type="module" src="popup.js"></script>', `${mock}<script type="module" src="popup.js"></script>${runner}`)
  const server = createServer(async (request, response) => {
    try {
      if (request.url === "/popup.html") { response.setHeader("Content-Type", "text/html; charset=utf-8"); response.end(html); return }
      const file = join(root, request.url?.replace(/^\//, "") || "")
      response.setHeader("Content-Type", { ".js": "text/javascript", ".css": "text/css", ".png": "image/png" }[extname(file)] || "text/plain")
      response.end(await readFile(file))
    } catch { response.writeHead(404).end() }
  })
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve))
  const profile = await mkdtemp(join(tmpdir(), "droppr-popup-test-"))
  try {
    const output = await new Promise((resolve, reject) => {
      const child = spawn(chrome, ["--headless=new", "--disable-gpu", "--no-sandbox", "--disable-dev-shm-usage", `--user-data-dir=${profile}`, "--virtual-time-budget=3000", "--dump-dom", `http://127.0.0.1:${server.address().port}/popup.html`], { windowsHide: true })
      let htmlOutput = ""
      child.stdout.on("data", (chunk) => { htmlOutput += chunk })
      child.stderr.resume()
      const timeout = setTimeout(() => { child.kill(); reject(new Error("Popup test timed out")) }, 15000)
      child.on("error", (error) => { clearTimeout(timeout); reject(error) })
      child.on("close", () => { clearTimeout(timeout); resolve(htmlOutput) })
    })
    const encoded = output.match(/<pre id="droppr-result">([^<]+)<\/pre>/)?.[1]
    assert.ok(encoded, `Popup did not return a result: ${output.slice(0, 3000)}`)
    assert.deepEqual(JSON.parse(Buffer.from(encoded, "base64").toString("utf8")), { price: 427.37, regularPrice: 723.61, currency: "DKK", name: "Toothbrush", image: `http://127.0.0.1:${server.address().port}/icons/droppr-16.png` })
  } finally {
    server.close()
    await rm(profile, { recursive: true, force: true })
  }
})
