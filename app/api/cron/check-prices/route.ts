import { type NextRequest } from "next/server"
import { getAllUsersServer, getAllItemsForUser, updateItemPrice } from "@/lib/firestore"
import { scrapeProduct } from "@/lib/scraper"
import { sendPriceDropEmail } from "@/lib/notifications"
import type { CronSummary } from "@/types"

export const maxDuration = 300

export async function GET(request: NextRequest): Promise<Response> {
  if (request.headers.get("x-cron-secret") !== process.env.CRON_SECRET) {
    return new Response("Unauthorized", { status: 401 })
  }

  const summary: CronSummary = { checked: 0, updated: 0, notified: 0 }

  const users = await getAllUsersServer()

  for (const user of users) {
    const items = await getAllItemsForUser(user.uid)

    for (const item of items) {
      summary.checked++

      const result = await scrapeProduct(item.url)

      // Skip on scrape error
      if ("error" in result) continue

      const newPrice = result.price
      const priceChanged = Math.abs(newPrice - item.currentPrice) > 0.01

      if (!priceChanged) continue

      await updateItemPrice(user.uid, item.listId, item.id, newPrice, item.originalPrice)
      summary.updated++

      // Check if alert threshold is met
      const priceDropped = newPrice < item.currentPrice
      if (!priceDropped) continue

      const priceDrop = item.originalPrice - newPrice
      const priceDropPercent =
        item.originalPrice > 0
          ? (priceDrop / item.originalPrice) * 100
          : 0

      const alertTriggered =
        item.alertType === "fixed"
          ? newPrice <= item.alertValue
          : priceDropPercent >= item.alertValue

      if (!alertTriggered) continue
      if (!user.emailNotificationsEnabled) continue

      try {
        await sendPriceDropEmail(user.email, {
          ...item,
          currentPrice: newPrice,
          priceDrop,
          priceDropPercent: Math.round(priceDropPercent * 10) / 10,
          onSale: true,
        })
        summary.notified++
      } catch {
        // Notification failure should not stop the cron job
      }
    }
  }

  return Response.json(summary)
}
