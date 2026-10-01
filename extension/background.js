import { extractProduct } from "./scrape.js"
import { readStore, saveStore, priceText, shouldAlert } from "./store.js"

const ALARM = "droppr-price-check"

async function ensureAlarm() {
  if (!(await chrome.alarms.get(ALARM))) await chrome.alarms.create(ALARM, { periodInMinutes: 360 })
}

chrome.runtime.onInstalled.addListener(ensureAlarm)
chrome.runtime.onStartup.addListener(ensureAlarm)

async function readInTab(url) {
  const tab = await chrome.tabs.create({ url, active: false })
  try {
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => { chrome.tabs.onUpdated.removeListener(listener); reject(new Error("Page timed out")) }, 30000)
      const listener = (id, change) => {
        if (id === tab.id && change.status === "complete") {
          clearTimeout(timer)
          chrome.tabs.onUpdated.removeListener(listener)
          resolve()
        }
      }
      chrome.tabs.onUpdated.addListener(listener)
      if (tab.status === "complete") { clearTimeout(timer); chrome.tabs.onUpdated.removeListener(listener); resolve() }
    })
    await new Promise((resolve) => setTimeout(resolve, 1200))
    const [result] = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: extractProduct })
    return result?.result
  } finally {
    if (tab.id) await chrome.tabs.remove(tab.id).catch(() => {})
  }
}

let checking = false
async function checkPrices() {
  if (checking) return { checked: 0, updated: 0 }
  checking = true
  const summary = { checked: 0, updated: 0 }
  try {
    const initial = await readStore()
    for (const item of initial.items) {
      try {
        const origin = new URL(item.url).origin + "/*"
        if (!(await chrome.permissions.contains({ origins: [origin] }))) continue
        const result = await readInTab(item.url)
        if (!result || result.error || !Number.isFinite(result.price) || result.currency !== item.currency) continue
        summary.checked++
        const store = await readStore()
        const current = store.items.find((entry) => entry.id === item.id)
        if (!current) continue
        const oldPrice = current.currentPrice
        current.currentPrice = result.price
        current.lastChecked = Date.now()
        current.history = [...(current.history || []), { price: result.price, at: Date.now() }].slice(-30)
        await saveStore(store)
        if (Math.abs(oldPrice - result.price) > 0.001) summary.updated++
        if (store.settings.notifications && shouldAlert(current, oldPrice)) {
          await chrome.notifications.create(`droppr-${current.id}-${Date.now()}`, {
            type: "basic", iconUrl: "icons/droppr.png", title: "Price dropped on Droppr",
            message: `${current.name} is now ${priceText(current.currentPrice, current.currency)}`,
          })
        }
      } catch (error) { console.warn("Droppr check failed:", item.url, error) }
    }
  } finally { checking = false }
  return summary
}

chrome.alarms.onAlarm.addListener((alarm) => { if (alarm.name === ALARM) void checkPrices() })
chrome.runtime.onMessage.addListener((message, _sender, respond) => {
  if (message?.type === "CHECK_PRICES") {
    checkPrices().then(respond).catch((error) => respond({ error: error.message }))
    return true
  }
})
chrome.notifications.onClicked.addListener(async () => { try { await chrome.action.openPopup() } catch { /* The browser may require a direct user gesture. */ } })
