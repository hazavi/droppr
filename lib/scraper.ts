import type { ScrapeResult, ScrapeError } from "@/types"

const PRICE_SELECTORS = [
  "[data-testid*='price']",
  "[class*='price']",
  ".pdp-price",
  ".product-price",
  ".sales-price",
  "[itemprop='price']",
  "[data-price]",
  ".price",
]

function parsePrice(raw: string): number | null {
  // Normalise non-breaking space (\u00A0) used as thousands separator in Nordic locales
  const text = raw.replace(/\u00a0/g, " ")

  // Extract the first price token: digits optionally interleaved with separators (.,\s)
  // Stops before letters or other noise (e.g. "kr", "inkl.", "moms")
  const match = text.match(/\d+(?:[.,\s]\d+)*/)
  if (!match) return null

  // Remove any spaces used as thousand separators, strip trailing separators
  let s = match[0].replace(/\s/g, "").replace(/[.,]+$/, "")
  if (!s) return null

  const lastComma = s.lastIndexOf(",")
  const lastDot = s.lastIndexOf(".")

  if (lastComma !== -1 && lastDot !== -1) {
    if (lastComma > lastDot) {
      // European: "1.299,00" → 1299.00
      s = s.replace(/\./g, "").replace(",", ".")
    } else {
      // US: "1,299.00" → 1299.00
      s = s.replace(/,/g, "")
    }
  } else if (lastComma !== -1) {
    const decimals = s.length - lastComma - 1
    s = decimals <= 2 ? s.replace(",", ".") : s.replace(/,/g, "")
  } else if (lastDot !== -1) {
    const decimals = s.length - lastDot - 1
    // 3 digits after lone period → European thousands ("1.299" → 1299)
    if (decimals === 3) s = s.replace(/\./g, "")
  }

  const value = parseFloat(s)
  return isNaN(value) ? null : value
}

function detectCurrency(text: string, siteUrl = ""): string {
  const upper = text.toUpperCase()

  // ISO code check first — most reliable (e.g. "199 DKK", "DKK 199")
  const isoCodes = [
    "DKK", "NOK", "SEK", "ISK", "EUR", "GBP", "USD", "JPY", "AUD", "CAD",
    "CHF", "CNY", "HKD", "SGD", "NZD", "MXN", "BRL", "INR", "KRW", "TRY",
    "PLN", "CZK", "HUF", "RON", "ZAR", "RUB",
  ]
  for (const code of isoCodes) {
    if (upper.includes(code)) return code
  }

  // Symbol detection — more specific prefixes before generic "$"
  if (text.includes("A$") || text.includes("AU$")) return "AUD"
  if (text.includes("C$") || text.includes("CA$")) return "CAD"
  if (text.includes("NZ$")) return "NZD"
  if (text.includes("HK$")) return "HKD"
  if (text.includes("S$")) return "SGD"
  if (text.includes("$")) return "USD"
  if (text.includes("€")) return "EUR"
  if (text.includes("£")) return "GBP"
  if (text.includes("¥") || text.includes("￥")) return "JPY"
  if (text.includes("₩")) return "KRW"
  if (text.includes("₹")) return "INR"
  if (text.includes("₽")) return "RUB"
  if (text.includes("R$")) return "BRL"
  if (text.includes("₺")) return "TRY"
  if (text.includes("zł")) return "PLN"
  if (text.includes("Kč")) return "CZK"
  if (text.includes("Ft")) return "HUF"

  // "kr" — disambiguate by TLD first, then by locale path segment (e.g. asos.com/dk/, .com/no/)
  if (text.toLowerCase().includes("kr")) {
    // TLD checks
    if (/\.dk(\/|$|\?|#)/.test(siteUrl)) return "DKK"
    if (/\.no(\/|$|\?|#)/.test(siteUrl)) return "NOK"
    if (/\.is(\/|$|\?|#)/.test(siteUrl)) return "ISK"
    if (/\.se(\/|$|\?|#)/.test(siteUrl)) return "SEK"
    // Path-based locale segments (e.g. /dk/, /no/, /da-dk/, /nb-no/, /en-dk/)
    if (/\/(?:dk|da|da-dk|en-dk)(\/|$|\?|#)/i.test(siteUrl)) return "DKK"
    if (/\/(?:no|nb|nb-no|en-no)(\/|$|\?|#)/i.test(siteUrl)) return "NOK"
    if (/\/(?:is|en-is)(\/|$|\?|#)/i.test(siteUrl)) return "ISK"
    if (/\/(?:se|sv|sv-se|en-se)(\/|$|\?|#)/i.test(siteUrl)) return "SEK"
    return "SEK"
  }

  return "USD"
}

async function getChromiumExecutablePath(): Promise<string> {
  // In production (Vercel), use @sparticuz/chromium-min
  if (process.env.NODE_ENV === "production" || process.env.CHROMIUM_EXECUTABLE_PATH) {
    if (process.env.CHROMIUM_EXECUTABLE_PATH) {
      return process.env.CHROMIUM_EXECUTABLE_PATH
    }
    // Dynamic import to avoid build issues in dev
    const chromium = await import("@sparticuz/chromium-min")
    return await chromium.default.executablePath(
      `https://github.com/Sparticuz/chromium/releases/download/v131.0.1/chromium-v131.0.1-pack.tar`
    )
  }

  // Local dev: use system Chrome or Edge
  const paths = [
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium-browser",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  ]

  const fs = await import("fs")
  for (const p of paths) {
    if (fs.existsSync(p)) return p
  }

  // Fall back to puppeteer-core's bundled path if available
  return ""
}

export async function scrapeProduct(
  url: string
): Promise<ScrapeResult | ScrapeError> {
  let browser: import("puppeteer-core").Browser | undefined

  try {
    const { addExtra } = await import("puppeteer-extra")
    const puppeteerCore = await import("puppeteer-core")
    const StealthPlugin = await import("puppeteer-extra-plugin-stealth")

    const puppeteer = addExtra(puppeteerCore.default)
    puppeteer.use(StealthPlugin.default())

    const executablePath = await getChromiumExecutablePath()

    const launchOptions: import("puppeteer-core").LaunchOptions = {
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-accelerated-2d-canvas",
        "--no-first-run",
        "--no-zygote",
        "--disable-gpu",
      ],
    }

    if (executablePath) {
      launchOptions.executablePath = executablePath
    }

    browser = await puppeteer.launch(launchOptions)
    const page = await browser!.newPage()

    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    )

    await page.goto(url, {
      waitUntil: "load",
      timeout: 30000,
    })

    const result = await page.evaluate((selectors: string[]) => {
      let rawPrice: string | null = null
      let currency: string | null = null

      // 1. Try CSS selectors for raw price text
      //    Prefer machine-readable attributes over noisy textContent
      for (const selector of selectors) {
        const el = document.querySelector(selector)
        if (!el) continue
        // itemprop="price" often has a clean content attribute: <span itemprop="price" content="1195">
        const content = el.getAttribute("content")
        if (content?.trim()) { rawPrice = content.trim(); break }
        // data-price attribute (e.g. <div data-price="1195.00">)
        const dataPrice = el.getAttribute("data-price")
        if (dataPrice?.trim()) { rawPrice = dataPrice.trim(); break }
        // Fall back to visible text
        if (el.textContent?.trim()) { rawPrice = el.textContent.trim(); break }
      }

      // 2. Always scan ALL JSON-LD blocks — use for currency regardless of whether
      //    CSS already found a price, and use for rawPrice as fallback if CSS missed it.
      const jsonLdScripts = Array.from(
        document.querySelectorAll('script[type="application/ld+json"]')
      )
      outer: for (const script of jsonLdScripts) {
        if (!script.textContent) continue
        try {
          const parsed = JSON.parse(script.textContent) as unknown
          const schemas: Record<string, unknown>[] = Array.isArray(parsed)
            ? (parsed as Record<string, unknown>[])
            : [parsed as Record<string, unknown>]
          for (const schema of schemas) {
            const offers =
              (schema.offers as Record<string, unknown>) ??
              (schema as Record<string, unknown>)
            if (!rawPrice && offers?.price) rawPrice = String(offers.price)
            if (!currency && offers?.priceCurrency) currency = String(offers.priceCurrency)
            if (rawPrice && currency) break outer
          }
        } catch {
          // ignore malformed JSON-LD
        }
      }

      // 3. Open Graph fallbacks
      const ogTitle =
        document.querySelector('meta[property="og:title"]')?.getAttribute("content") ??
        document.querySelector('meta[name="og:title"]')?.getAttribute("content") ??
        document.title ??
        ""

      const ogImage =
        document.querySelector('meta[property="og:image"]')?.getAttribute("content") ??
        document.querySelector('meta[name="og:image"]')?.getAttribute("content") ??
        ""

      return { rawPrice, currency, ogTitle, ogImage }
    }, PRICE_SELECTORS)

    const siteName = new URL(url).hostname.replace(/^www\./, "")

    if (!result.rawPrice) {
      return {
        error: true,
        reason: "parse_failed",
        message: "Could not find a price on this page. The site may use dynamic rendering or is unsupported.",
      }
    }

    const price = parsePrice(result.rawPrice)
    if (price === null) {
      return {
        error: true,
        reason: "parse_failed",
        message: "Found a price element but could not parse a numeric value from it.",
      }
    }

    const detectedCurrency = result.currency ?? detectCurrency(result.rawPrice, url)

    return {
      name: result.ogTitle?.slice(0, 200) ?? "Unnamed product",
      image: result.ogImage ?? "",
      price,
      currency: detectedCurrency,
      siteName,
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)

    if (message.includes("timeout") || message.includes("Timeout")) {
      return { error: true, reason: "timeout", message: "The page took too long to load." }
    }

    if (
      message.includes("403") ||
      message.includes("blocked") ||
      message.includes("captcha")
    ) {
      return { error: true, reason: "blocked", message: "The site blocked the scraper." }
    }

    return { error: true, reason: "parse_failed", message }
  } finally {
    await browser?.close()
  }
}
