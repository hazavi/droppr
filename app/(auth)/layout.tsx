import type { ReactNode } from "react"

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div
      className="flex min-h-screen items-center justify-center p-4"
      style={{
        background:
          "radial-gradient(ellipse at 30% 40%, rgba(99,102,241,0.18) 0%, transparent 60%), " +
          "radial-gradient(ellipse at 75% 65%, rgba(168,85,247,0.14) 0%, transparent 55%), " +
          "#0a0a0a",
      }}
    >
      <div className="w-full max-w-sm">{children}</div>
    </div>
  )
}
