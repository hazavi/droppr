# Droppr browser extension

Droppr is a Manifest V3 extension for Chrome and other Chromium browsers. It keeps the original glass and aurora design in a compact popup, with watchlists, deals, price alerts, and price history saved in the browser.

## Install locally

1. Run `npm run build` (Node.js 20 or newer).
2. Open `chrome://extensions`, turn on **Developer mode**, then choose **Load unpacked**.
3. Select this repository's `dist` folder and pin Droppr to the toolbar.

There is no server, account, or environment file to configure. `npm run lint` checks the extension scripts. `npm run test` runs browser price-extraction fixtures and saved-price tests; it needs Chrome or Edge installed (or `CHROME_PATH` set to a browser executable).

## Use

Open a product page and click the Droppr icon. Choose **Track this page**, review or edit the detected name, current price, regular price, and image URL, select a list and alert threshold, then choose **Start tracking**. Droppr asks for access to that store so it can revisit saved pages. If automatic extraction fails, enter the product details manually; future automatic checks still depend on the store exposing a readable price. Use the pencil on a saved item to correct its price, regular price, or image. Correcting a price starts a new price history for that item. If the currency is wrong, change it in the preview or on an existing item. This changes the currency label and alert unit; it does not convert the numeric price. The popup contains recent items, deals, lists, settings, data export and import, and a manual price check.

Browser alarms run checks about every six hours while the browser is running. Checks briefly open each saved page in a background tab, read its price, then close it. Opening Droppr on a tracked product page also refreshes that item immediately. Sale pages record the reduced price and the crossed-out price when both are available. Desktop notifications fire when a price crosses the selected rule. Stores that require login, block page access, or hide prices from the page may not be readable. An unreadable price leaves the saved value intact and shows a check error on the item. Local browser storage is specific to that browser profile; export your data in Settings before switching profiles.

This extension uses desktop alerts and runs without a web server or scheduled GitHub job.

## Design references

The popup adapts the [Segmented Tabs](https://21st.dev/@micka_design/components/tabs-base), [Origin UI Button](https://21st.dev/originui/button), and [Product Card](https://21st.dev/@beratberkayg/components/product-card-1) patterns from 21st.dev. Their navigation selection, button states, and product price presentation are implemented in the extension's plain HTML, CSS, and JavaScript.
