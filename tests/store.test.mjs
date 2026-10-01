import test from "node:test"
import assert from "node:assert/strict"
import { applyPriceResult, isDeal, dropPercent } from "../extension/store.js"

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
  const result = applyPriceResult(saved, { error: "Price not found" })
  assert.equal(result.ok, false)
  assert.equal(saved.currentPrice, 100)
})
