import test from "node:test"
import assert from "node:assert/strict"
import { applyPriceResult, correctItem, isDeal, dropPercent, readStore, saveStore } from "../extension/store.js"

test("legacy email settings are removed from saved extension settings", async () => {
  let saved
  globalThis.chrome = {
    storage: { local: {
      async get() { return { settings: { notifications: false, email: "old@example.com" } } },
      async set(value) { saved = value },
    } },
  }
  try {
    const store = await readStore()
    assert.deepEqual(store.settings, { notifications: false })
    assert.deepEqual(saved.settings, { notifications: false })
    await saveStore(store)
    assert.deepEqual(saved.settings, { notifications: false })
  } finally {
    delete globalThis.chrome
  }
})

function item() {
  return { currentPrice: 100, originalPrice: 100, currency: "USD", history: [], alertType: "any", alertValue: 0 }
}

test("a lower price updates the saved item, deal, history, and alert", () => {
  const saved = item()
  const result = applyPriceResult(saved, { price: 75, comparePrice: 100, currency: "USD", currencySource: "explicit" }, 123)
  assert.deepEqual(result, { ok: true, changed: true, dealChanged: false, alert: true })
  assert.equal(saved.currentPrice, 75)
  assert.equal(saved.lastChecked, 123)
  assert.deepEqual(saved.history, [{ price: 75, at: 123 }])
  assert.equal(isDeal(saved), true)
  assert.equal(dropPercent(saved), 25)
})

test("a sale already in progress records the crossed-out price", () => {
  const saved = item()
  saved.currentPrice = 75
  saved.originalPrice = 75
  const result = applyPriceResult(saved, { price: 75, comparePrice: 100, currency: "USD", currencySource: "explicit" })
  assert.equal(result.dealChanged, true)
  assert.equal(saved.originalPrice, 100)
  assert.equal(isDeal(saved), true)
})

test("a currency mismatch does not replace the saved numeric price", () => {
  const saved = item()
  const result = applyPriceResult(saved, { price: 50, currency: "EUR", currencySource: "explicit" })
  assert.equal(result.ok, false)
  assert.equal(saved.currentPrice, 100)
  assert.equal(saved.history.length, 0)
})

test("an unreadable page leaves the last good price intact", () => {
  const saved = item()
  const result = applyPriceResult(saved, { error: "Price not found", image: "https://images.example.com/product.jpg" })
  assert.equal(result.ok, false)
  assert.equal(saved.currentPrice, 100)
  assert.equal(saved.image, "https://images.example.com/product.jpg")
})

test("a later successful check fills a missing product image", () => {
  const saved = item()
  saved.image = ""
  applyPriceResult(saved, { price: 100, currency: "USD", currencySource: "explicit", image: "https://images.example.com/product.jpg" })
  assert.equal(saved.image, "https://images.example.com/product.jpg")
})

test("a later successful check replaces an incorrect product image", () => {
  const saved = item()
  saved.image = "https://images.example.com/sweater.jpg"
  applyPriceResult(saved, { price: 100, currency: "USD", currencySource: "explicit", image: "https://images.example.com/jeans.jpg" })
  assert.equal(saved.image, "https://images.example.com/jeans.jpg")
})

test("a correction replaces a bad price, false deal, missing image, and history", () => {
  const saved = item()
  saved.currentPrice = 7999
  saved.originalPrice = 7999
  saved.lastError = "Previous check failed"
  saved.history = [{ price: 7999, at: 1 }]
  correctItem(saved, { currentPrice: 79.99, originalPrice: 79.99, image: "https://images.example.com/product.jpg" }, 200)
  assert.equal(saved.currentPrice, 79.99)
  assert.equal(saved.originalPrice, 79.99)
  assert.equal(saved.image, "https://images.example.com/product.jpg")
  assert.equal(saved.lastError, "")
  assert.deepEqual(saved.history, [{ price: 79.99, at: 200 }])
  assert.equal(isDeal(saved), false)
  assert.throws(() => correctItem(saved, { currentPrice: 100, originalPrice: 50, image: "" }), /valid current and regular/)
  assert.equal(saved.currentPrice, 79.99)
})
