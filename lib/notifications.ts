import { Resend } from "resend"
import type { TrackedItem } from "@/types"

const resend = new Resend(process.env.RESEND_API_KEY)

function formatCurrency(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
    }).format(amount)
  } catch {
    return `${currency} ${amount.toFixed(2)}`
  }
}

function buildEmailHtml(item: TrackedItem): string {
  const currentFormatted = formatCurrency(item.currentPrice, item.currency)
  const originalFormatted = formatCurrency(item.originalPrice, item.currency)
  const savedFormatted = formatCurrency(item.priceDrop, item.currency)

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Price Drop Alert</title>
</head>
<body style="margin:0;padding:0;background-color:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0a0a;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#111111;border-radius:12px;border:1px solid #222222;overflow:hidden;">
          <!-- Header -->
          <tr>
            <td style="padding:28px 32px;border-bottom:1px solid #1a1a1a;">
              <span style="color:#6366f1;font-size:20px;font-weight:700;letter-spacing:-0.5px;">droppr</span>
              <span style="color:#555;font-size:14px;margin-left:12px;">Price Alert</span>
            </td>
          </tr>
          <!-- Product image -->
          ${
            item.image
              ? `<tr>
            <td style="padding:32px 32px 0;">
              <img src="${item.image}" alt="${item.name}" width="100%" style="max-height:280px;object-fit:cover;border-radius:8px;display:block;" />
            </td>
          </tr>`
              : ""
          }
          <!-- Product info -->
          <tr>
            <td style="padding:28px 32px;">
              <p style="color:#888;font-size:12px;text-transform:uppercase;letter-spacing:1px;margin:0 0 8px;">${item.siteName}</p>
              <h1 style="color:#ffffff;font-size:22px;font-weight:600;margin:0 0 24px;line-height:1.4;">${item.name}</h1>
              <!-- Price row -->
              <table cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td>
                    <p style="color:#888;font-size:13px;margin:0 0 4px;">Was</p>
                    <p style="color:#555;font-size:18px;text-decoration:line-through;margin:0;">${originalFormatted}</p>
                  </td>
                  <td style="text-align:center;">
                    <span style="background-color:#14532d;color:#4ade80;font-size:13px;font-weight:600;padding:6px 12px;border-radius:99px;">-${item.priceDropPercent}%</span>
                  </td>
                  <td style="text-align:right;">
                    <p style="color:#888;font-size:13px;margin:0 0 4px;">Now</p>
                    <p style="color:#4ade80;font-size:28px;font-weight:700;margin:0;">${currentFormatted}</p>
                  </td>
                </tr>
              </table>
              <p style="color:#555;font-size:14px;margin:16px 0 0;">You save <strong style="color:#ffffff;">${savedFormatted}</strong> (${item.priceDropPercent}% off)</p>
            </td>
          </tr>
          <!-- CTA -->
          <tr>
            <td style="padding:0 32px 32px;">
              <a href="${item.url}" style="display:inline-block;background-color:#6366f1;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 28px;border-radius:8px;">View Product &rarr;</a>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px;border-top:1px solid #1a1a1a;">
              <p style="color:#444;font-size:12px;margin:0;">You received this because you added this item to your <strong style="color:#555;">droppr</strong> watchlist. <a href="#" style="color:#6366f1;text-decoration:none;">Manage notifications</a></p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function buildEmailText(item: TrackedItem): string {
  const currentFormatted = formatCurrency(item.currentPrice, item.currency)
  const originalFormatted = formatCurrency(item.originalPrice, item.currency)
  const savedFormatted = formatCurrency(item.priceDrop, item.currency)

  return `PRICE DROP ALERT from droppr

${item.name}
${item.siteName}

Was: ${originalFormatted}
Now: ${currentFormatted}
You save: ${savedFormatted} (${item.priceDropPercent}% off)

View product: ${item.url}

---
You received this because you added this item to your droppr watchlist.`
}

export async function sendPriceDropEmail(
  toEmail: string,
  item: TrackedItem
): Promise<void> {
  const subject = `Price dropped on ${item.name} — now ${formatCurrency(item.currentPrice, item.currency)}`

  await resend.emails.send({
    from: "Droppr <alerts@droppr.app>",
    to: [toEmail],
    subject,
    html: buildEmailHtml(item),
    text: buildEmailText(item),
  })
}
