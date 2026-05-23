"use client"

import { createContext, useContext, type ReactNode } from "react"
import { useAuth } from "@/hooks/useAuth"
import type { UserProfile } from "@/types"
import type { User } from "firebase/auth"

interface AuthContextValue {
  user: User | null
  profile: UserProfile | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, displayName: string) => Promise<void>
  signInWithGoogle: () => Promise<void>
  logOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const auth = useAuth()
  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>
}

export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuthContext must be used within AuthProvider")
  return ctx
}
