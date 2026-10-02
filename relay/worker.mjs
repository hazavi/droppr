// A single relay serves every Droppr user. Configure RESEND_API_KEY and
// FROM_EMAIL as Worker secrets and bind a Workers KV namespace as SUBSCRIBERS.
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
}
const json = (status, data) => new Response(JSON.stringify(data), { status, headers: { ...cors, "Content-Type": "application/json" } })
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const token = () => `${crypto.randomUUID()}${crypto.randomUUID()}`
const subscriberKey = (value) => `subscriber:${value}`
const emailKey = async (email) => {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(email))
  return `signup-email:${Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("")}`
}

async function sendWithResend(env, message) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: env.FROM_EMAIL, ...message }),
  })
  return response.ok
}

async function subscriber(request, env) {
  const bearer = request.headers.get("Authorization")?.match(/^Bearer ([a-f0-9-]{72})$/i)?.[1]
  return bearer ? { key: subscriberKey(bearer), value: await env.SUBSCRIBERS.get(subscriberKey(bearer), "json") } : null
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors })
    if (!env.RESEND_API_KEY || !env.FROM_EMAIL || !env.SUBSCRIBERS) return json(503, { error: "Relay is not configured" })
    const url = new URL(request.url)
    if (url.pathname === "/subscribe" && request.method === "POST") {
      let body
      try { body = await request.json() } catch { return json(400, { error: "Invalid JSON" }) }
      const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : ""
      if (email.length > 254 || !emailPattern.test(email)) return json(400, { error: "Invalid email address" })
      const ip = request.headers.get("CF-Connecting-IP") || "unknown"
      const day = new Date().toISOString().slice(0, 10)
      const rateKey = `signup:${ip}:${day}`
      const count = Number(await env.SUBSCRIBERS.get(rateKey) || 0)
      if (count >= 5) return json(429, { error: "Too many confirmation requests today" })
      const cooldownKey = await emailKey(email)
      if (await env.SUBSCRIBERS.get(cooldownKey)) return json(429, { error: "A confirmation was recently sent to this address" })
      await env.SUBSCRIBERS.put(rateKey, String(count + 1), { expirationTtl: 86400 })
      await env.SUBSCRIBERS.put(cooldownKey, "1", { expirationTtl: 300 })
      const accessToken = token()
      const verifyToken = token()
      await env.SUBSCRIBERS.put(subscriberKey(accessToken), JSON.stringify({ email, verified: false }))
      await env.SUBSCRIBERS.put(`verify:${verifyToken}`, accessToken, { expirationTtl: 86400 })
      const verifyUrl = `${url.origin}/verify?token=${verifyToken}`
      const sent = await sendWithResend(env, { to: [email], subject: "Confirm your Droppr email alerts", text: `Confirm your email to receive Droppr price alerts:\n\n${verifyUrl}\n\nThis link expires in 24 hours. If you did not request it, ignore this email.` })
      if (!sent) {
        await env.SUBSCRIBERS.delete(subscriberKey(accessToken))
        await env.SUBSCRIBERS.delete(`verify:${verifyToken}`)
        return json(502, { error: "Could not send confirmation email" })
      }
      return json(200, { token: accessToken })
    }
    if (url.pathname === "/verify" && request.method === "GET") {
      const verifyToken = url.searchParams.get("token")
      const accessToken = verifyToken ? await env.SUBSCRIBERS.get(`verify:${verifyToken}`) : null
      const key = accessToken && subscriberKey(accessToken)
      const record = key && await env.SUBSCRIBERS.get(key, "json")
      if (!record) return new Response("This confirmation link is invalid or expired.", { status: 400, headers: { "Content-Type": "text/plain; charset=utf-8" } })
      await env.SUBSCRIBERS.put(key, JSON.stringify({ ...record, verified: true }))
      await env.SUBSCRIBERS.delete(`verify:${verifyToken}`)
      return new Response("Your Droppr email is confirmed. You can close this tab.", { headers: { "Content-Type": "text/plain; charset=utf-8" } })
    }
    if (url.pathname === "/status" && request.method === "GET") {
      const entry = await subscriber(request, env)
      return entry?.value ? json(200, { verified: entry.value.verified === true }) : json(401, { error: "Unknown subscription" })
    }
    if (url.pathname === "/alert" && request.method === "POST") {
      const entry = await subscriber(request, env)
      if (!entry?.value?.verified) return json(403, { error: "Email is not confirmed" })
      let body
      try { body = await request.json() } catch { return json(400, { error: "Invalid JSON" }) }
      const { name, price, currency, url: product } = body || {}
      let productUrl
      try { productUrl = new URL(product); if (productUrl.protocol !== "https:" || productUrl.username || productUrl.password) throw new Error() } catch { return json(400, { error: "Invalid product URL" }) }
      if (typeof name !== "string" || !name.trim() || name.length > 180 || !Number.isFinite(price) || price <= 0 || typeof currency !== "string" || !/^[A-Z]{3}$/.test(currency)) return json(400, { error: "Invalid alert" })
      const day = new Date().toISOString().slice(0, 10)
      const rateKey = `alerts:${entry.key}:${day}`
      const count = Number(await env.SUBSCRIBERS.get(rateKey) || 0)
      if (count >= 30) return json(429, { error: "Daily email limit reached" })
      const amount = new Intl.NumberFormat("en", { style: "currency", currency }).format(price)
      const sent = await sendWithResend(env, { to: [entry.value.email], subject: `Droppr price drop: ${name.slice(0, 80)}`, text: `${name} is now ${amount}.\n\nView product: ${productUrl.href}\n\nSent by Droppr.` })
      if (!sent) return json(502, { error: "Email provider rejected the alert" })
      await env.SUBSCRIBERS.put(rateKey, String(count + 1), { expirationTtl: 86400 })
      return json(200, { sent: true })
    }
    return json(404, { error: "Not found" })
  },
}
