"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { motion } from "framer-motion"
import { Loader2, User, Bell, AlertTriangle, LogOut } from "lucide-react"
import { GlassPanel } from "@/components/ui/liquid-glass"
import { toast } from "sonner"
import { useAuthContext } from "@/components/providers/auth-provider"
import { useRouter } from "next/navigation"
import { updateUserProfile } from "@/lib/firestore"
import { updateProfile, deleteUser, EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth"
import { auth } from "@/lib/firebase"

const profileSchema = z.object({
  displayName: z.string().min(1, "Name is required").max(60),
  email: z.string().email("Invalid email"),
})

type ProfileValues = z.infer<typeof profileSchema>

const notifSchema = z.object({
  emailNotificationsEnabled: z.boolean(),
})

type NotifValues = z.infer<typeof notifSchema>

export default function SettingsPage() {
  const { user, profile, logOut } = useAuthContext()
  const router = useRouter()
  const [profileLoading, setProfileLoading] = useState(false)
  const [notifLoading, setNotifLoading] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState("")
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [showDeleteZone, setShowDeleteZone] = useState(false)
  const [signOutLoading, setSignOutLoading] = useState(false)

  async function handleSignOut() {
    setSignOutLoading(true)
    try {
      await logOut()
      router.replace("/login")
    } catch {
      toast.error("Failed to sign out")
    } finally {
      setSignOutLoading(false)
    }
  }

  const profileForm = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      displayName: profile?.displayName ?? "",
      email: profile?.email ?? "",
    },
  })

  const notifForm = useForm<NotifValues>({
    resolver: zodResolver(notifSchema),
    defaultValues: {
      emailNotificationsEnabled: profile?.emailNotificationsEnabled ?? true,
    },
  })

  async function onProfileSubmit(values: ProfileValues) {
    if (!user) return
    setProfileLoading(true)
    try {
      await updateProfile(user, { displayName: values.displayName })
      await updateUserProfile(user.uid, {
        displayName: values.displayName,
        email: values.email,
      })
      toast.success("Profile updated")
    } catch {
      toast.error("Failed to update profile")
    } finally {
      setProfileLoading(false)
    }
  }

  async function onNotifSubmit(values: NotifValues) {
    if (!user) return
    setNotifLoading(true)
    try {
      await updateUserProfile(user.uid, {
        emailNotificationsEnabled: values.emailNotificationsEnabled,
      })
      toast.success("Notification preferences saved")
    } catch {
      toast.error("Failed to save preferences")
    } finally {
      setNotifLoading(false)
    }
  }

  async function handleDeleteAccount() {
    if (!user || deleteConfirm !== "delete my account") return
    setDeleteLoading(true)
    try {
      await deleteUser(user)
      toast.success("Account deleted")
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : ""
      if (msg.includes("requires-recent-login")) {
        toast.error("Please sign out and sign back in, then try again")
      } else {
        toast.error("Failed to delete account")
      }
    } finally {
      setDeleteLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="mt-1 text-sm text-slate-500">
          Manage your account and preferences
        </p>
      </motion.div>

      {/* Profile section */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.05 }}
      >
      <GlassPanel className="p-6">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50">
            <User className="h-4 w-4 text-indigo-500" />
          </div>
          <h2 className="text-base font-semibold text-slate-800">Profile</h2>
        </div>

        <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Display name
            </label>
            <input
              {...profileForm.register("displayName")}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400/40 shadow-sm"
            />
            {profileForm.formState.errors.displayName && (
              <p className="mt-1 text-xs text-red-400">
                {profileForm.formState.errors.displayName.message}
              </p>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Notification email
            </label>
            <input
              {...profileForm.register("email")}
              type="email"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400/40 shadow-sm"
            />
            {profileForm.formState.errors.email && (
              <p className="mt-1 text-xs text-red-500">
                {profileForm.formState.errors.email.message}
              </p>
            )}
            <p className="mt-1.5 text-xs text-slate-400">
              Price drop alerts are sent to this address
            </p>
          </div>

          <button
            type="submit"
            disabled={profileLoading}
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:opacity-60"
          >
            {profileLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            Save changes
          </button>
        </form>
      </GlassPanel>
      </motion.section>

      {/* Notifications section */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
      <GlassPanel className="p-6">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50">
            <Bell className="h-4 w-4 text-indigo-500" />
          </div>
          <h2 className="text-base font-semibold text-slate-800">Notifications</h2>
        </div>

        <form onSubmit={notifForm.handleSubmit(onNotifSubmit)} className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-slate-700">Email notifications</p>
              <p className="mt-0.5 text-xs text-slate-400">
                Receive email alerts when tracked prices drop
              </p>
            </div>
            <label className="relative inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                {...notifForm.register("emailNotificationsEnabled")}
                className="sr-only peer"
              />
              <div className="h-5 w-9 rounded-full bg-slate-200 peer-checked:bg-indigo-600 peer-focus:ring-2 peer-focus:ring-indigo-400/40 transition-colors after:absolute after:left-0.5 after:top-0.5 after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-transform peer-checked:after:translate-x-4" />
            </label>
          </div>

          <button
            type="submit"
            disabled={notifLoading}
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:opacity-60"
          >
            {notifLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            Save preferences
          </button>
        </form>
      </GlassPanel>
      </motion.section>

      {/* Sign out */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.13 }}
      >
      <GlassPanel className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-800">Sign out</p>
            <p className="mt-0.5 text-xs text-slate-400">{profile?.email}</p>
          </div>
          <button
            onClick={handleSignOut}
            disabled={signOutLoading}
            className="flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-60"
          >
            {signOutLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
            Sign out
          </button>
        </div>
      </GlassPanel>
      </motion.section>

      {/* Danger zone */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.15 }}
      >
      <GlassPanel className="glass-panel-danger border border-red-200/60 p-6">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </div>
          <h2 className="text-base font-semibold text-slate-800">Danger Zone</h2>
        </div>

        {!showDeleteZone ? (
          <div>
            <p className="text-sm text-slate-500 mb-3">
              Permanently delete your account and all tracked data. This cannot be undone.
            </p>
            <button
              onClick={() => setShowDeleteZone(true)}
              className="rounded-lg border border-red-200 px-4 py-2.5 text-sm font-medium text-red-500 transition-colors hover:bg-red-50"
            >
              Delete account
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-slate-700">
              Type <strong className="text-slate-900">delete my account</strong> to confirm:
            </p>
            <input
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              placeholder="delete my account"
              className="w-full rounded-lg border border-red-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-red-400 focus:ring-1 focus:ring-red-400/40 shadow-sm"
            />
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteZone(false)
                  setDeleteConfirm("")
                }}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-500 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleteConfirm !== "delete my account" || deleteLoading}
                className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-50 transition-colors"
              >
                {deleteLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                Permanently delete
              </button>
            </div>
          </div>
        )}
      </GlassPanel>
      </motion.section>
    </div>
  )
}
