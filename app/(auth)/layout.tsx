import type { ReactNode } from "react"
import { AuroraBackground } from "@/components/ui/aurora-background"

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <AuroraBackground>
      <div className="relative z-10 w-full max-w-sm px-4 py-8">{children}</div>
    </AuroraBackground>
  )
}
