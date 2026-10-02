import { extractProduct } from "./scrape.js"
import { readStore, saveStore, priceText, isDeal, dropPercent, applyPriceResult, correctItem, DEFAULT_LIST_ID } from "./store.js"
import { subscribeEmail, emailStatus } from "./email.js"

const view = document.querySelector("#view")
const nav = document.querySelector(".dock")
const refresh = document.querySelector("#refresh")
const removeDialog = document.querySelector("#remove-dialog")
let store = await readStore()
let page = "home"
let selectedList = null
let product = null
let currentTab = null
let notice = ""
let editingItemId = null
let pendingRemoveId = null

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
    <div class="item-image">${item.image ? `<img src="${safe(item.image)}" alt="" />` : "◈"}${isDeal(item) ? `<span class="deal-badge">−${dropPercent(item)}%</span>` : ""}</div>
    <div class="item-copy"><span>${safe(item.siteName)}</span><a href="${safe(item.url)}" class="item-name" data-open="${safe(item.url)}">${safe(item.name)}</a><div class="price-row"><strong>${safe(priceText(item.currentPrice, item.currency))}</strong><select class="currency-edit" data-currency-id="${safe(item.id)}" aria-label="Currency for ${safe(item.name)}">${currencyOptions(item.currency)}</select><button class="edit-item" data-edit-item="${safe(item.id)}" title="Correct price or image" aria-label="Correct price or image for ${safe(item.name)}">✎</button></div><small class="price-note">${isDeal(item) ? `<s>${safe(priceText(item.originalPrice, item.currency))}</s><b>Price drop</b>` : safe(alertLabel(item))}</small>${item.lastError ? `<small class="check-error" title="${safe(item.lastError)}">Check failed: ${safe(item.lastError)}</small>` : ""}${item.emailError ? `<small class="check-error">Email failed: ${safe(item.emailError)}</small>` : ""}${editingItemId === item.id ? `<form class="item-editor" data-item-editor="${safe(item.id)}"><label>Current price<input name="currentPrice" type="number" min="0.01" step="0.01" value="${safe(item.currentPrice)}" required /></label><label>Regular price<input name="originalPrice" type="number" min="0.01" step="0.01" value="${safe(item.originalPrice)}" required /></label><label>Image URL<input name="image" type="url" value="${safe(item.image)}" placeholder="https://…" /></label><button type="submit" class="secondary">Save correction</button></form>` : ""}</div>
    ${prices.length > 1 ? `<svg class="sparkline" viewBox="0 0 58 28" aria-label="Price history"><polyline points="${points}" /></svg>` : ""}
    <button class="item-remove" data-remove="${safe(item.id)}" aria-label="Remove ${safe(item.name)}">×</button>
  </article>`
}

function heading(title, sub) { return `<div class="section-title"><div><h1>${title}</h1><p>${sub}</p></div></div>` }
function empty(icon, title, text) { return `<div class="empty glass"><div class="empty-icon">${icon}</div><h2>${title}</h2><p>${text}</p></div>` }
function render() {
  nav.querySelectorAll("button").forEach((button) => button.classList.toggle("active", button.dataset.view === page))
  const activeIndex = [...nav.querySelectorAll("button")].findIndex((button) => button.dataset.view === page)
  nav.style.setProperty("--active-offset", `${activeIndex * 100}%`)
  nav.style.setProperty("--active-gap", `${activeIndex * 3}px`)
  const name = page === "home" ? "Your price watch" : page[0].toUpperCase() + page.slice(1)
  document.querySelector("#greeting").textContent = name
  const toast = notice ? `<div class="notice" role="status">${safe(notice)}</div>` : ""
  if (page === "home") {
    const recent = [...store.items].sort((a, b) => b.createdAt - a.createdAt).slice(0, 4)
    const deals = store.items.filter(isDeal).sort((a, b) => dropPercent(b) - dropPercent(a)).slice(0, 3)
    const trackedHere = trackedOnCurrentTab()
    view.innerHTML = `${toast}${product ? preview() : `<section class="hero glass"><span class="eyebrow">TRACK WHAT YOU LOVE</span><h1>Catch the price drop.</h1><p>Save a product from the page you’re viewing. Droppr will check it every six hours.</p><button id="${trackedHere ? "refresh-page" : "capture"}" class="primary" ${currentTab ? "" : "disabled"}>${trackedHere ? "↻ Refresh this page" : "＋ Track this page"}</button>${currentTab ? `<span class="tab-hint">${safe(new URL(currentTab.url).hostname)}</span>` : `<span class="tab-hint">Open a product page to start</span>`}</section>`}
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
      <form id="email-settings" class="settings-card glass"><h2>Email alerts</h2><p>Get an email when a product meets its price drop rule.</p><label class="email-field">Email address<input name="emailAddress" type="email" autocomplete="email" placeholder="you@example.com" value="${safe(store.settings.emailAddress)}" /></label><label class="toggle-row email-toggle"><span>Send email price drop alerts</span><input name="emailEnabled" type="checkbox" ${store.settings.emailEnabled ? "checked" : ""} /></label><div class="email-actions"><button class="secondary" type="submit">Save email settings</button>${store.settings.emailToken ? `<button id="check-email-status" class="secondary" type="button">Check verification</button>` : ""}</div><small class="email-status">${!store.settings.emailEndpoint ? "Email delivery is not connected yet." : store.settings.emailVerified ? "Email confirmed and ready." : store.settings.emailToken ? "Check your inbox and confirm your email." : "We will send you a confirmation link."}</small></form>
      <section class="settings-card glass"><h2>Your data</h2><p>Watchlists and price history stay in this browser profile.</p><button id="export" class="secondary">Export data</button><label class="secondary import-label">Import data<input id="import" type="file" accept="application/json" hidden /></label></section>`
  }
}

function preview() {
  return `<section class="preview glass">
    <div class="preview-head"><span class="eyebrow">${product.manual ? "ENTER PRODUCT PRICE" : "PRODUCT FOUND"}</span><button id="cancel-preview" type="button">Cancel</button></div>
    <div class="preview-row">${product.image ? `<img src="${safe(product.image)}" alt="" />` : ""}<div><span>${safe(product.siteName)}</span><strong>${safe(product.name)}</strong><b id="preview-price">${product.price > 0 ? safe(priceText(product.price, product.currency)) : "Enter a price below"}</b></div></div>
    ${product.manual ? `<p class="manual-hint">This store's price could not be read automatically. Enter the current price to save it.</p>` : ""}
    <div class="preview-controls">
      <label class="wide-field">Product name<input id="preview-name" type="text" maxlength="180" value="${safe(product.name)}" /></label>
      <label>Current price<input id="preview-price-input" type="number" min="0.01" step="0.01" inputmode="decimal" placeholder="179.00" value="${product.price > 0 ? safe(product.price) : ""}" /></label>
      <label>Currency<select id="preview-currency">${currencyOptions(product.currency)}</select></label>
      <label>Save to list<select id="list-select">${store.lists.map((list) => `<option value="${safe(list.id)}">${safe(list.name)}</option>`).join("")}</select></label>
      <label>Alert me on<select id="alert-type"><option value="any">Any drop</option><option value="percent">% drop</option><option value="fixed">Target price</option></select></label>
      <label id="threshold-wrap" hidden>Threshold<input id="threshold" type="number" min="0.01" step="0.01" value="10" /></label>
      <details class="advanced-fields"><summary>More options <span>Regular price and image</span></summary><div class="advanced-grid"><label>Regular price (if on sale)<input id="preview-regular-price" type="number" min="0.01" step="0.01" inputmode="decimal" value="${product.comparePrice > product.price ? safe(product.comparePrice) : ""}" /></label><label>Image URL (optional)<input id="preview-image" type="url" value="${safe(product.image || "")}" placeholder="https://…" /></label></div></details>
    </div>
    <button id="save-item" class="primary">Start tracking</button>
  </section>`
}

function flash(message) { notice = message; render(); setTimeout(() => { if (notice === message) { notice = ""; render() } }, 4000) }

async function permissionFor(url) {
  const origin = productUrl(url)?.origin
  return origin ? chrome.permissions.request({ origins: [origin + "/*"] }) : false
}

async function scrapeCurrentTab() {
  let best
  let partial
  for (let attempt = 0; attempt < 3; attempt++) {
    const [response] = await chrome.scripting.executeScript({ target: { tabId: currentTab.id }, func: extractProduct })
    const result = response?.result
    if (result?.image || result?.name) partial = result
    if (result && !result.error && (!best || result.image || !best.image)) best = result
    if (best?.image) break
    if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, 500))
  }
  return best || partial
}

async function capture() {
  if (!currentTab?.id) return
  if (!(await permissionFor(currentTab.url))) return flash("Site access is needed for price checks.")
  try {
    const result = await scrapeCurrentTab()
    if (result && !result.error) product = { ...result, url: currentTab.url }
    else product = manualProduct(result)
    render()
  } catch (error) { product = manualProduct({ error: error?.message || "Could not read this page" }); render() }
}

function manualProduct(partial = {}) {
  const url = new URL(currentTab.url)
  const currency = url.hostname.endsWith(".dk") ? "DKK" : url.hostname.endsWith(".no") ? "NOK" : url.hostname.endsWith(".se") ? "SEK" : "USD"
  return { url: currentTab.url, name: partial.name || currentTab.title || url.hostname, image: partial.image || "", price: null, currency: partial.currency || currency, currencySource: "manual", siteName: url.hostname.replace(/^www\./, ""), manual: true, captureError: partial.error || "" }
}

async function refreshCurrentPage(silent = false) {
  const tracked = trackedOnCurrentTab()
  if (!tracked || !currentTab?.id) return
  try {
    const result = await scrapeCurrentTab()
    store = await readStore()
    const item = store.items.find((entry) => entry.id === tracked.id)
    if (!item) return
    const applied = applyPriceResult(item, result)
    if (!applied.ok) { item.lastError = applied.reason; await saveStore(store); if (!silent) flash(applied.reason); return }
    await saveStore(store)
    if (applied.alert) void chrome.runtime.sendMessage({ type: "PRICE_DROP", itemId: item.id }).catch((error) => console.warn("Droppr alert failed:", error))
    if (applied.changed || applied.dealChanged) flash(`Price updated to ${priceText(item.currentPrice, item.currency)}.`)
    else if (!silent) flash("Price is up to date.")
    else render()
  } catch { if (!silent) flash("Could not read this product page.") }
}

async function saveProduct() {
  if (!product) return
  if (store.items.some((item) => item.url === product.url)) return flash("This page is already tracked.")
  const name = document.querySelector("#preview-name").value.trim()
  const price = Number(document.querySelector("#preview-price-input").value)
  const regularInput = document.querySelector("#preview-regular-price").value.trim()
  const regularPrice = regularInput ? Number(regularInput) : price
  const image = document.querySelector("#preview-image").value.trim()
  if (!name) return flash("Enter a product name.")
  if (!Number.isFinite(price) || price <= 0) return flash("Enter a valid current price.")
  if (!Number.isFinite(regularPrice) || regularPrice < price) return flash("Regular price must be at least the current price.")
  if (image && !productUrl(image)) return flash("Enter a valid image URL.")
  const type = document.querySelector("#alert-type").value
  const value = Number(document.querySelector("#threshold").value)
  if (type !== "any" && !(value > 0)) return flash("Enter a threshold greater than zero.")
  store.items.push({ ...product, name, price, image, id: crypto.randomUUID(), listId: document.querySelector("#list-select").value || DEFAULT_LIST_ID, currentPrice: price, originalPrice: regularPrice, alertType: type, alertValue: type === "any" ? 0 : value, createdAt: Date.now(), lastChecked: Date.now(), history: [{ price, at: Date.now() }] })
  await saveStore(store)
  product = null
  flash("Price tracking started.")
}

view.addEventListener("click", async (event) => {
  const button = event.target.closest("button, a[data-open]")
  if (!button) return
  if (button.id === "capture") return capture()
  if (button.id === "cancel-preview") { product = null; return render() }
  if (button.id === "refresh-page") return refreshCurrentPage()
  if (button.id === "save-item") return saveProduct()
  if (button.dataset.editItem) { editingItemId = editingItemId === button.dataset.editItem ? null : button.dataset.editItem; return render() }
  if (button.id === "back-lists") { selectedList = null; return render() }
  if (button.dataset.list) { selectedList = button.dataset.list; return render() }
  if (button.dataset.remove) {
    const item = store.items.find((entry) => entry.id === button.dataset.remove)
    if (!item) return
    pendingRemoveId = item.id
    document.querySelector("#remove-product-name").textContent = item.name
    removeDialog.showModal()
    document.querySelector("#cancel-remove").focus()
    return
  }
  if (button.dataset.open) { event.preventDefault(); if (productUrl(button.dataset.open)) return chrome.tabs.create({ url: button.dataset.open }) }
  if (button.id === "check-now") return runCheck()
  if (button.id === "check-email-status") {
    try {
      store.settings.emailVerified = await emailStatus(store.settings)
      await saveStore(store)
      return flash(store.settings.emailVerified ? "Email confirmed." : "Email is not confirmed yet. Check your inbox.")
    } catch (error) {
      if (/401/.test(error.message)) {
        store.settings.emailToken = ""
        store.settings.emailVerified = false
        await saveStore(store)
        return flash("Email confirmation expired. Save again for a new link.")
      }
      return flash("Could not check email verification.")
    }
  }
  if (button.id === "export") {
    const blob = new Blob([JSON.stringify({ ...store, settings: { ...store.settings, emailToken: "" } }, null, 2)], { type: "application/json" })
    const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = "droppr-data.json"; link.click(); setTimeout(() => URL.revokeObjectURL(link.href), 5000)
  }
})
document.querySelector("#cancel-remove").addEventListener("click", () => removeDialog.close())
document.querySelector("#confirm-remove").addEventListener("click", async () => {
  const id = pendingRemoveId
  removeDialog.close()
  if (!id) return
  store.items = store.items.filter((item) => item.id !== id)
  await saveStore(store)
  flash("Item removed.")
})
removeDialog.addEventListener("close", () => { pendingRemoveId = null })
view.addEventListener("submit", async (event) => {
  if (event.target.id === "email-settings") {
    event.preventDefault()
    const form = event.target
    const emailAddress = form.elements.emailAddress.value.trim()
    const emailEnabled = form.elements.emailEnabled.checked
    if (emailAddress && !form.elements.emailAddress.validity.valid) return flash("Enter a valid email address.")
    if (emailEnabled && !emailAddress) return flash("Enter your email address.")
    if (emailEnabled && !store.settings.emailEndpoint) return flash("Email delivery is not connected yet.")
    if (emailEnabled) {
      let origin
      try { const url = new URL(store.settings.emailEndpoint); if (url.protocol !== "https:") throw new Error(); origin = url.origin }
      catch { return flash("Email service URL is invalid.") }
      if (!(await chrome.permissions.request({ origins: [origin + "/*"] }))) return flash("Email service access is needed for alerts.")
    }
    let emailToken = store.settings.emailToken
    let emailVerified = store.settings.emailVerified
    const addressChanged = emailAddress !== store.settings.emailAddress
    if (emailEnabled && (addressChanged || !emailToken)) {
      try { emailToken = await subscribeEmail(emailAddress, store.settings); emailVerified = false }
      catch (error) { return flash(error.message) }
    }
    store.settings = { ...store.settings, emailAddress, emailToken, emailVerified, emailEnabled }
    if (!emailEnabled || addressChanged) for (const item of store.items) { delete item.pendingEmail; delete item.emailError }
    await saveStore(store)
    return flash(emailEnabled ? emailVerified ? "Email alerts enabled." : "Check your inbox to confirm your email." : "Email settings saved.")
  }
  if (event.target.dataset.itemEditor) {
    event.preventDefault()
    const item = store.items.find((entry) => entry.id === event.target.dataset.itemEditor)
    if (!item) return
    const values = new FormData(event.target)
    const image = String(values.get("image") || "").trim()
    if (image && !productUrl(image)) return flash("Enter a valid image URL.")
    try {
      correctItem(item, { currentPrice: Number(values.get("currentPrice")), originalPrice: Number(values.get("originalPrice")), image })
      await saveStore(store)
      editingItemId = null
      flash("Item corrected.")
    } catch (error) { flash(error.message) }
    return
  }
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
    if (product.price > 0) document.querySelector("#preview-price").textContent = priceText(product.price, product.currency)
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
      store = { lists: data.lists, items: data.items, settings: { notifications: data.settings?.notifications !== false, emailEnabled: false, emailAddress: data.settings?.emailAddress || "", emailEndpoint: store.settings.emailEndpoint, emailToken: "", emailVerified: false } }
      await saveStore(store); flash("Data imported.")
    } catch { flash("Could not import this file.") }
  }
})
view.addEventListener("input", (event) => {
  if (event.target.id === "preview-price-input" && product) {
    product.price = Number(event.target.value)
    document.querySelector("#preview-price").textContent = product.price > 0 ? priceText(product.price, product.currency) : "Enter a price below"
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
