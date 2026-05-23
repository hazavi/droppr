# Droppr

**Track prices across any online retailer. Get notified the moment they drop.**

Droppr is a production-ready full-stack price drop tracker built with Next.js 16, Firebase, and Puppeteer. Paste any product URL, watch the price get scraped and tracked automatically every 6 hours via GitHub Actions, and receive polished email alerts when your defined threshold is met.

---

## Features

- **Universal scraping** — tracks prices from any online retailer using Puppeteer with stealth plugin
- **Authenticated** — email/password and Google OAuth via Firebase Auth
- **Organized watchlists** — create categorized lists to group your tracked items
- **Deals page** — live view of all items currently on sale, sortable and filterable
- **Price history charts** — sparkline charts showing price trends over time
- **Smart alerts** — configure alerts by fixed price threshold or percentage drop
- **Email notifications** — beautiful HTML emails sent via Resend when your alert triggers
- **Fully automated** — GitHub Actions runs the price checker every 6 hours for free
- **Real-time updates** — Firestore onSnapshot listeners keep the UI live

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16.2.6 (App Router) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS v4 |
| Auth | Firebase Auth |
| Database | Firebase Firestore |
| Scraping | Puppeteer Core + Stealth plugin |
| Scheduler | GitHub Actions (free, every 6 hours) |
| Email | Resend |
| Charts | Recharts |
| Animations | Framer Motion |
| Deployment | Vercel |

---

## Prerequisites

- Node.js 20+
- A Firebase project with Auth and Firestore enabled
- A Resend account (free tier: 3,000 emails/month)
- A Vercel account for deployment
- A GitHub repository (used for Actions scheduling)

---

## Local Development Setup

### 1. Clone and install

```bash
git clone https://github.com/your-username/droppr.git
cd droppr
npm install
```

### 2. Configure Firebase

1. Go to Firebase Console and create a new project
2. Enable Authentication (Email/Password + Google providers)
3. Enable Firestore Database in production mode
4. Copy your web app config from Project Settings

### 3. Set Firestore Security Rules

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

### 4. Configure environment variables

```bash
cp .env.local.example .env.local
```

Fill in .env.local with your Firebase config, Resend API key, and generated secrets.

### 5. Run the dev server

```bash
npm run dev
```

---

## Environment Variables

| Variable | Description |
|---|---|
| NEXT_PUBLIC_FIREBASE_API_KEY | Firebase web API key |
| NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN | Firebase auth domain |
| NEXT_PUBLIC_FIREBASE_PROJECT_ID | Firebase project ID |
| NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET | Firebase storage bucket |
| NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID | Firebase messaging sender ID |
| NEXT_PUBLIC_FIREBASE_APP_ID | Firebase app ID |
| RESEND_API_KEY | Resend API key |
| SCRAPER_SECRET | Protects /api/scrape route |
| CRON_SECRET | Protects /api/cron/check-prices route |

---

## GitHub Actions Setup

In your GitHub repository Settings > Secrets add:
- APP_URL: your Vercel production URL
- CRON_SECRET: same value as CRON_SECRET in Vercel env vars

The workflow at .github/workflows/check-prices.yml runs every 6 hours automatically.

---

## Vercel Deployment

1. Push to GitHub
2. Import in Vercel
3. Add all environment variables
4. Deploy

---

## Scraper Notes

The scraper uses a prioritized selector list. To add support for a new site, add selectors to PRICE_SELECTORS in lib/scraper.ts.

Known limitations:
- Sites with aggressive bot detection may block scrapes
- JavaScript-heavy SPAs may require longer timeouts
- Sites requiring login are not supported

---

## License

MIT
