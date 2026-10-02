// This function runs inside a retailer's page. Keep it self-contained for executeScript.
export function extractProduct() {
  const text = (value) => String(value || "").trim()
  const meta = (key) => text(document.querySelector(`meta[property="${key}"],meta[name="${key}"]`)?.content)
  const roots = [document]
  for (let index = 0; index < roots.length && index < 50; index++) {
    for (const element of roots[index].querySelectorAll("*")) if (element.shadowRoot) roots.push(element.shadowRoot)
  }
  const queryAll = (selector) => roots.flatMap((root) => [...root.querySelectorAll(selector)])
  const locale = [document.documentElement.lang, meta("og:locale"), location.hostname, location.pathname].join(" ").toLowerCase()
  const localeCurrency = /(?:^|[^a-z])(?:da(?:[-_]|\b)|dk(?:[-_.\/]|\b))/.test(locale) ? "DKK"
    : /(?:^|[^a-z])(?:nb(?:[-_]|\b)|nn(?:[-_]|\b)|no(?:[-_.\/]|\b))/.test(locale) ? "NOK"
    : /(?:^|[^a-z])(?:sv(?:[-_]|\b)|se(?:[-_.\/]|\b))/.test(locale) ? "SEK"
    : ""

  const currencyIn = (value) => {
    const s = text(value).toUpperCase()
    if (/(?:^|[^A-Z])(?:DKK|DKR)(?=$|[^A-Z])/.test(s)) return "DKK"
    if (/(?:^|[^A-Z])NOK(?=$|[^A-Z])/.test(s)) return "NOK"
    if (/(?:^|[^A-Z])SEK(?=$|[^A-Z])/.test(s)) return "SEK"
    if (/(?:^|[^A-Z])EUR(?=$|[^A-Z])|\u20AC/.test(s)) return "EUR"
    if (/(?:^|[^A-Z])GBP(?=$|[^A-Z])|\u00A3/.test(s)) return "GBP"
    if (/(?:^|[^A-Z])CHF(?=$|[^A-Z])/.test(s)) return "CHF"
    if (/(?:^|[^A-Z])CAD(?=$|[^A-Z])|CA\$/.test(s)) return "CAD"
    if (/(?:^|[^A-Z])AUD(?=$|[^A-Z])|AU\$|A\$/.test(s)) return "AUD"
    if (/(?:^|[^A-Z])USD(?=$|[^A-Z])|US\$/.test(s)) return "USD"
    if (/(?:^|[^A-Z])KR\.?(?=$|[^A-Z])/.test(s)) return localeCurrency || "DKK"
    if (/\$/.test(s)) return "USD"
    return ""
  }
  const parsePrice = (value) => {
    const withoutDiscount = text(value).replace(/[-\u2212]?\d{1,3}(?:[.,]\d+)?\s*%/g, "")
    const prefix = withoutDiscount.match(/(?:DKK|NOK|SEK|EUR|GBP|USD|CHF|CAD|AUD|kr\.?|\u20AC|\u00A3|\$)\s*(\d[\d.,\s]*)/i)
    const suffix = withoutDiscount.match(/(\d[\d.,\s]*)\s*(?:DKK|NOK|SEK|EUR|GBP|USD|CHF|CAD|AUD|kr\.?|\u20AC|\u00A3|\$)/i)
    const match = (prefix?.[1] || suffix?.[1] || withoutDiscount).replace(/\s/g, "").match(/\d[\d.,]*/)
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
  const microdata = { value: queryAll('[itemprop="price"][content]')[0]?.getAttribute("content"), currency: currencyIn(queryAll('[itemprop="priceCurrency"][content]')[0]?.getAttribute("content")), source: "metadata" }
  const priceSelector = '[itemprop="price"], [data-price], [data-price-amount], [data-product-price], [data-testid*="price"], [class*="price"], [class*="Price"], [class*="pris"], [class*="Pris"], [class*="preis"], [class*="Preis"], [class*="prix"], [class*="Prix"], [class*="precio"], [class*="Precio"], [class*="prezzo"], [class*="Prezzo"], [class*="money-amount"], .a-price .a-offscreen, del, s, ins, del + *, s + *'
  const allPriceNodes = queryAll(priceSelector).slice(0, 400)
  const nodePriceText = (el) => {
    const accessible = el.querySelector(".a-offscreen")?.textContent
    const visible = text(el.textContent)
    const labelled = el.getAttribute("aria-label")
    if (accessible && parsePrice(accessible) !== null) return accessible
    if (visible && currencyIn(visible) && parsePrice(visible) !== null) return visible
    if (labelled && currencyIn(labelled) && parsePrice(labelled) !== null) return labelled
    if (visible && /^[\d\s.,]+$/.test(visible) && parsePrice(visible) !== null) return visible
    return el.getAttribute("content") || el.getAttribute("data-price") || el.getAttribute("data-price-amount") || el.getAttribute("data-product-price") || visible || labelled
  }
  const titleNode = queryAll("h1").find((node) => text(node.innerText) && !node.closest('[hidden], [aria-hidden="true"]') && (typeof getComputedStyle !== "function" || getComputedStyle(node).display !== "none")) || queryAll("h1")[0]
  let priceNodes = allPriceNodes
  // Keep prices in the same product-information region as the heading. This
  // prevents a cheaper recommendation card from becoming the product price.
  for (let parent = titleNode?.parentElement; parent && parent !== document.body; parent = parent.parentElement) {
    const nearby = allPriceNodes.filter((node) => parent.contains(node))
    if (nearby.length && nearby.length <= 40 && nearby.some((node) => parsePrice(nodePriceText(node)) !== null)) { priceNodes = nearby; break }
  }
  const dom = priceNodes.map((el) => {
    const value = nodePriceText(el)
    const nodes = [el, el.parentElement, el.parentElement?.parentElement].filter(Boolean)
    const context = nodes.map((node) => `${node.className || ""} ${node.id || ""} ${node.getAttribute("data-testid") || ""}`).join(" ")
    const localContext = nodes.slice(0, 2).map((node) => `${node.className || ""} ${node.id || ""} ${node.getAttribute("data-testid") || ""}`).join(" ")
    const old = !!el.closest("del, s") || /(?:old|original|compare|previous|regular|list|was|rrp)[-_ ]*(?:price|amount)|(?:price|amount)[-_ ]*(?:old|original|compare|previous|regular|list|rrp)|a-text-price|strikethrough|crossed/i.test(context)
    const current = !!el.closest("ins") || !!el.previousElementSibling?.matches("del, s") || /(?:sale|current|special|now|final|discounted|reduced)[-_ ]*(?:price|amount)|(?:price|amount)[-_ ]*(?:sale|current|special|now|final|discounted|reduced)|price-item--sale|priceToPay/i.test(context)
    const matches = text(value).match(/(?:[\u20AC\u00A3$]\s*\d[\d.,]*|\d[\d.,\s]*\s*(?:DKK|NOK|SEK|EUR|GBP|USD|CHF|CAD|AUD|kr\.?|\u20AC|\u00A3|\$))/gi) || []
    return {
      value,
      currency: currencyIn([el.getAttribute("data-currency"), el.textContent, el.getAttribute("aria-label")].join(" ")),
      source: "visible",
      old,
      current,
      compound: matches.length > 1,
      ancillary: /(?:shipping|delivery|unit[-_ ]?price|price[-_ ]?per[-_ ]?unit|installment|monthly|per[-_ ]?month|coupon|saving|tax[-_ ]?amount)/i.test(localContext),
      hidden: !!el.closest('[hidden], [aria-hidden="true"]') || (typeof getComputedStyle === "function" && getComputedStyle(el).display === "none"),
    }
  }).filter((candidate) => parsePrice(candidate.value) !== null && !candidate.hidden && !candidate.compound && !candidate.ancillary && !(/%/.test(text(candidate.value)) && !candidate.currency))

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
  const primary = [microdata, structured, openGraph].find((candidate) => parsePrice(candidate.value) !== null)
  const visibleOld = dom.find((candidate) => candidate.old)
  const visibleCurrent = dom.find((candidate) => candidate.current && !candidate.old)
  const visibleWithCurrency = dom.find((candidate) => candidate.currency && !candidate.old)
  const regularVisible = dom.find((candidate) => !candidate.old)
  const saleCandidate = salePair ? { value: salePair.current, currency: salePair.currency, source: "visible" } : null
  const discountText = text(titleNode?.parentElement?.parentElement?.innerText || nearbyText)
  const hasDiscount = /(?:^|\s)[-\u2212]\s*\d{1,3}\s*%|\b(?:sale|discount|rabat|reduceret|spar)\b/i.test(discountText)
  const distinct = dom.filter((candidate, index, list) => !candidate.old && list.findIndex((other) => !other.old && parsePrice(other.value) === parsePrice(candidate.value)) === index).slice(0, 3)
  const discounted = hasDiscount && distinct.length > 1 ? distinct.reduce((best, candidate) => parsePrice(candidate.value) < parsePrice(best.value) ? candidate : best) : null
  const matchingStructured = primary && dom.find((candidate) => !candidate.old && Math.abs(parsePrice(candidate.value) - parsePrice(primary.value)) < 0.001)
  const found = visibleCurrent || (visibleOld && regularVisible && parsePrice(regularVisible.value) < parsePrice(visibleOld.value) ? regularVisible : null)
    || saleCandidate || discounted || matchingStructured || regularVisible || primary
  if (!found) return { error: "No product price was found on this page. Try a product page with a visible price." }
  const currentPrice = parsePrice(found.value)
  const oldPrices = [salePair?.old, parsePrice(visibleOld?.value), parsePrice(primary?.value), ...(discounted ? distinct.map((candidate) => parsePrice(candidate.value)) : [])].filter((price) => price > currentPrice && price / currentPrice <= 10)
  const comparePrice = oldPrices.length ? Math.min(...oldPrices) : undefined

  const title = text(product?.name || meta("og:title") || titleNode?.textContent || document.title).replace(/\s+/g, " ")
  const images = []
  const addImage = (raw, score) => {
    const value = text(raw)
    if (!value || /^(?:data:|blob:|javascript:)/i.test(value) || /placeholder|transparent|pixel|spinner|loading(?:[._-]|$)|(?:^|[/_-])logo(?:[/_.-]|$)/i.test(value)) return
    try {
      const url = new URL(value, location.href)
      if (/^https?:$/.test(url.protocol) && !/\.svg(?:$|\?)/i.test(url.pathname)) images.push({ url: url.href, score })
    } catch { /* Ignore malformed image URLs. */ }
  }
  for (const imageObject of (Array.isArray(product?.image) ? product.image : [product?.image])) {
    addImage(typeof imageObject === "object" ? imageObject?.url || imageObject?.contentUrl : imageObject, 100)
  }
  addImage(meta("og:image") || meta("og:image:url"), 90)
  addImage(meta("twitter:image"), 80)

  const imageSelectors = '#landingImage, #imgTagWrapperId img, img[itemprop="image"], [data-testid*="product-image"] img, img[data-testid*="product-image"], [class*="product-gallery"] img, img[class*="gallery"] img, img[class*="gallery"], [class*="product-media"] img, [class*="product__media"] img, [class*="product-image"] img, img[class*="product-image"], #Zoomer img, .mz-figure img, figure img, main img, img'
  const titleWords = new Set(title.toLowerCase().match(/[\p{L}\p{N}]{3,}/gu) || [])
  for (const img of queryAll(imageSelectors).slice(0, 500)) {
    if (img.closest('[hidden], [aria-hidden="true"]')) continue
    if (/logo|avatar|sprite|icon|banner|tracking|pixel/i.test(`${img.className || ""} ${img.getAttribute("alt") || ""}`)) continue
    const width = img.naturalWidth || Number(img.getAttribute("width")) || img.width || 0
    const height = img.naturalHeight || Number(img.getAttribute("height")) || img.height || 0
    const rect = img.getBoundingClientRect()
    const productImage = img.matches('#landingImage, #imgTagWrapperId img, img[itemprop="image"], [data-testid*="product-image"] img, img[data-testid*="product-image"], [class*="product-gallery"] img, img[class*="gallery"], [class*="product-media"] img, [class*="product__media"] img, [class*="product-image"] img, img[class*="product-image"], #Zoomer img, .mz-figure img')
    if (!productImage && width && height && (width < 140 || height < 140)) continue
    const context = [img.parentElement, img.parentElement?.parentElement, img.parentElement?.parentElement?.parentElement]
      .map((node) => `${node?.className || ""} ${node?.id || ""}`).join(" ")
    const related = /recommend|related|cross[-_ ]?sell|complete[-_ ]?the[-_ ]?look|look[-_ ]?perfect/i.test(context)
    const displayedSize = Math.min(rect.width, rect.height)
    const altWords = new Set(text(img.getAttribute("alt")).toLowerCase().match(/[\p{L}\p{N}]{3,}/gu) || [])
    const matchingWords = [...titleWords].filter((word) => altWords.has(word)).length
    const score = (productImage ? 115 : img.closest("main") ? 70 : 45)
      + Math.min(25, Math.floor(Math.min(width, height) / 30))
      + Math.min(100, Math.floor(displayedSize / 7))
      + (titleWords.size >= 2 && matchingWords >= 2 ? Math.min(90, matchingWords * 18) : 0)
      - (related ? 100 : 0)
      - (rect.width === 0 || rect.height === 0 ? 80 : 0)
    const dynamic = img.getAttribute("data-a-dynamic-image")
    if (dynamic) {
      try {
        const entries = Object.entries(JSON.parse(dynamic)).sort((a, b) => (b[1]?.[0] || 0) * (b[1]?.[1] || 0) - (a[1]?.[0] || 0) * (a[1]?.[1] || 0))
        addImage(entries[0]?.[0], score + 6)
      } catch { /* Other stores may use a different data format. */ }
    }
    addImage(img.getAttribute("data-old-hires") || img.getAttribute("data-zoom-image") || img.getAttribute("data-zoom-src") || img.getAttribute("data-original") || img.getAttribute("data-full"), score + 5)
    addImage(img.getAttribute("data-src") || img.getAttribute("data-lazy-src") || img.getAttribute("data-image") || img.getAttribute("data-fallback-src"), score + 3)
    addImage(img.currentSrc || img.getAttribute("src"), score)
    const srcset = img.getAttribute("data-srcset") || img.getAttribute("srcset")
    if (srcset) addImage(srcset.split(",").at(-1)?.trim().split(/\s+/)[0], score + 1)
    for (const source of img.parentElement?.matches("picture") ? img.parentElement.querySelectorAll("source") : []) {
      const sourceSet = source.getAttribute("data-srcset") || source.getAttribute("srcset")
      if (sourceSet) addImage(sourceSet.split(",").at(-1)?.trim().split(/\s+/)[0], score + 4)
    }
  }
  for (const element of queryAll('[class*="product-image"], [class*="product-media"], [class*="gallery"], [data-testid*="product-image"]').slice(0, 100)) {
    const background = typeof getComputedStyle === "function" ? getComputedStyle(element).backgroundImage : ""
    const match = background.match(/url\(["']?([^"')]+)["']?\)/)
    if (match) addImage(match[1], 115)
  }
  images.sort((a, b) => b.score - a.score)
  const localeOverridesUsd = localeCurrency && found.source !== "visible" && found.currency === "USD" && !visibleWithCurrency
  const currency = localeOverridesUsd ? localeCurrency : found.currency || visibleWithCurrency?.currency || localeCurrency || microdata.currency || structured.currency || openGraph.currency || "USD"
  return {
    name: title || location.hostname,
    image: images[0]?.url || "",
    price: currentPrice,
    comparePrice,
    currency,
    currencySource: localeOverridesUsd ? "locale" : found.currency || visibleWithCurrency?.currency ? "explicit" : localeCurrency ? "locale" : microdata.currency || structured.currency || openGraph.currency ? "metadata" : "fallback",
    siteName: location.hostname.replace(/^www\./, ""),
    url: location.href,
  }
}
