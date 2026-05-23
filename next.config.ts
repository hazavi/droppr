import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
      { protocol: "http", hostname: "**" },
    ],
  },
  // Exclude Puppeteer / Chromium from the client-side bundle
  serverExternalPackages: ["puppeteer-core", "puppeteer-extra", "puppeteer-extra-plugin-stealth", "@sparticuz/chromium-min"],
}

export default nextConfig
