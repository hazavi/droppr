import { type NextRequest } from "next/server"
import { sendPriceDropEmail } from "@/lib/notifications"
import type { TrackedItem } from "@/types"

export async function POST(request: NextRequest): Promise<Response> {
  if (request.headers.get("x-scraper-secret") !== process.env.SCRAPER_SECRET) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: { email: string; item: TrackedItem }
  try {
    body = (await request.json()) as { email: string; item: TrackedItem }
    if (!body.email || !body.item) {
      return Response.json({ error: "Missing email or item" }, { status: 400 })
    }
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 })
  }

  await sendPriceDropEmail(body.email, body.item)
  return Response.json({ success: true })
}
