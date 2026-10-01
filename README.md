# Droppr browser extension

Droppr is a Manifest V3 extension for Chrome and other Chromium browsers. It keeps the original glass and aurora design in a compact popup, with watchlists, deals, price alerts, and price history saved in the browser.

## Install locally

1. Run `npm run build` (Node.js 20 or newer).
2. Open `chrome://extensions`, turn on **Developer mode**, then choose **Load unpacked**.
3. Select this repository's `dist` folder and pin Droppr to the toolbar.

There is no server, account, or environment file to configure. `npm run lint` checks the extension scripts.

## Use

Open a product page and click the Droppr icon. Choose **Track this page**, review the detected name and price, select a list and alert threshold, then choose **Start tracking**. Droppr asks for access to that store so it can revisit saved pages. The popup contains recent items, deals, lists, settings, data export and import, and a manual price check.

Browser alarms run checks about every six hours while the browser is running. Checks briefly open each saved page in a background tab, read its price, then close it. Desktop notifications fire when a price crosses the selected rule. Stores that require login, block page access, or hide prices from the page may not be readable. An unchanged or unreadable price leaves the saved value intact. Local browser storage is specific to that browser profile; export your data in Settings before switching profiles.

This extension uses desktop alerts and runs without a web server or scheduled GitHub job.
