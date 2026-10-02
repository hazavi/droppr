export const DEFAULT_LIST_ID = "watchlist"
import { EMAIL_RELAY_URL } from "./email-config.js"

export async function readStore() {
  const { lists, items, settings } = await chrome.storage.local.get(["lists", "items", "settings"])
  const savedSettings = settings || {}
  const emailToken = typeof savedSettings.emailVerified === "boolean" ? savedSettings.emailToken || "" : ""
  return {
    lists: Array.isArray(lists) && lists.length ? lists : [{ id: DEFAULT_LIST_ID, name: "My watchlist", createdAt: Date.now() }],
    items: Array.isArray(items) ? items : [],
    settings: { notifications: true, emailEnabled: false, emailAddress: "", ...savedSettings, emailEndpoint: EMAIL_RELAY_URL || savedSettings.emailEndpoint || "", emailToken, emailVerified: emailToken ? savedSettings.emailVerified === true : false },
  }
}

export async function saveStore(store) {
  await chrome.storage.local.set(store)
}

export function priceText(price, currency) {
  try { return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(price) }
  catch { return `${price.toFixed(2)} ${currency}` }
}

export function isDeal(item) { return item.currentPrice < item.originalPrice }

export function dropPercent(item) {
  return item.originalPrice > 0 ? Math.round((item.originalPrice - item.currentPrice) / item.originalPrice * 100) : 0
}

export function shouldAlert(item, oldPrice) {
  if (item.currentPrice >= oldPrice) return false
  if (item.alertType === "fixed") return item.currentPrice <= item.alertValue
  if (item.alertType === "percent") return dropPercent(item) >= item.alertValue
  return true
}

export function applyPriceResult(item, result, checkedAt = Date.now()) {
  if (result?.image) item.image = result.image
  if (!result || result.error || !Number.isFinite(result.price) || result.price <= 0) {
    return { ok: false, reason: result?.error || "Price not found on the product page" }
  }
  if (result.currency !== item.currency && result.currencySource !== "fallback") {
    return { ok: false, reason: `Page currency ${result.currency || "unknown"} differs from saved ${item.currency}` }
  }
  const previousPrice = item.currentPrice
  const previousOriginal = item.originalPrice
  item.currentPrice = result.price
  if (Number.isFinite(result.comparePrice) && result.comparePrice > item.originalPrice) item.originalPrice = result.comparePrice
  item.lastChecked = checkedAt
  item.lastError = ""
  const changed = Math.abs(previousPrice - item.currentPrice) > 0.001
  if (changed) item.history = [...(item.history || []), { price: item.currentPrice, at: checkedAt }].slice(-30)
  return { ok: true, changed, dealChanged: previousOriginal !== item.originalPrice, alert: shouldAlert(item, previousPrice) }
}

export function correctItem(item, { currentPrice, originalPrice, image }, correctedAt = Date.now()) {
  if (!Number.isFinite(currentPrice) || currentPrice <= 0 || !Number.isFinite(originalPrice) || originalPrice < currentPrice) {
    throw new Error("Enter valid current and regular prices")
  }
  item.currentPrice = currentPrice
  item.originalPrice = originalPrice
  item.image = image || ""
  item.history = [{ price: currentPrice, at: correctedAt }]
  item.lastChecked = correctedAt
  item.lastError = ""
}
