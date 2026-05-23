"use client"

import { useState, useEffect } from "react"
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  updateProfile,
  type User,
} from "firebase/auth"
import { auth } from "@/lib/firebase"
import { createUserProfile, getUserProfile } from "@/lib/firestore"
import type { UserProfile } from "@/types"

interface AuthState {
  user: User | null
  profile: UserProfile | null
  loading: boolean
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    profile: null,
    loading: true,
  })

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const profile = await getUserProfile(user.uid)
        setState({ user, profile, loading: false })
      } else {
        setState({ user: null, profile: null, loading: false })
      }
    })
    return unsubscribe
  }, [])

  async function signIn(email: string, password: string): Promise<void> {
    await signInWithEmailAndPassword(auth, email, password)
  }

  async function signUp(
    email: string,
    password: string,
    displayName: string
  ): Promise<void> {
    const { user } = await createUserWithEmailAndPassword(auth, email, password)
    await updateProfile(user, { displayName })
    // Profile creation is best-effort — don't block the redirect if Firestore
    // is unavailable (e.g. ad-blocker). onAuthStateChanged will retry on load.
    try {
      await createUserProfile(user.uid, {
        email,
        displayName,
        notifyVia: "email",
        emailNotificationsEnabled: true,
      })
    } catch {
      // non-fatal
    }
  }

  async function signInWithGoogle(): Promise<void> {
    const provider = new GoogleAuthProvider()
    const { user } = await signInWithPopup(auth, provider)
    try {
      const existing = await getUserProfile(user.uid)
      if (!existing) {
        await createUserProfile(user.uid, {
          email: user.email ?? "",
          displayName: user.displayName ?? "",
          notifyVia: "email",
          emailNotificationsEnabled: true,
        })
      }
    } catch {
      // non-fatal
    }
  }

  async function logOut(): Promise<void> {
    await signOut(auth)
  }

  return { ...state, signIn, signUp, signInWithGoogle, logOut }
}
