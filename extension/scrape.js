// This function runs inside a retailer's page. Keep it self-contained for executeScript.
export function extractProduct() {
  const text = (value) => String(value || "").trim()
  const meta = (key) => text(document.querySelector(`meta[property="${key}"],meta[name="${key}"]`)?.content)
  const normalizeCurrency = (value) => {
    const s = text(value).toUpperCase()
    if (/\b(DKK|DKR)\b|\bKR\b/.test(s)) return "DKK"
    if (/\bNOK\b/.test(s)) return "NOK"
    if (/\bSEK\b/.test(s)) return "SEK"
    if (/€|\bEUR\b/.test(s)) return "EUR"
    if (/£|\bGBP\b/.test(s)) return "GBP"
    if (/\$|\bUSD\b/.test(s)) return "USD"
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
  const candidates = [
    { value: offer?.price ?? offer?.priceSpecification?.price, currency: offer?.priceCurrency },
    { value: meta("product:price:amount"), currency: meta("product:price:currency") },
    ...['[itemprop="price"]', '[data-testid*="price"]', '[data-price]', '.product-price', '.price'].flatMap((selector) =>
      [...document.querySelectorAll(selector)].slice(0, 8).map((el) => ({ value: el.getAttribute("content") || el.getAttribute("data-price") || el.textContent, currency: el.getAttribute("content") ? "" : el.textContent }))
    ),
  ]
  const found = candidates.find((candidate) => parsePrice(candidate.value) !== null)
  if (!found) return { error: "No product price was found on this page. Try a product page with a visible price." }
  const image = product?.image
  const imageValue = Array.isArray(image) ? image[0] : typeof image === "object" ? image?.url : image
  const rawImage = text(imageValue || meta("og:image") || document.querySelector('meta[name="twitter:image"]')?.content)
  const title = text(product?.name || meta("og:title") || document.querySelector("h1")?.textContent || document.title).replace(/\s+/g, " ")
  const currency = normalizeCurrency(found.currency || offer?.priceCurrency || meta("product:price:currency") || found.value) || "USD"
  return {
    name: title || location.hostname,
    image: rawImage ? new URL(rawImage, location.href).href : "",
    price: parsePrice(found.value),
    currency,
    siteName: location.hostname.replace(/^www\./, ""),
    url: location.href,
  }
}
