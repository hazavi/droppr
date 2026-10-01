// This function runs inside a retailer's page. Keep it self-contained for executeScript.
export function extractProduct() {
  const text = (value) => String(value || "").trim()
  const meta = (key) => text(document.querySelector(`meta[property="${key}"],meta[name="${key}"]`)?.content)
  const locale = [document.documentElement.lang, meta("og:locale"), location.hostname, location.pathname].join(" ").toLowerCase()
  const localeCurrency = /(?:^|[^a-z])(?:da(?:[-_]|\b)|dk(?:[-_.\/]|\b))/.test(locale) ? "DKK"
    : /(?:^|[^a-z])(?:nb(?:[-_]|\b)|nn(?:[-_]|\b)|no(?:[-_.\/]|\b))/.test(locale) ? "NOK"
    : /(?:^|[^a-z])(?:sv(?:[-_]|\b)|se(?:[-_.\/]|\b))/.test(locale) ? "SEK"
    : ""

  const currencyIn = (value) => {
    const s = text(value).toUpperCase()
    if (/\b(?:DKK|DKR)\b/.test(s)) return "DKK"
    if (/\bNOK\b/.test(s)) return "NOK"
    if (/\bSEK\b/.test(s)) return "SEK"
    if (/\bEUR\b|\u20AC/.test(s)) return "EUR"
    if (/\bGBP\b|\u00A3/.test(s)) return "GBP"
    if (/\bCHF\b/.test(s)) return "CHF"
    if (/\bCAD\b|CA\$/.test(s)) return "CAD"
    if (/\bAUD\b|AU\$|A\$/.test(s)) return "AUD"
    if (/\bUSD\b|US\$/.test(s)) return "USD"
    if (/(?:^|[^A-Z])KR\.?\b/.test(s)) return localeCurrency || "DKK"
    if (/\$/.test(s)) return "USD"
    return ""
  }
  const parsePrice = (value) => {
    const match = text(value).replace(/\s/g, "").match(/\d[\d.,]*/)
    if (!match) return null
    let n = match[0]
    const comma = n.lastIndexOf(","), dot = n.lastIndexOf(".")
    if (comma >= 0 && dot >= 0) n = comma > dot ? n.replace(/\./g, "").replace(",", ".") : n.replace(/,/g, "")
    else if (comma >= 0) n = /,\d{1,2}$/.test(n) ? n.replace(/\./g, "").replace(",", ".") : n.replace(/,/g, "")
    else if (dot >= 0 && /\.\d{3}$/.test(n)) n = n.replace(/\./g, "")
    const price = Number(n)
    return Number.isFinite(price) && price > 0 ? price : null
  }
  const flatten = (obj) => {
    if (!obj || typeof obj !== "object") return []
    if (Array.isArray(obj)) return obj.flatMap(flatten)
    return [obj, ...flatten(obj["@graph"])]
  }
  const schemas = [...document.querySelectorAll('script[type="application/ld+json"]')].flatMap((el) => {
    try { return flatten(JSON.parse(el.textContent || "")) } catch { return [] }
  })
  const product = schemas.find((s) => String(s["@type"] || "").toLowerCase().includes("product"))
  const offer = Array.isArray(product?.offers) ? product.offers[0] : product?.offers
  const structured = { value: offer?.price ?? offer?.priceSpecification?.price, currency: currencyIn(offer?.priceCurrency || offer?.priceSpecification?.priceCurrency), source: "structured" }
  const openGraph = { value: meta("product:price:amount"), currency: currencyIn(meta("product:price:currency")), source: "metadata" }
  const dom = ['[itemprop="price"]', '[data-testid*="price"]', '[data-price]', '.product-price', '.price'].flatMap((selector) =>
    [...document.querySelectorAll(selector)].slice(0, 8).map((el) => ({
      value: el.getAttribute("content") || el.getAttribute("data-price") || el.textContent,
      currency: currencyIn([el.getAttribute("data-currency"), el.getAttribute("content") ? el.textContent : "", el.textContent].join(" ")),
      source: "visible",
    }))
  ).filter((candidate) => parsePrice(candidate.value) !== null)

  // A visible, currency-marked price wins when structured data disagrees with the page.
  const primary = [structured, openGraph].find((candidate) => parsePrice(candidate.value) !== null)
  const visibleWithCurrency = dom.find((candidate) => candidate.currency)
  const found = visibleWithCurrency && (!primary || !primary.currency || primary.currency !== visibleWithCurrency.currency)
    ? visibleWithCurrency
    : primary || dom[0]
  if (!found) return { error: "No product price was found on this page. Try a product page with a visible price." }

  const image = product?.image
  const imageValue = Array.isArray(image) ? image[0] : typeof image === "object" ? image?.url : image
  const rawImage = text(imageValue || meta("og:image") || document.querySelector('meta[name="twitter:image"]')?.content)
  const title = text(product?.name || meta("og:title") || document.querySelector("h1")?.textContent || document.title).replace(/\s+/g, " ")
  const localeOverridesUsd = localeCurrency && found.source !== "visible" && found.currency === "USD" && !visibleWithCurrency
  const currency = localeOverridesUsd ? localeCurrency : found.currency || visibleWithCurrency?.currency || localeCurrency || structured.currency || openGraph.currency || "USD"
  return {
    name: title || location.hostname,
    image: rawImage ? new URL(rawImage, location.href).href : "",
    price: parsePrice(found.value),
    currency,
    currencySource: localeOverridesUsd ? "locale" : found.currency || visibleWithCurrency?.currency ? "explicit" : localeCurrency ? "locale" : structured.currency || openGraph.currency ? "metadata" : "fallback",
    siteName: location.hostname.replace(/^www\./, ""),
    url: location.href,
  }
}
