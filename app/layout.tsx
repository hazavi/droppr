import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Toaster } from "sonner"
import { AuthProvider } from "@/components/providers/auth-provider"
import "./globals.css"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: { default: "Droppr", template: "%s | Droppr" },
  description: "Track prices across any online retailer. Get notified when prices drop.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <body className="min-h-full bg-[#0a0a0a] text-neutral-100">
        <AuthProvider>
          {children}
          <Toaster
            position="bottom-right"
            theme="dark"
            toastOptions={{
              classNames: {
                toast: "border-white/10 bg-[#1a1a1a]",
              },
            }}
          />
        </AuthProvider>
      </body>
    </html>
  )
}
