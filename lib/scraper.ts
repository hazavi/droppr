import type { ScrapeResult, ScrapeError } from "@/types"

const PRICE_SELECTORS = [
  // Standard HTML sale-price markup: <del> = original, <ins> = current/sale
  "ins [class*='price' i]",
  "ins",
  // Sale / discount class patterns (checked before generic price)
  "[class*='sale-price' i]",
  "[class*='price-sale' i]",
  "[class*='price__sale' i]",
  "[class*='current-price' i]",
  "[class*='final-price' i]",
  // Explicit test IDs (most reliable)
  "[data-testid*='price']",
  "[data-testid*='Price']",
  // Class-based — case-insensitive flag covers camelCase React components (ProductPrice etc.)
  "[class*='price' i]",
  // Microdata
  "[itemprop='price']",
  // Data attributes
  "[data-price]",
  "[data-product-price]",
  // Common class names
  ".pdp-price",
  ".product-price",
  ".sales-price",
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
    // Path-based locale segments — allow - or _ as separator (e.g. /da-dk/, /da_dk/, /nb-no/)
    if (/\/(?:dk|da|da[_-]dk|en[_-]dk)(\/|$|\?|#)/i.test(siteUrl)) return "DKK"
    if (/\/(?:no|nb|nb[_-]no|en[_-]no)(\/|$|\?|#)/i.test(siteUrl)) return "NOK"
    if (/\/(?:is|en[_-]is)(\/|$|\?|#)/i.test(siteUrl)) return "ISK"
    if (/\/(?:se|sv|sv[_-]se|en[_-]se)(\/|$|\?|#)/i.test(siteUrl)) return "SEK"
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
        "--window-size=1920,1080",
        "--disable-blink-features=AutomationControlled",
        "--lang=en-US,en",
      ],
    }

    if (executablePath) {
      launchOptions.executablePath = executablePath
    }

    browser = await puppeteer.launch(launchOptions)
    const page = await browser!.newPage()

    await page.setViewport({ width: 1920, height: 1080 })
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    )
    await page.setExtraHTTPHeaders({
      "Accept-Language": "en-US,en;q=0.9",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    })

    const response = await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    })

    // Detect hard blocks before doing any DOM work
    const httpStatus = response?.status() ?? 200
    if (httpStatus === 403 || httpStatus === 429) {
      return {
        error: true,
        reason: "blocked",
        message: "This site is blocking automated access. Try a different retailer or paste the price manually.",
      }
    }

    // For SPAs (React/Next.js etc.) wait for price content using two parallel strategies:
    // 1. price selector appears in DOM, OR 2. network goes idle (JS finished rendering)
    await Promise.race([
      page
        .waitForSelector(PRICE_SELECTORS.join(", "), { timeout: 15000 })
        .catch(() => {}),
      page
        .waitForNetworkIdle({ idleTime: 1000, timeout: 15000 })
        .catch(() => {}),
    ])

    const result = await page.evaluate((selectors: string[]) => {
      let rawPrice: string | null = null
      let currency: string | null = null

      // 1. Try CSS selectors — collect ALL matching elements across all selectors,
      //    then pick the minimum numeric price (handles sale pages where both the
      //    original struck-through price and the discounted price match the selector).
      const priceCandidates: string[] = []
      for (const selector of selectors) {
        for (const el of Array.from(document.querySelectorAll(selector))) {
          const content = (el as Element).getAttribute("content")?.trim()
          const dataPrice = (el as Element).getAttribute("data-price")?.trim()
          const text = (el as Element).textContent?.trim()
          const val = content ?? dataPrice ?? text ?? ""
          if (val) priceCandidates.push(val)
        }
      }
      if (priceCandidates.length > 0) {
        // Inline numeric parser — prioritises numbers with exactly 2 decimal places
        // (real prices like 179,00) over bare integers that may be percentages like 61.
        const parseNum = (s: string): number => {
          const text = s.replace(/\u00a0/g, " ")
          // First: look for a number with exactly 2 decimal digits — almost certainly a price
          const m = text.match(/\d[\d\s.,]*[.,]\d{2}(?!\d)/)
          if (m) {
            let n = m[0].replace(/\s/g, "").replace(/[.,]+$/, "")
            const lc = n.lastIndexOf(","), ld = n.lastIndexOf(".")
            if (lc !== -1 && ld !== -1) {
              n = lc > ld ? n.replace(/\./g, "").replace(",", ".") : n.replace(/,/g, "")
            } else if (lc !== -1) {
              n = n.replace(",", ".")
            }
            return parseFloat(n) || Infinity
          }
          // Fallback: any plain integer (handles currencies like JPY that have no cents)
          const fm = text.match(/\d+/)
          return fm ? parseFloat(fm[0]) : Infinity
        }
        // Drop pure percentage strings like "-61%" before comparing — they are not prices
        const filtered = priceCandidates.filter(c => !/^\s*-?\d{1,3}\s*%\s*$/.test(c))
        const pool = filtered.length > 0 ? filtered : priceCandidates
        // Choose the candidate with the lowest numeric value — that is the sale/final price
        rawPrice = pool.reduce((best, c) =>
          parseNum(c) < parseNum(best) ? c : best
        )
      }

      // 2. Always scan ALL JSON-LD blocks — use for currency regardless of whether
      //    CSS already found a price, and use for rawPrice/image as fallback if CSS missed it.
      let jsonLdImage: string | null = null
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
            // Extract image from schema (may be string or array)
            if (!jsonLdImage && schema.image) {
              const img = schema.image
              if (typeof img === "string") jsonLdImage = img
              else if (Array.isArray(img) && typeof img[0] === "string") jsonLdImage = img[0]
              else if (typeof img === "object" && (img as Record<string, unknown>).url) {
                jsonLdImage = String((img as Record<string, unknown>).url)
              }
            }
            if (rawPrice && currency) break outer
          }
        } catch {
          // ignore malformed JSON-LD
        }
      }

      // 3. Last-resort: text scan — walk TRUE leaf elements only.
      //    Two passes: first look for price+currency together, then accept pure price patterns.
      if (!rawPrice) {
        const priceWithCurrRe = /(?:[$€£¥₩₹]|kr\.?|DKK|NOK|SEK|USD|EUR|GBP)\s*[\d.,]+|[\d.,]+\s*(?:[$€£¥₩₹]|kr\.?|DKK|NOK|SEK|USD|EUR|GBP)/i
        // Matches "299,00" or "1.299" or "299.00" but not plain integers like "42" (size numbers)
        const purePriceRe = /^\d{1,6}[.,]\d{2}$|^\d{1,3}\.\d{3}$/
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT)
        let node = walker.nextNode() as Element | null
        let pureCandidate: string | null = null
        while (node) {
          if ((node as Element).children.length === 0) {
            const text = ((node as Element).textContent ?? "").trim()
            if (text.length > 0 && text.length < 40) {
              if (priceWithCurrRe.test(text)) { rawPrice = text; break }
              if (!pureCandidate && purePriceRe.test(text)) pureCandidate = text
            }
          }
          node = walker.nextNode() as Element | null
        }
        if (!rawPrice) rawPrice = pureCandidate
      }

      // 4. Open Graph fallbacks + product meta tags
      const pageTitle = document.title ?? ""
      const ogTitle =
        document.querySelector('meta[property="og:title"]')?.getAttribute("content") ??
        document.querySelector('meta[name="og:title"]')?.getAttribute("content") ??
        pageTitle

      // Image: try OG, Twitter card, JSON-LD schema, link[image_src], then largest <img>
      const rawOgImage =
        document.querySelector('meta[property="og:image"]')?.getAttribute("content") ??
        document.querySelector('meta[property="og:image:url"]')?.getAttribute("content") ??
        document.querySelector('meta[name="twitter:image"]')?.getAttribute("content") ??
        document.querySelector('meta[name="twitter:image:src"]')?.getAttribute("content") ??
        document.querySelector('link[rel="image_src"]')?.getAttribute("href") ??
        jsonLdImage ??
        null

      // If no meta image, fall back to the largest visible <img> on the page
      let ogImage = rawOgImage ?? ""
      if (!ogImage) {
        let bestImg = ""
        let bestArea = 0
        document.querySelectorAll("img[src]").forEach((el) => {
          const img = el as HTMLImageElement
          const src = img.getAttribute("src") ?? ""
          if (!src || src.startsWith("data:") || src.includes("logo") || src.includes("icon")) return
          const area = img.naturalWidth * img.naturalHeight || img.width * img.height
          if (area > bestArea) { bestArea = area; bestImg = src }
        })
        ogImage = bestImg
      }

      // Resolve protocol-relative URLs (//example.com/img.jpg)
      if (ogImage.startsWith("//")) ogImage = "https:" + ogImage

      // Facebook/Open Graph product meta — many Shopify/BigCommerce/Magento sites use these
      if (!rawPrice) {
        rawPrice = document.querySelector('meta[property="product:price:amount"]')?.getAttribute("content") ?? null
      }
      if (!currency) {
        currency = document.querySelector('meta[property="product:price:currency"]')?.getAttribute("content") ?? null
      }

      // 5. Compare-at / original price — look for struck-through price elements
      //    (<del> is the standard HTML element; many shops also use class names)
      const COMPARE_SELECTORS = [
        "del",
        "[class*='compare' i]",
        "[class*='original-price' i]",
        "[class*='price-old' i]",
        "[class*='old-price' i]",
        "[class*='price--old' i]",
        "[class*='was-price' i]",
        "[class*='regular-price' i]",
        "[class*='strikethrough' i]",
      ]
      let rawComparePrice: string | null = null
      for (const sel of COMPARE_SELECTORS) {
        for (const el of Array.from(document.querySelectorAll(sel))) {
          const t = (el.getAttribute("content") ?? el.textContent ?? "").trim()
          if (t && /\d/.test(t) && !/^\s*-?\d{1,3}\s*%\s*$/.test(t)) {
            rawComparePrice = t
            break
          }
        }
        if (rawComparePrice) break
      }

      // Detect block pages that serve 200 OK (e.g. Akamai, Cloudflare JS challenge)
      const isBlocked = /access denied|security check|checking your browser|just a moment|ddos-guard/i.test(pageTitle)

      return { rawPrice, rawComparePrice, currency, ogTitle, ogImage, isBlocked }
    }, PRICE_SELECTORS)

    const siteName = new URL(url).hostname.replace(/^www\./, "")

    if (result.isBlocked) {
      return {
        error: true,
        reason: "blocked",
        message: "This site is blocking automated access. Try a different retailer or paste the price manually.",
      }
    }

    if (!result.rawPrice) {
      return {
        error: true,
        reason: "parse_failed",
        message: "Could not find a price on this page. The site may use dynamic rendering or block scrapers.",
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
    const comparePrice = result.rawComparePrice ? parsePrice(result.rawComparePrice) ?? undefined : undefined

    return {
      name: result.ogTitle?.slice(0, 200) ?? "Unnamed product",
      image: result.ogImage ?? "",
      price,
      // Only include comparePrice when it's strictly higher than the sale price
      comparePrice: comparePrice !== undefined && comparePrice > price ? comparePrice : undefined,
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
