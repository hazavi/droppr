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
  // Strip currency symbols and non-numeric chars except dots and commas
  const cleaned = raw.replace(/[^0-9.,]/g, "").replace(/,(\d{2})$/, ".$1").replace(/,/g, "")
  const value = parseFloat(cleaned)
  return isNaN(value) ? null : value
}

function detectCurrency(text: string): string {
  if (text.includes("$")) return "USD"
  if (text.includes("€")) return "EUR"
  if (text.includes("£")) return "GBP"
  if (text.includes("¥")) return "JPY"
  if (text.includes("A$")) return "AUD"
  if (text.includes("C$")) return "CAD"
  if (text.includes("kr")) return "SEK"
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
      // Try to extract price using selector list
      let rawPrice: string | null = null
      let currency: string | null = null

      for (const selector of selectors) {
        const el = document.querySelector(selector)
        if (el && el.textContent?.trim()) {
          rawPrice = el.textContent.trim()
          break
        }
      }

      // Try structured data (JSON-LD) for price
      if (!rawPrice) {
        const jsonLd = document.querySelector('script[type="application/ld+json"]')
        if (jsonLd?.textContent) {
          try {
            const data = JSON.parse(jsonLd.textContent) as Record<string, unknown>
            const offers = (data.offers as Record<string, unknown>) ?? (data as Record<string, unknown>)
            if (offers?.price) rawPrice = String(offers.price)
            if (offers?.priceCurrency) currency = String(offers.priceCurrency)
          } catch {
            // ignore JSON parse errors
          }
        }
      }

      // Open Graph fallbacks
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

    const detectedCurrency = result.currency ?? detectCurrency(result.rawPrice)

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
