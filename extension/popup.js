import { extractProduct } from "./scrape.js"
import { readStore, saveStore, priceText, isDeal, dropPercent, applyPriceResult, DEFAULT_LIST_ID } from "./store.js"

const view = document.querySelector("#view")
const nav = document.querySelector(".dock")
const refresh = document.querySelector("#refresh")
let store = await readStore()
let page = "home"
let selectedList = null
let product = null
let currentTab = null
let notice = ""

const safe = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char])
const productUrl = (url) => { try { const parsed = new URL(url); return /^https?:$/.test(parsed.protocol) ? parsed : null } catch { return null } }
const alertLabel = (item) => item.alertType === "fixed" ? `Below ${priceText(item.alertValue, item.currency)}` : item.alertType === "percent" ? `${item.alertValue}% drop` : "Any drop"
const currencies = ["DKK", "NOK", "SEK", "EUR", "GBP", "USD", "CHF", "CAD", "AUD"]
const currencyOptions = (selected) => [...new Set([selected, ...currencies])].map((code) => `<option value="${safe(code)}" ${code === selected ? "selected" : ""}>${safe(code)}</option>`).join("")
const samePage = (left, right) => {
  const a = productUrl(left), b = productUrl(right)
  return !!a && !!b && a.origin === b.origin && a.pathname.replace(/\/$/, "") === b.pathname.replace(/\/$/, "") && (!a.searchParams.get("v1") || !b.searchParams.get("v1") || a.searchParams.get("v1") === b.searchParams.get("v1"))
}
const trackedOnCurrentTab = () => store.items.find((item) => currentTab && samePage(item.url, currentTab.url))

async function activeTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  currentTab = tab && productUrl(tab.url) ? tab : null
}
await activeTab()

function itemCard(item) {
  const prices = (item.history || []).map((point) => Number(point.price)).filter(Number.isFinite)
  const low = Math.min(...prices), high = Math.max(...prices)
  const points = prices.map((price, index) => `${Math.round(index * 58 / Math.max(1, prices.length - 1))},${Math.round(24 - (price - low) * 19 / Math.max(0.01, high - low))}`).join(" ")
  return `<article class="item glass">
    <div class="item-image">${item.image ? `<img src="${safe(item.image)}" alt="" />` : "◈"}</div>
    <div class="item-copy"><span>${safe(item.siteName)}</span><a href="${safe(item.url)}" class="item-name" data-open="${safe(item.url)}">${safe(item.name)}</a><div class="price-row"><strong>${safe(priceText(item.currentPrice, item.currency))}</strong><select class="currency-edit" data-currency-id="${safe(item.id)}" aria-label="Currency for ${safe(item.name)}">${currencyOptions(item.currency)}</select></div><small>${isDeal(item) ? `<b>↓ ${dropPercent(item)}% from saved price</b>` : safe(alertLabel(item))}</small>${item.lastError ? `<small class="check-error" title="${safe(item.lastError)}">Check failed: ${safe(item.lastError)}</small>` : ""}</div>
    ${prices.length > 1 ? `<svg class="sparkline" viewBox="0 0 58 28" aria-label="Price history"><polyline points="${points}" /></svg>` : ""}
    <button class="item-remove" data-remove="${safe(item.id)}" aria-label="Remove ${safe(item.name)}">×</button>
  </article>`
}

function heading(title, sub) { return `<div class="section-title"><div><h1>${title}</h1><p>${sub}</p></div></div>` }
function empty(icon, title, text) { return `<div class="empty glass"><div class="empty-icon">${icon}</div><h2>${title}</h2><p>${text}</p></div>` }
function render() {
  nav.querySelectorAll("button").forEach((button) => button.classList.toggle("active", button.dataset.view === page))
  const name = page === "home" ? "Your price watch" : page[0].toUpperCase() + page.slice(1)
  document.querySelector("#greeting").textContent = name
  const toast = notice ? `<div class="notice" role="status">${safe(notice)}</div>` : ""
  if (page === "home") {
    const recent = [...store.items].sort((a, b) => b.createdAt - a.createdAt).slice(0, 4)
    const deals = store.items.filter(isDeal).sort((a, b) => dropPercent(b) - dropPercent(a)).slice(0, 3)
    const trackedHere = trackedOnCurrentTab()
    view.innerHTML = `${toast}<section class="hero glass"><span class="eyebrow">TRACK WHAT YOU LOVE</span><h1>Catch the price drop.</h1><p>Save a product from the page you’re viewing. Droppr will check it every six hours.</p><button id="${trackedHere ? "refresh-page" : "capture"}" class="primary" ${currentTab ? "" : "disabled"}>${trackedHere ? "↻ Refresh this page" : "＋ Track this page"}</button>${currentTab ? `<span class="tab-hint">${safe(new URL(currentTab.url).hostname)}</span>` : `<span class="tab-hint">Open a product page to start</span>`}</section>
    ${product ? preview() : ""}
    <div class="section-title"><h2>Recently added</h2><span>${store.items.length} tracked</span></div>${recent.length ? recent.map(itemCard).join("") : empty("⌁", "Nothing tracked yet", "Open a product page and save it here.")}
    <div class="section-title"><h2>Recently dropped</h2><span>${store.items.filter(isDeal).length} deals</span></div>${deals.length ? deals.map(itemCard).join("") : empty("↘", "No price drops yet", "Your deals will show here as prices fall.")}`
  } else if (page === "lists") {
    const chosen = store.lists.find((list) => list.id === selectedList)
    view.innerHTML = `${toast}${heading(chosen ? safe(chosen.name) : "Lists", chosen ? `${store.items.filter((item) => item.listId === chosen.id).length} saved items` : "Organize your price watches")}${chosen ? `<button class="back" id="back-lists">← All lists</button>${store.items.filter((item) => item.listId === chosen.id).map(itemCard).join("") || empty("⌁", "List is empty", "Track a product to add it here.")}` : `<form id="new-list" class="list-form glass"><input name="name" maxlength="40" placeholder="New list name" aria-label="New list name" required /><button class="primary" type="submit">Create</button></form>${store.lists.map((list) => `<button class="list-card glass" data-list="${safe(list.id)}"><span class="list-icon">▦</span><span><strong>${safe(list.name)}</strong><small>${store.items.filter((item) => item.listId === list.id).length} items</small></span><span class="list-arrow">→</span></button>`).join("")}`}`
  } else if (page === "deals") {
    const deals = store.items.filter(isDeal).sort((a, b) => dropPercent(b) - dropPercent(a))
    view.innerHTML = `${toast}${heading("Deals", `${deals.length} item${deals.length === 1 ? "" : "s"} below the saved price`)}${deals.length ? deals.map(itemCard).join("") : empty("↘", "No deals right now", "Track products and watch their prices fall.")}`
  } else {
    view.innerHTML = `${toast}${heading("Settings", "Choose how Droppr works")}
      <section class="settings-card glass"><h2>Price checks</h2><p>Droppr checks saved pages every six hours while your browser is open. You can also check now.</p><button id="check-now" class="secondary">Check prices now</button></section>
      <section class="settings-card glass"><h2>Notifications</h2><label class="toggle-row"><span>Desktop price drop alerts</span><input id="notifications" type="checkbox" ${store.settings.notifications ? "checked" : ""} /></label></section>
      <section class="settings-card glass"><h2>Your data</h2><p>Watchlists and price history stay in this browser profile.</p><button id="export" class="secondary">Export data</button><label class="secondary import-label">Import data<input id="import" type="file" accept="application/json" hidden /></label></section>`
  }
}

function preview() {
  return `<section class="preview glass"><span class="eyebrow">PRODUCT FOUND</span><div class="preview-row">${product.image ? `<img src="${safe(product.image)}" alt="" />` : ""}<div><span>${safe(product.siteName)}</span><strong>${safe(product.name)}</strong><b id="preview-price">${safe(priceText(product.price, product.currency))}</b></div></div><div class="preview-controls"><label>Save to list<select id="list-select">${store.lists.map((list) => `<option value="${safe(list.id)}">${safe(list.name)}</option>`).join("")}</select></label><label>Currency<select id="preview-currency">${currencyOptions(product.currency)}</select></label><label>Alert me on<select id="alert-type"><option value="any">Any drop</option><option value="percent">% drop</option><option value="fixed">Target price</option></select></label><label id="threshold-wrap" hidden>Threshold<input id="threshold" type="number" min="0.01" step="0.01" value="10" /></label></div><button id="save-item" class="primary">Start tracking</button></section>`
}

function flash(message) { notice = message; render(); setTimeout(() => { if (notice === message) { notice = ""; render() } }, 4000) }

async function permissionFor(url) {
  const origin = productUrl(url)?.origin
  return origin ? chrome.permissions.request({ origins: [origin + "/*"] }) : false
}

async function capture() {
  if (!currentTab?.id) return
  if (!(await permissionFor(currentTab.url))) return flash("Site access is needed for price checks.")
  try {
    const [result] = await chrome.scripting.executeScript({ target: { tabId: currentTab.id }, func: extractProduct })
    if (result?.result?.error) return flash(result.result.error)
    product = { ...result.result, url: currentTab.url }
    render()
  } catch { flash("This page cannot be read. Try a regular product page.") }
}

async function refreshCurrentPage(silent = false) {
  const tracked = trackedOnCurrentTab()
  if (!tracked || !currentTab?.id) return
  try {
    const [response] = await chrome.scripting.executeScript({ target: { tabId: currentTab.id }, func: extractProduct })
    const result = response?.result
    store = await readStore()
    const item = store.items.find((entry) => entry.id === tracked.id)
    if (!item) return
    const applied = applyPriceResult(item, result)
    if (!applied.ok) { item.lastError = applied.reason; await saveStore(store); if (!silent) flash(applied.reason); return }
    await saveStore(store)
    if (applied.changed || applied.dealChanged) flash(`Price updated to ${priceText(item.currentPrice, item.currency)}.`)
    else if (!silent) flash("Price is up to date.")
    else render()
  } catch { if (!silent) flash("Could not read this product page.") }
}

async function saveProduct() {
  if (!product) return
  if (store.items.some((item) => item.url === product.url)) return flash("This page is already tracked.")
  const type = document.querySelector("#alert-type").value
  const value = Number(document.querySelector("#threshold").value)
  if (type !== "any" && !(value > 0)) return flash("Enter a threshold greater than zero.")
  store.items.push({ ...product, id: crypto.randomUUID(), listId: document.querySelector("#list-select").value || DEFAULT_LIST_ID, currentPrice: product.price, originalPrice: Math.max(product.price, product.comparePrice || 0), alertType: type, alertValue: type === "any" ? 0 : value, createdAt: Date.now(), lastChecked: Date.now(), history: [{ price: product.price, at: Date.now() }] })
  await saveStore(store)
  product = null
  flash("Price tracking started.")
}

view.addEventListener("click", async (event) => {
  const button = event.target.closest("button, a[data-open]")
  if (!button) return
  if (button.id === "capture") return capture()
  if (button.id === "refresh-page") return refreshCurrentPage()
  if (button.id === "save-item") return saveProduct()
  if (button.id === "back-lists") { selectedList = null; return render() }
  if (button.dataset.list) { selectedList = button.dataset.list; return render() }
  if (button.dataset.remove) {
    store.items = store.items.filter((item) => item.id !== button.dataset.remove)
    await saveStore(store); return flash("Item removed.")
  }
  if (button.dataset.open) { event.preventDefault(); if (productUrl(button.dataset.open)) return chrome.tabs.create({ url: button.dataset.open }) }
  if (button.id === "check-now") return runCheck()
  if (button.id === "export") {
    const blob = new Blob([JSON.stringify(store, null, 2)], { type: "application/json" })
    const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = "droppr-data.json"; link.click(); setTimeout(() => URL.revokeObjectURL(link.href), 5000)
  }
})
view.addEventListener("submit", async (event) => {
  if (event.target.id !== "new-list") return
  event.preventDefault()
  const name = new FormData(event.target).get("name")?.toString().trim()
  if (!name) return
  store.lists.push({ id: crypto.randomUUID(), name, createdAt: Date.now() })
  await saveStore(store); flash("List created.")
})
view.addEventListener("change", async (event) => {
  if (event.target.id === "alert-type") document.querySelector("#threshold-wrap").hidden = event.target.value === "any"
  if (event.target.id === "preview-currency" && product) {
    product.currency = event.target.value
    document.querySelector("#preview-price").textContent = priceText(product.price, product.currency)
  }
  if (event.target.dataset.currencyId) {
    const item = store.items.find((entry) => entry.id === event.target.dataset.currencyId)
    if (item) { item.currency = event.target.value; await saveStore(store); flash("Currency updated.") }
  }
  if (event.target.id === "notifications") { store.settings.notifications = event.target.checked; await saveStore(store) }
  if (event.target.id === "import") {
    try {
      const data = JSON.parse(await event.target.files[0].text())
      if (!Array.isArray(data.lists) || !Array.isArray(data.items)) throw new Error()
      if (data.lists.some((list) => typeof list.id !== "string" || typeof list.name !== "string") || data.items.some((item) => !productUrl(item.url) || typeof item.id !== "string" || typeof item.name !== "string" || !Number.isFinite(item.currentPrice) || !Number.isFinite(item.originalPrice))) throw new Error()
      store = { lists: data.lists, items: data.items, settings: { notifications: data.settings?.notifications !== false } }
      await saveStore(store); flash("Data imported.")
    } catch { flash("Could not import this file.") }
  }
})
nav.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-view]")
  if (button) { page = button.dataset.view; selectedList = null; notice = ""; render() }
})
async function runCheck() {
  flash("Checking saved products. This may take a minute…")
  try {
    const result = await chrome.runtime.sendMessage({ type: "CHECK_PRICES" })
    store = await readStore()
    flash(result?.busy ? "A price check is already running." : result?.error ? `Check failed: ${result.error}` : `Checked ${result.checked} products; ${result.updated} prices changed${result.failed ? `; ${result.failed} need attention` : ""}.`)
  } catch { flash("Price check could not start. Try again in a moment.") }
}
refresh.addEventListener("click", runCheck)
chrome.storage.onChanged.addListener(async () => { store = await readStore(); render() })
render()
void refreshCurrentPage(true)
