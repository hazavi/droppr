import { type NextRequest } from "next/server"
import { scrapeProduct } from "@/lib/scraper"
import type { ScrapeResult, ScrapeError } from "@/types"

export const maxDuration = 60

export async function POST(request: NextRequest): Promise<Response> {
  if (request.headers.get("x-scraper-secret") !== process.env.SCRAPER_SECRET) {
    return Response.json({ error: true, reason: "unauthorized", message: "Unauthorized" }, { status: 401 })
  }

  let url: string
  try {
    const body = (await request.json()) as { url?: unknown }
    if (typeof body.url !== "string" || !body.url.startsWith("http")) {
      return Response.json(
        { error: true, reason: "parse_failed", message: "Invalid URL provided" },
        { status: 400 }
      )
    }
    url = body.url
  } catch {
    return Response.json(
      { error: true, reason: "parse_failed", message: "Invalid request body" },
      { status: 400 }
    )
  }

  const result: ScrapeResult | ScrapeError = await scrapeProduct(url)
  return Response.json(result)
}
