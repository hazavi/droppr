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
    name: "Amazon split DKK price with duplicated accessible amount",
    html: `<html lang="en-US"><body><main id="centerCol"><div id="title_feature_div"><h1>Philips Sonicare 5950</h1></div><img id="landingImage" src="data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=" data-old-hires="https://images.example.com/sonicare.jpg"><div id="corePrice_feature_div"><span class="a-price priceToPay"><span class="a-offscreen">DKK427.37</span><span aria-hidden="true"><span class="a-price-symbol">DKK</span><span class="a-price-whole">427<span class="a-price-decimal">.</span></span><span class="a-price-fraction">37</span></span></span><span class="a-text-price"><span class="a-offscreen">DKK723.61</span></span></div></main></body></html>`,
    price: 427.37, comparePrice: 723.61, currency: "DKK", image: "https://images.example.com/sonicare.jpg",
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
    name: "Visible price beats a cents-based data attribute",
    html: `<html lang="en-US"><body><section class="product-info"><h1>Jacket</h1><span class="product-price" data-price="7999">$79.99</span></section></body></html>`,
    price: 79.99, currency: "USD",
  },
  {
    name: "Numeric visible price beats a cents-based data attribute",
    html: `<html lang="en-US"><body><section class="product-info"><h1>Jacket</h1><span class="product-price" data-price="7999">79.99</span></section></body></html>`,
    price: 79.99, currency: "USD",
  },
  {
    name: "Price beside a quantity does not use the quantity",
    html: `<html lang="en-US"><body><section class="product-info"><h1>Pens</h1><span class="product-price">2 items for $49.99</span></section></body></html>`,
    price: 49.99, currency: "USD",
  },
  {
    name: "A nearby shipping price is ignored",
    html: `<html lang="en-US"><body><section class="product-info"><h1>Desk</h1><span class="shipping-price">$12.00 shipping</span><span class="product-price">$199.00</span></section></body></html>`,
    price: 199, currency: "USD",
  },
  {
    name: "A hidden SEO heading does not set the product scope",
    html: `<html lang="en-US"><body><h1 hidden>Other product</h1><section class="product-info"><h1>Camera</h1><span class="price">$299.00</span></section></body></html>`,
    price: 299, currency: "USD",
  },
  {
    name: "Lazy gallery image beats a site logo",
    html: `<html lang="en-US"><head><meta property="og:image" content="https://images.example.com/logo.jpg"></head><body><main><section class="product-info"><h1>Shoes</h1><span class="price">$59.00</span></section><div class="product-gallery"><img src="data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=" data-src="https://images.example.com/shoes.jpg" width="700" height="700"></div></main></body></html>`,
    price: 59, currency: "USD", image: "https://images.example.com/shoes.jpg",
  },
  {
    name: "Large product image is found without a main element",
    html: `<html lang="en-US"><body><img src="https://images.example.com/logo.jpg" alt="Store logo" width="100" height="40"><div><h1>Coat</h1><span class="price">$120.00</span><img data-src="https://images.example.com/coat.jpg" width="600" height="800"></div></body></html>`,
    price: 120, currency: "USD", image: "https://images.example.com/coat.jpg",
  },
  {
    name: "Ordinary large product image beats a metadata logo",
    html: `<html lang="en-US"><head><meta property="og:image" content="https://images.example.com/logo.jpg"></head><body><main><h1>Desk</h1><span class="price">$219.00</span><img src="https://images.example.com/desk.jpg" width="800" height="800"></main></body></html>`,
    price: 219, currency: "USD", image: "https://images.example.com/desk.jpg",
  },
  {
    name: "Zara hero jeans image beats a related sweater thumbnail",
    html: `<html lang="da-DK"><body><main><section class="product-detail"><div class="product-detail-view"><img class="media-image__image" src="https://static.zara.net/assets/public/jeans.jpg" width="800" height="1000" style="width:800px;height:1000px"></div><div class="product-detail-info"><h1>BOOTCUT FIT LOW RISE JEANS MED SLID</h1><span class="money-amount__main">399,00 DKK</span></div><div class="complete-the-look"><img class="product-image" src="https://static.zara.net/assets/public/sweater.jpg" width="700" height="900" style="width:48px;height:48px"></div></section></main></body></html>`,
    price: 399, currency: "DKK", image: "https://static.zara.net/assets/public/jeans.jpg",
  },
  {
    name: "MaxGaming Pris class and relative product image source",
    html: `<html lang="da-DK"><body><main><span class="price">45 kr</span><h1>80HE Ghost ISO + BoW Keycaps</h1><a id="Zoomer"><figure class="mz-figure mz-hover-zoom"><img alt="Wooting 80HE Ghost ISO + BoW Keycaps" src="/img/bilder/artiklar/51436.jpg?m=1746629815&w=720" style="width:440px;height:352px"></figure></a><div id="PrisFalt"><span class="PrisBOLD">1929<span class="PrisBOLDnv"> kr</span></span><meta itemprop="price" content="1929"><meta itemprop="priceCurrency" content="DKK"></div><section class="related"><img class="product-image" src="/img/bilder/artiklar/accessory.jpg" style="width:80px;height:80px"><span class="price">45 kr</span></section></main></body></html>`,
    price: 1929, currency: "DKK", imagePath: "/img/bilder/artiklar/51436.jpg?m=1746629815&w=720",
  },
  {
    name: "Hidden itemprop price metadata remains readable",
    html: `<html lang="da-DK"><body><h1>Keyboard</h1><div><meta itemprop="price" content="1929"><meta itemprop="priceCurrency" content="DKK"></div></body></html>`,
    price: 1929, currency: "DKK",
  },
  {
    name: "Picture source supplies the product image",
    html: `<html lang="en-US"><body><main><h1>Coat</h1><span class="price">$89.00</span><div class="product-gallery"><picture><source srcset="https://images.example.com/coat-small.jpg 320w, https://images.example.com/coat-large.jpg 900w"><img src="data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=" width="800" height="800"></picture></div></main></body></html>`,
    price: 89, currency: "USD", image: "https://images.example.com/coat-large.jpg",
  },
  {
    name: "Product card rendered in an open shadow root",
    html: `<html lang="en-US"><body><product-detail></product-detail><script>const root = document.querySelector('product-detail').attachShadow({mode:'open'}); root.innerHTML = '<section class="product-info"><h1>Watch</h1><span class="price">$149.00</span><img class="product-image" src="https://images.example.com/watch.jpg" width="600" height="600"></section>';</script></body></html>`,
    price: 149, currency: "USD", image: "https://images.example.com/watch.jpg",
  },
  {
    name: "Background product media supplies an image",
    html: `<html lang="en-US"><body><main><h1>Lamp</h1><span class="price">$40.00</span><div class="product-media" style="background-image: url('https://images.example.com/lamp.jpg')"></div></main></body></html>`,
    price: 40, currency: "USD", image: "https://images.example.com/lamp.jpg",
  },
  {
    name: "Structured product image is a fallback",
    html: `<html lang="en-US"><body><h1>Table</h1><script type="application/ld+json">{"@type":"Product","image":{"url":"https://images.example.com/table.jpg"},"offers":{"price":"49.95","priceCurrency":"USD"}}</script></body></html>`,
    price: 49.95, currency: "USD", image: "https://images.example.com/table.jpg",
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
  {
    name: "Image is retained when price is not yet rendered",
    html: `<html lang="da-DK"><body><h1>Keyboard</h1><a id="Zoomer"><img src="/img/bilder/artiklar/51436.jpg" alt="Keyboard" style="width:440px;height:352px"></a></body></html>`,
    error: true, imagePath: "/img/bilder/artiklar/51436.jpg",
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
    const runner = `<pre id="droppr-result"></pre><script type="module">import { extractProduct } from "/scrape.js"; const injected = new Function("return (" + extractProduct.toString() + ")")(); document.querySelector("#droppr-result").textContent = btoa(JSON.stringify(injected()));</script>`
    response.end(fixture.html.replace("</body>", `${runner}</body>`))
  })
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve))
  try {
    for (const [index, fixture] of fixtures.entries()) {
      await t.test(fixture.name, async () => {
        const profile = await mkdtemp(join(tmpdir(), "droppr-test-"))
        try {
          const pageUrl = `http://127.0.0.1:${server.address().port}/${index}`
          const output = await runChrome(pageUrl, profile)
          const encoded = output.match(/<pre id="droppr-result">([^<]+)<\/pre>/)?.[1]
          assert.ok(encoded, `Scraper did not return a result: ${output.slice(-500)}`)
          const result = JSON.parse(Buffer.from(encoded, "base64").toString("utf8"))
          if (fixture.error) assert.ok(result.error)
          else {
            assert.equal(result.price, fixture.price, JSON.stringify(result))
            assert.equal(result.comparePrice, fixture.comparePrice, JSON.stringify(result))
            assert.equal(result.currency, fixture.currency, JSON.stringify(result))
            if (fixture.image) assert.equal(result.image, fixture.image, JSON.stringify(result))
          }
          if (fixture.imagePath) assert.equal(result.image, new URL(fixture.imagePath, pageUrl).href, JSON.stringify(result))
        } finally { await rm(profile, { recursive: true, force: true }) }
      })
    }
  } finally { server.close() }
})
