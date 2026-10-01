import test from "node:test"
import assert from "node:assert/strict"
import { createServer } from "node:http"
import { spawn } from "node:child_process"
import { existsSync } from "node:fs"
import { mkdtemp, readFile, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

const chrome = [
  process.env.CHROME_PATH,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
].find((path) => path && existsSync(path))

const fixtures = [
  {
    name: "Zara crossed-out sale with stale structured price",
    html: `<html lang="da-DK"><body><section class="product-detail"><h1>Sweater</h1><div class="product-detail-info__price"><span class="price-old"><span class="money-amount__main">299,00 DKK</span></span><span>-40%</span><span class="price-current"><span class="money-amount__main">179,00 DKK</span></span></div></section><script type="application/ld+json">{"@type":"Product","offers":{"price":"299","priceCurrency":"DKK"}}</script></body></html>`,
    price: 179, comparePrice: 299, currency: "DKK",
  },
  {
    name: "Shopify price-item sale",
    html: `<html lang="en-US"><body><section class="product__info"><h1>Jacket</h1><div class="price"><s class="price-item price-item--regular">$120.00</s><span class="price-item price-item--sale">$79.00</span></div></section></body></html>`,
    price: 79, comparePrice: 120, currency: "USD",
  },
  {
    name: "WooCommerce del and ins",
    html: `<html lang="en-GB"><body><section class="product"><h1>Boots</h1><p class="price"><del><span class="woocommerce-Price-amount"><bdi>£99.00</bdi></span></del><ins><span class="woocommerce-Price-amount"><bdi>£69.00</bdi></span></ins></p></section></body></html>`,
    price: 69, comparePrice: 99, currency: "GBP",
  },
  {
    name: "Amazon current and text price",
    html: `<html lang="en-US"><body><section id="product-info"><h1>Headphones</h1><span class="a-price"><span class="a-offscreen">$39.99</span></span><span class="a-text-price"><span class="a-offscreen">$59.99</span></span></section></body></html>`,
    price: 39.99, comparePrice: 59.99, currency: "USD",
  },
  {
    name: "Magento special and old price",
    html: `<html lang="de-DE"><body><section class="product-info"><h1>Lamp</h1><span class="old-price"><span class="price">89,00 €</span></span><span class="special-price"><span class="price">59,00 €</span></span></section></body></html>`,
    price: 59, comparePrice: 89, currency: "EUR",
  },
  {
    name: "BigCommerce RRP and sale price",
    html: `<html lang="en-US"><body><section class="product-info"><h1>Bag</h1><span class="price--rrp">$100.00</span><span class="price--sale">$72.00</span></section></body></html>`,
    price: 72, comparePrice: 100, currency: "USD",
  },
  {
    name: "Crossed-out price followed by an unmarked current price",
    html: `<html lang="en-US"><body><section class="product-info"><h1>Shirt</h1><p class="price"><del>$80.00</del><span>$55.00</span></p></section></body></html>`,
    price: 55, comparePrice: 80, currency: "USD",
  },
  {
    name: "Discount percentage before the current price is not treated as a price",
    html: `<html lang="en-US"><body><section class="product-info"><h1>Shoes</h1><span class="sale-price">Save 20% $79.00</span></section></body></html>`,
    price: 79, currency: "USD",
  },
  {
    name: "Cheaper recommendation is ignored",
    html: `<html lang="en-US"><body><main><section class="product-info"><h1>Camera</h1><span class="price">$299.00</span></section><section class="recommendations"><span class="price">$19.00</span></section></main></body></html>`,
    price: 299, currency: "USD",
  },
  {
    name: "Visible price overrides stale JSON-LD",
    html: `<html lang="da-DK"><body><section class="product-info"><h1>Chair</h1><span class="product-price">179,00 kr.</span></section><script type="application/ld+json">{"@type":"Product","offers":{"price":"299","priceCurrency":"DKK"}}</script></body></html>`,
    price: 179, comparePrice: 299, currency: "DKK",
  },
  {
    name: "Structured data fallback",
    html: `<html lang="en-US"><body><h1>Table</h1><script type="application/ld+json">{"@type":"Product","offers":{"price":"49.95","priceCurrency":"USD"}}</script></body></html>`,
    price: 49.95, currency: "USD",
  },
  {
    name: "No price reports an error",
    html: `<html><body><h1>Unavailable product</h1></body></html>`,
    error: true,
  },
]

function runChrome(url, profile) {
  return new Promise((resolve, reject) => {
    const child = spawn(chrome, [
      "--headless=new", "--disable-gpu", "--no-sandbox", "--disable-dev-shm-usage",
      "--no-first-run", `--user-data-dir=${profile}`, "--virtual-time-budget=3000", "--dump-dom", url,
    ], { windowsHide: true })
    let output = ""
    child.stdout.on("data", (chunk) => { output += chunk })
    child.stderr.resume()
    const timeout = setTimeout(() => { child.kill(); reject(new Error("Browser test timed out")) }, 15000)
    child.on("error", (error) => { clearTimeout(timeout); reject(error) })
    child.on("close", () => { clearTimeout(timeout); resolve(output) })
  })
}

test("product price extraction across store markup", async (t) => {
  assert.ok(chrome, "Chrome or Edge is required; set CHROME_PATH if it is installed elsewhere")
  const script = await readFile(join(process.cwd(), "extension", "scrape.js"), "utf8")
  const server = createServer((request, response) => {
    if (request.url === "/scrape.js") {
      response.setHeader("Content-Type", "text/javascript")
      response.end(script)
      return
    }
    const index = Number(request.url?.slice(1))
    const fixture = fixtures[index]
    if (!fixture) { response.writeHead(404).end(); return }
    response.setHeader("Content-Type", "text/html; charset=utf-8")
    const runner = `<pre id="droppr-result"></pre><script type="module">import { extractProduct } from "/scrape.js"; document.querySelector("#droppr-result").textContent = btoa(JSON.stringify(extractProduct()));</script>`
    response.end(fixture.html.replace("</body>", `${runner}</body>`))
  })
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve))
  try {
    for (const [index, fixture] of fixtures.entries()) {
      await t.test(fixture.name, async () => {
        const profile = await mkdtemp(join(tmpdir(), "droppr-test-"))
        try {
          const output = await runChrome(`http://127.0.0.1:${server.address().port}/${index}`, profile)
          const encoded = output.match(/<pre id="droppr-result">([^<]+)<\/pre>/)?.[1]
          assert.ok(encoded, `Scraper did not return a result: ${output.slice(-500)}`)
          const result = JSON.parse(Buffer.from(encoded, "base64").toString("utf8"))
          if (fixture.error) assert.ok(result.error)
          else {
            assert.equal(result.price, fixture.price)
            assert.equal(result.comparePrice, fixture.comparePrice)
            assert.equal(result.currency, fixture.currency)
          }
        } finally { await rm(profile, { recursive: true, force: true }) }
      })
    }
  } finally { server.close() }
})
