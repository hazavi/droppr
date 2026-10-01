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
    const withoutDiscount = text(value).replace(/[-\u2212]?\d{1,3}(?:[.,]\d+)?\s*%/g, "")
    const match = withoutDiscount.replace(/\s/g, "").match(/\d[\d.,]*/)
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
  const priceSelector = '[itemprop="price"], [data-price], [data-price-amount], [data-product-price], [data-testid*="price"], [class*="price"], [class*="Price"], [class*="money-amount"], del, s, ins, del + *, s + *'
  const allPriceNodes = [...document.querySelectorAll(priceSelector)].slice(0, 400)
  const titleNode = document.querySelector("h1")
  let priceNodes = allPriceNodes
  // Keep prices in the same product-information region as the heading. This
  // prevents a cheaper recommendation card from becoming the product price.
  for (let parent = titleNode?.parentElement; parent && parent !== document.body; parent = parent.parentElement) {
    const nearby = allPriceNodes.filter((node) => parent.contains(node))
    if (nearby.length && nearby.length <= 40) { priceNodes = nearby; break }
  }
  const dom = priceNodes.map((el) => {
    const value = el.getAttribute("content") || el.getAttribute("data-price") || el.getAttribute("data-price-amount") || el.getAttribute("data-product-price") || el.getAttribute("aria-label") || el.textContent
    const nodes = [el, el.parentElement, el.parentElement?.parentElement].filter(Boolean)
    const context = nodes.map((node) => `${node.className || ""} ${node.id || ""} ${node.getAttribute("data-testid") || ""}`).join(" ")
    const old = !!el.closest("del, s") || /(?:old|original|compare|previous|regular|list|was|rrp)[-_ ]*(?:price|amount)|(?:price|amount)[-_ ]*(?:old|original|compare|previous|regular|list|rrp)|a-text-price|strikethrough|crossed/i.test(context)
    const current = !!el.closest("ins") || !!el.previousElementSibling?.matches("del, s") || /(?:sale|current|special|now|final|discounted|reduced)[-_ ]*(?:price|amount)|(?:price|amount)[-_ ]*(?:sale|current|special|now|final|discounted|reduced)|price-item--sale/i.test(context)
    const matches = text(value).match(/(?:[\u20AC\u00A3$]\s*\d[\d.,]*|\d[\d.,\s]*\s*(?:DKK|NOK|SEK|EUR|GBP|USD|CHF|CAD|AUD|kr\.?|\u20AC|\u00A3|\$))/gi) || []
    return {
      value,
      currency: currencyIn([el.getAttribute("data-currency"), el.textContent, el.getAttribute("aria-label")].join(" ")),
      source: "visible",
      old,
      current,
      compound: matches.length > 1,
      hidden: !!el.closest('[hidden], [aria-hidden="true"]') || (typeof getComputedStyle === "function" && getComputedStyle(el).display === "none"),
    }
  }).filter((candidate) => parsePrice(candidate.value) !== null && !candidate.hidden && !candidate.compound && !(/%/.test(text(candidate.value)) && !candidate.currency))

  // Some stores render sale prices without useful classes. Search the product title's
  // nearby text for the common "old price, discount %, new price" sequence.
  const bodyText = document.body?.innerText || ""
  const heading = text(titleNode?.innerText)
  const headingAt = heading ? bodyText.indexOf(heading) : -1
  const nearbyText = bodyText.slice(Math.max(0, headingAt), Math.max(0, headingAt) + 700)
  const amount = "(\\d[\\d.,\\s]*\\s*(?:DKK|NOK|SEK|EUR|GBP|USD|CHF|CAD|AUD|kr\\.?|\\u20AC|\\u00A3|\\$))"
  const saleMatch = nearbyText.match(new RegExp(`${amount}\\s*[-\\u2212]?\\s*\\d{1,3}\\s*%\\s*${amount}`, "i"))
  const salePair = saleMatch && parsePrice(saleMatch[1]) > parsePrice(saleMatch[2])
    ? { old: parsePrice(saleMatch[1]), current: parsePrice(saleMatch[2]), currency: currencyIn(saleMatch[2]) || currencyIn(saleMatch[1]) }
    : null

  // A current sale price wins over an old price, including stale structured data.
  const primary = [structured, openGraph].find((candidate) => parsePrice(candidate.value) !== null)
  const visibleOld = dom.find((candidate) => candidate.old)
  const visibleCurrent = dom.find((candidate) => candidate.current && !candidate.old)
  const visibleWithCurrency = dom.find((candidate) => candidate.currency && !candidate.old)
  const regularVisible = dom.find((candidate) => !candidate.old)
  const saleCandidate = salePair ? { value: salePair.current, currency: salePair.currency, source: "visible" } : null
  const discountText = text(titleNode?.parentElement?.parentElement?.innerText || nearbyText)
  const hasDiscount = /(?:^|\s)[-\u2212]\s*\d{1,3}\s*%|\b(?:sale|discount|rabat|reduceret|spar)\b/i.test(discountText)
  const distinct = dom.filter((candidate, index, list) => !candidate.old && list.findIndex((other) => !other.old && parsePrice(other.value) === parsePrice(candidate.value)) === index).slice(0, 3)
  const discounted = hasDiscount && distinct.length > 1 ? distinct.reduce((best, candidate) => parsePrice(candidate.value) < parsePrice(best.value) ? candidate : best) : null
  const found = visibleCurrent || (visibleOld && regularVisible && parsePrice(regularVisible.value) < parsePrice(visibleOld.value) ? regularVisible : null)
    || saleCandidate || discounted || regularVisible || primary
  if (!found) return { error: "No product price was found on this page. Try a product page with a visible price." }
  const currentPrice = parsePrice(found.value)
  const oldPrices = [salePair?.old, parsePrice(visibleOld?.value), parsePrice(primary?.value), ...(discounted ? distinct.map((candidate) => parsePrice(candidate.value)) : [])].filter((price) => price > currentPrice)
  const comparePrice = oldPrices.length ? Math.min(...oldPrices) : undefined

  const image = product?.image
  const imageValue = Array.isArray(image) ? image[0] : typeof image === "object" ? image?.url : image
  const rawImage = text(imageValue || meta("og:image") || document.querySelector('meta[name="twitter:image"]')?.content)
  const title = text(product?.name || meta("og:title") || document.querySelector("h1")?.textContent || document.title).replace(/\s+/g, " ")
  const localeOverridesUsd = localeCurrency && found.source !== "visible" && found.currency === "USD" && !visibleWithCurrency
  const currency = localeOverridesUsd ? localeCurrency : found.currency || visibleWithCurrency?.currency || localeCurrency || structured.currency || openGraph.currency || "USD"
  return {
    name: title || location.hostname,
    image: rawImage ? new URL(rawImage, location.href).href : "",
    price: currentPrice,
    comparePrice,
    currency,
    currencySource: localeOverridesUsd ? "locale" : found.currency || visibleWithCurrency?.currency ? "explicit" : localeCurrency ? "locale" : structured.currency || openGraph.currency ? "metadata" : "fallback",
    siteName: location.hostname.replace(/^www\./, ""),
    url: location.href,
  }
}
