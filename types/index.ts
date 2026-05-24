export type AlertType = "fixed" | "percent" | "any"

export interface PricePoint {
  id: string
  price: number
  recordedAt: Date
}

export interface TrackedItem {
  id: string
  url: string
  name: string
  image: string
  siteName: string
  currentPrice: number
  originalPrice: number
  currency: string
  alertType: AlertType
  alertValue: number
  onSale: boolean
  priceDrop: number
  priceDropPercent: number
  lastChecked: Date
  createdAt: Date
}

export interface ItemList {
  id: string
  name: string
  category: string
  createdAt: Date
  itemCount?: number
}

export interface UserProfile {
  uid: string
  email: string
  displayName: string
  notifyVia: "email"
  emailNotificationsEnabled: boolean
}

export interface ScrapeResult {
  name: string
  image: string
  price: number
  currency: string
  siteName: string
}

export interface ScrapeError {
  error: true
  reason: "timeout" | "blocked" | "unsupported" | "parse_failed"
  message: string
}

export interface CronSummary {
  checked: number
  updated: number
  notified: number
}
