import test from "node:test"
import assert from "node:assert/strict"

test("a popup price drop sends a browser notification only when enabled", async () => {
  let onMessage
  const notifications = []
  const saved = {
    lists: [],
    items: [{ id: "product-1", name: "Keyboard", currentPrice: 75, currency: "DKK" }],
    settings: { notifications: true },
  }
  globalThis.chrome = {
    runtime: {
      onInstalled: { addListener() {} },
      onStartup: { addListener() {} },
      onMessage: { addListener(listener) { onMessage = listener } },
    },
    alarms: { onAlarm: { addListener() {} } },
    notifications: {
      onClicked: { addListener() {} },
      async create(id, options) { notifications.push({ id, options }) },
    },
    storage: { local: { async get() { return saved } } },
  }
  try {
    await import("../extension/background.js")
    const send = (id) => new Promise((resolve) => onMessage({ type: "PRICE_DROP", id }, {}, resolve))
    assert.deepEqual(await send("product-1"), { ok: true })
    assert.equal(notifications.length, 1)
    assert.match(notifications[0].options.message, /Keyboard is now/)
    assert.equal(notifications[0].options.type, "basic")

    saved.settings.notifications = false
    assert.deepEqual(await send("product-1"), { ok: true })
    assert.equal(notifications.length, 1)

    saved.settings.notifications = true
    assert.deepEqual(await send("missing"), { ok: true })
    assert.equal(notifications.length, 1)
  } finally {
    delete globalThis.chrome
  }
})
