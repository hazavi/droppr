# Droppr browser extension

Droppr is a Manifest V3 extension for Chrome and other Chromium browsers. It keeps the original glass and aurora design in a compact popup, with watchlists, deals, price alerts, and price history saved in the browser.

## Install locally

1. Run `npm run build` (Node.js 20 or newer).
2. Open `chrome://extensions`, turn on **Developer mode**, then choose **Load unpacked**.
3. Select this repository's `dist` folder and pin Droppr to the toolbar.

Desktop alerts need no server or account. Email alerts require a private email relay, described below. `npm run lint` checks the extension scripts. `npm run test` runs browser price-extraction fixtures and saved-price tests; it needs Chrome or Edge installed (or `CHROME_PATH` set to a browser executable).

## Use

Open a product page and click the Droppr icon. Choose **Track this page**, review or edit the detected name, current price, regular price, and image URL, select a list and alert threshold, then choose **Start tracking**. Droppr asks for access to that store so it can revisit saved pages. If automatic extraction fails, enter the product details manually; future automatic checks still depend on the store exposing a readable price. Use the pencil on a saved item to correct its price, regular price, or image. Correcting a price starts a new price history for that item. If the currency is wrong, change it in the preview or on an existing item. This changes the currency label and alert unit; it does not convert the numeric price. The popup contains recent items, deals, lists, settings, data export and import, and a manual price check.

Browser alarms run checks about every six hours while the browser is running. Checks briefly open each saved page in a background tab, read its price, then close it. Opening Droppr on a tracked product page also refreshes that item immediately. Sale pages record the reduced price and the crossed-out price when both are available. Desktop and configured email notifications fire when a price crosses the selected rule. Stores that require login, block page access, or hide prices from the page may not be readable. An unreadable price leaves the saved value intact and shows a check error on the item. Local browser storage is specific to that browser profile; export your data in Settings before switching profiles.

The extension runs without a web app or scheduled GitHub job. Email delivery needs one shared HTTPS relay because the extension cannot keep an email provider API key private. **The publisher deploys the relay once. Users only enter their email address and click a confirmation link.**

### Set up the email relay once

1. Create a [Resend](https://resend.com/) account, verify a sending domain, and create a **Sending access** API key for that domain.
2. Sign in to [Cloudflare](https://dash.cloudflare.com/) and run `npx.cmd wrangler login` in PowerShell. The repository includes [`relay/worker.mjs`](relay/worker.mjs) and [`relay/wrangler.jsonc`](relay/wrangler.jsonc). From the repository root, run `npx.cmd wrangler deploy --config relay/wrangler.jsonc`. Wrangler creates the Worker and its `SUBSCRIBERS` KV namespace. The Worker will report that it is unconfigured until you add the secrets.
3. Run `npx.cmd wrangler secret put RESEND_API_KEY --config relay/wrangler.jsonc` and paste the Resend key at the hidden prompt. Then run `npx.cmd wrangler secret put FROM_EMAIL --config relay/wrangler.jsonc` and enter a sender on the verified domain, such as `Droppr <alerts@yourdomain.com>`.
4. Copy the deployed Worker base URL, such as `https://droppr-email-relay.your-subdomain.workers.dev`, into [`extension/email-config.js`](extension/email-config.js). Use the base URL without `/alert`. Run `npm run lint`, `npm run test`, and `npm run build`, then reload the extension from `dist/`.
5. In **Settings → Email alerts**, enter an address, enable alerts, and save. Open the confirmation link that arrives by email, then choose **Check verification** in Droppr. After that, price drops can trigger emails. Chrome will ask for access to the relay host.

The Resend key stays in Cloudflare secrets. The Worker keeps verified addresses in KV and limits confirmation requests and alert volume. Droppr stores a subscription token in the browser profile and leaves it out of exported data. Email attempts that fail remain pending for a later successful price check; the product shows the delivery error. Price checks and email alerts need the browser to be running.

## Design references

The popup adapts the [Segmented Tabs](https://21st.dev/@micka_design/components/tabs-base), [Origin UI Button](https://21st.dev/originui/button), and [Product Card](https://21st.dev/@beratberkayg/components/product-card-1) patterns from 21st.dev. Their navigation selection, button states, and product price presentation are implemented in the extension's plain HTML, CSS, and JavaScript.
