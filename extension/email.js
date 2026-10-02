const validEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value || "")
const relayUrl = (settings, path) => {
  const base = new URL(settings.emailEndpoint)
  if (base.protocol !== "https:" || base.username || base.password) throw new Error("Email relay is not configured")
  return new URL(path, base.origin).href
}

export function emailSettingsReady(settings) {
  if (!settings?.emailEnabled || !validEmail(settings.emailAddress) || !settings.emailToken) return false
  try { relayUrl(settings, "/alert"); return true } catch { return false }
}

export async function subscribeEmail(email, settings, fetcher = fetch) {
  if (!validEmail(email)) throw new Error("Enter a valid email address")
  const response = await fetcher(relayUrl(settings, "/subscribe"), {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }), signal: AbortSignal.timeout(15000),
  })
  if (!response.ok) throw new Error(`Confirmation email failed (${response.status})`)
  const data = await response.json()
  if (typeof data.token !== "string" || !data.token) throw new Error("Relay did not return a subscription")
  return data.token
}

export async function emailStatus(settings, fetcher = fetch) {
  const response = await fetcher(relayUrl(settings, "/status"), {
    headers: { Authorization: `Bearer ${settings.emailToken}` }, signal: AbortSignal.timeout(15000),
  })
  if (!response.ok) throw new Error(`Email status failed (${response.status})`)
  return (await response.json()).verified === true
}

export async function sendEmailAlert(item, settings, fetcher = fetch) {
  if (!emailSettingsReady(settings)) throw new Error("Email alerts are not configured")
  const response = await fetcher(relayUrl(settings, "/alert"), {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${settings.emailToken}` },
    body: JSON.stringify({ name: item.name, price: item.currentPrice, currency: item.currency, url: item.url }),
    signal: AbortSignal.timeout(15000),
  })
  if (!response.ok) throw new Error(`Email relay returned ${response.status}`)
}
