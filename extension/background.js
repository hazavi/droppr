import { extractProduct } from "./scrape.js"
import { readStore, saveStore, priceText, applyPriceResult } from "./store.js"

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
    let latest
    for (let attempt = 0; attempt < 3; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, 1800))
      const [result] = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: extractProduct })
      if (result?.result && !result.result.error && (!latest || result.result.image || !latest.image)) latest = result.result
      if (latest?.comparePrice > latest?.price && latest.image) break
    }
    return latest
  } finally {
    if (tab.id) await chrome.tabs.remove(tab.id).catch(() => {})
  }
}

let checking = false
async function notifyPriceDrop(item) {
  await chrome.notifications.create(`droppr-${item.id}-${Date.now()}`, {
    type: "basic", iconUrl: "icons/droppr.png", title: "Price dropped on Droppr",
    message: `${item.name} is now ${priceText(item.currentPrice, item.currency)}`,
  })
}

async function checkPrices() {
  if (checking) return { busy: true, checked: 0, updated: 0, failed: 0 }
  checking = true
  const summary = { checked: 0, updated: 0, failed: 0 }
  try {
    const initial = await readStore()
    for (const item of initial.items) {
      let failure = ""
      try {
        const origin = new URL(item.url).origin + "/*"
        if (!(await chrome.permissions.contains({ origins: [origin] }))) {
          failure = "Site access missing. Open this product and refresh it in Droppr."
          continue
        }
        const result = await readInTab(item.url)
        const store = await readStore()
        const current = store.items.find((entry) => entry.id === item.id)
        if (!current) continue
        const applied = applyPriceResult(current, result)
        if (!applied.ok) { failure = applied.reason; continue }
        await saveStore(store)
        summary.checked++
        if (applied.changed) summary.updated++
        if (store.settings.notifications && applied.alert) {
          await notifyPriceDrop(current)
        }
      } catch (error) {
        failure = error instanceof Error ? error.message : "Could not load product page"
        console.warn("Droppr check failed:", item.url, error)
      } finally {
        if (failure) {
          summary.failed++
          const store = await readStore()
          const current = store.items.find((entry) => entry.id === item.id)
          if (current) { current.lastError = failure; await saveStore(store) }
        }
      }
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
  if (message?.type === "PRICE_DROP" && typeof message.id === "string") {
    readStore().then(async (store) => {
      const item = store.items.find((entry) => entry.id === message.id)
      if (item && store.settings.notifications) await notifyPriceDrop(item)
      respond({ ok: true })
    }).catch((error) => respond({ error: error.message }))
    return true
  }
})
chrome.notifications.onClicked.addListener(async () => { try { await chrome.action.openPopup() } catch { /* The browser may require a direct user gesture. */ } })
