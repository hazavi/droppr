import test from "node:test"
import assert from "node:assert/strict"
import { emailSettingsReady, subscribeEmail, emailStatus, sendEmailAlert } from "../extension/email.js"
import relay from "../relay/worker.mjs"

const settings = { emailEnabled: true, emailAddress: "me@example.com", emailEndpoint: "https://relay.example.com", emailToken: "a".repeat(72), emailVerified: true }
const item = { name: "Keyboard", currentPrice: 199, currency: "DKK", url: "https://shop.example.com/keyboard" }

function mockKv() {
  const values = new Map()
  return {
    values,
    get: async (key, type) => { const value = values.get(key); return type === "json" && value ? JSON.parse(value) : value ?? null },
    put: async (key, value) => { values.set(key, value) },
    delete: async (key) => { values.delete(key) },
  }
}

test("email subscription and alert requests use the shared relay", async () => {
  assert.equal(emailSettingsReady(settings), true)
  assert.equal(emailSettingsReady({ ...settings, emailEnabled: false }), false)
  assert.equal(emailSettingsReady({ ...settings, emailAddress: "bad" }), false)
  assert.equal(emailSettingsReady({ ...settings, emailEndpoint: "http://relay.example.com" }), false)
  let request
  const subscription = await subscribeEmail("me@example.com", settings, async (url, options) => {
    request = { url, options }
    return { ok: true, json: async () => ({ token: settings.emailToken }) }
  })
  assert.equal(subscription, settings.emailToken)
  assert.equal(request.url, "https://relay.example.com/subscribe")
  assert.deepEqual(JSON.parse(request.options.body), { email: "me@example.com" })
  assert.equal(await emailStatus(settings, async (url, options) => {
    assert.equal(url, "https://relay.example.com/status")
    assert.equal(options.headers.Authorization, `Bearer ${settings.emailToken}`)
    return { ok: true, json: async () => ({ verified: true }) }
  }), true)
  await sendEmailAlert(item, settings, async (url, options) => { request = { url, options }; return { ok: true } })
  assert.equal(request.url, "https://relay.example.com/alert")
  assert.equal(request.options.headers.Authorization, `Bearer ${settings.emailToken}`)
  assert.deepEqual(JSON.parse(request.options.body), { name: item.name, price: 199, currency: "DKK", url: item.url })
})

test("relay confirms an address before sending price alerts", async () => {
  const kv = mockKv()
  const env = { RESEND_API_KEY: "provider-secret", FROM_EMAIL: "Droppr <alerts@example.com>", SUBSCRIBERS: kv }
  const originalFetch = globalThis.fetch
  const sent = []
  globalThis.fetch = async (_url, options) => { sent.push(JSON.parse(options.body)); return { ok: true } }
  const post = (path, body, auth) => new Request(`https://relay.example.com${path}`, { method: "POST", headers: { "Content-Type": "application/json", "CF-Connecting-IP": "192.0.2.1", ...(auth ? { Authorization: `Bearer ${auth}` } : {}) }, body: JSON.stringify(body) })
  try {
    const signedUp = await relay.fetch(post("/subscribe", { email: "me@example.com" }), env)
    assert.equal(signedUp.status, 200)
    const { token } = await signedUp.json()
    assert.equal(token.length, 72)
    assert.equal((await relay.fetch(post("/alert", item, token), env)).status, 403)
    const link = sent[0].text.match(/https:\/\/[^\s]+/)?.[0]
    assert.ok(link)
    assert.equal((await relay.fetch(new Request(link), env)).status, 200)
    const status = await relay.fetch(new Request("https://relay.example.com/status", { headers: { Authorization: `Bearer ${token}` } }), env)
    assert.deepEqual(await status.json(), { verified: true })
    assert.equal((await relay.fetch(post("/alert", { ...item, to: "other@example.com", price: 199 }, token), env)).status, 200)
    assert.deepEqual(sent[1].to, ["me@example.com"])
    assert.equal((await relay.fetch(post("/alert", item, "b".repeat(72)), env)).status, 403)
  } finally { globalThis.fetch = originalFetch }
})

test("a background price drop sends desktop and email alerts", async () => {
  const originalChrome = globalThis.chrome
  const originalFetch = globalThis.fetch
  const saved = { lists: [{ id: "watchlist", name: "My watchlist" }], items: [{ id: "keyboard", name: "Keyboard", url: item.url, currentPrice: 250, originalPrice: 250, currency: "DKK", alertType: "any", history: [{ price: 250, at: 1 }] }], settings: { ...settings, notifications: true } }
  const notifications = []
  const emails = []
  let onMessage
  globalThis.fetch = async (url, options) => { emails.push({ url, options }); return { ok: true } }
  globalThis.chrome = {
    alarms: { get: async () => null, create: async () => {}, onAlarm: { addListener() {} } },
    runtime: { onInstalled: { addListener() {} }, onStartup: { addListener() {} }, onMessage: { addListener(listener) { onMessage = listener } } },
    storage: { local: { get: async () => saved, set: async (value) => Object.assign(saved, value) } },
    permissions: { contains: async () => true },
    tabs: { create: async () => ({ id: 2, status: "complete" }), remove: async () => {}, onUpdated: { addListener() {}, removeListener() {} } },
    scripting: { executeScript: async () => [{ result: { price: 199, comparePrice: 250, currency: "DKK", image: "https://shop.example.com/keyboard.jpg" } }] },
    notifications: { create: async (_id, alert) => { notifications.push(alert) }, onClicked: { addListener() {} } },
    action: { openPopup: async () => {} },
  }
  try {
    await import(`../extension/background.js?email-test=${Date.now()}`)
    const result = await new Promise((resolve) => onMessage({ type: "CHECK_PRICES" }, {}, resolve))
    assert.deepEqual(result, { checked: 1, updated: 1, failed: 0 })
    assert.equal(saved.items[0].currentPrice, 199)
    assert.equal(saved.items[0].pendingEmail, undefined)
    assert.equal(notifications.length, 1)
    assert.equal(emails.length, 1)
    assert.equal(JSON.parse(emails[0].options.body).price, 199)
  } finally {
    globalThis.chrome = originalChrome
    globalThis.fetch = originalFetch
  }
})
