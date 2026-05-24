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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-zinc-50 text-slate-900">
        <AuthProvider>
          {children}
          <Toaster
            position="bottom-right"
            theme="light"
            toastOptions={{
              classNames: {
                toast: "border-slate-200 bg-white shadow-lg",
              },
            }}
          />
        </AuthProvider>
      </body>
    </html>
  )
}
