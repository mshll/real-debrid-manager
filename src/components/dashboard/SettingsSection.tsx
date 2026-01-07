import { useState, useEffect } from "react"
import { messages } from "~lib/messaging"
import { storage, type UserPreferences } from "~lib/storage"

interface ToggleProps {
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
}

function Toggle({ checked, onChange, disabled }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`
        relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200
        ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
        ${checked ? "bg-primary" : "bg-neutral-200 dark:bg-neutral-700"}
      `}
    >
      <span
        className={`
          inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200
          ${checked ? "translate-x-6" : "translate-x-1"}
        `}
      />
    </button>
  )
}

interface SettingRowProps {
  title: string
  description: string
  action: React.ReactNode
}

function SettingRow({ title, description, action }: SettingRowProps) {
  return (
    <div className="flex items-center justify-between px-4 py-4">
      <div className="flex-1 min-w-0 mr-4">
        <h3 className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
          {title}
        </h3>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
          {description}
        </p>
      </div>
      <div className="flex-shrink-0">
        {action}
      </div>
    </div>
  )
}

export function SettingsSection() {
  const [preferences, setPreferences] = useState<UserPreferences | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [clearingCache, setClearingCache] = useState(false)
  const [signingOut, setSigningOut] = useState(false)

  useEffect(() => {
    async function loadPreferences() {
      const prefs = await storage.getPreferences()
      setPreferences(prefs)
      setLoading(false)
    }
    loadPreferences()
  }, [])

  const updatePreference = async <K extends keyof UserPreferences>(
    key: K,
    value: UserPreferences[K]
  ) => {
    if (!preferences) return

    setSaving(true)
    const updated = await storage.setPreferences({ [key]: value })
    setPreferences(updated)
    setSaving(false)
  }

  const handleClearCache = async () => {
    if (!confirm("Clear all cached data? This will not affect your account.")) return

    setClearingCache(true)
    await storage.clearCache()
    setClearingCache(false)

    // Show success feedback
    const notification = document.createElement("div")
    notification.className = "fixed bottom-4 right-4 px-4 py-2 rounded-lg bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-sm font-medium shadow-lg z-50"
    notification.textContent = "Cache cleared successfully"
    document.body.appendChild(notification)
    setTimeout(() => notification.remove(), 2000)
  }

  const handleSignOut = async () => {
    if (!confirm("Sign out of your Real-Debrid account?")) return

    setSigningOut(true)
    const response = await messages.logout()

    if (response.success) {
      // Redirect to login or close dashboard
      window.close()
    }
    setSigningOut(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!preferences) return null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100 tracking-tight">
          Settings
        </h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
          Configure extension preferences
        </p>
      </div>

      {/* Notifications Section */}
      <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 overflow-hidden">
        <div className="px-4 py-3 border-b border-neutral-200 dark:border-neutral-800">
          <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
            Notifications
          </h2>
        </div>
        <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
          <SettingRow
            title="Enable Notifications"
            description="Show desktop notifications for completed downloads and errors"
            action={
              <Toggle
                checked={preferences.notificationsEnabled}
                onChange={(checked) => updatePreference("notificationsEnabled", checked)}
                disabled={saving}
              />
            }
          />
        </div>
      </div>

      {/* Behavior Section */}
      <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 overflow-hidden">
        <div className="px-4 py-3 border-b border-neutral-200 dark:border-neutral-800">
          <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
            Behavior
          </h2>
        </div>
        <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
          <SettingRow
            title="Auto Unrestrict"
            description="Automatically unrestrict supported links when detected"
            action={
              <Toggle
                checked={preferences.autoUnrestrict}
                onChange={(checked) => updatePreference("autoUnrestrict", checked)}
                disabled={saving}
              />
            }
          />
          <SettingRow
            title="Auto Select Files"
            description="Automatically select all files when adding torrents via context menu"
            action={
              <Toggle
                checked={preferences.autoSelectFiles}
                onChange={(checked) => updatePreference("autoSelectFiles", checked)}
                disabled={saving}
              />
            }
          />
          <SettingRow
            title="Auto-Scan Pages"
            description="Automatically detect supported links when visiting pages"
            action={
              <Toggle
                checked={preferences.autoScanEnabled}
                onChange={(checked) => updatePreference("autoScanEnabled", checked)}
                disabled={saving}
              />
            }
          />
        </div>
      </div>

      {/* Data Section */}
      <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 overflow-hidden">
        <div className="px-4 py-3 border-b border-neutral-200 dark:border-neutral-800">
          <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
            Data & Storage
          </h2>
        </div>
        <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
          <SettingRow
            title="Clear Cache"
            description="Remove cached profile and host data"
            action={
              <button
                onClick={handleClearCache}
                disabled={clearingCache}
                className="px-3 py-1.5 rounded-lg text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 transition-colors disabled:opacity-50"
              >
                {clearingCache ? "Clearing..." : "Clear"}
              </button>
            }
          />
        </div>
      </div>

      {/* Account Section */}
      <div className="rounded-lg border border-red-200 dark:border-red-900/50 bg-white dark:bg-neutral-900 overflow-hidden">
        <div className="px-4 py-3 border-b border-red-200 dark:border-red-900/50">
          <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
            Account
          </h2>
        </div>
        <div className="divide-y divide-red-100 dark:divide-red-900/30">
          <SettingRow
            title="Sign Out"
            description="Sign out and remove your API token from this browser"
            action={
              <button
                onClick={handleSignOut}
                disabled={signingOut}
                className="px-3 py-1.5 rounded-lg text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 border border-red-200 dark:border-red-900/50 transition-colors disabled:opacity-50"
              >
                {signingOut ? "Signing out..." : "Sign Out"}
              </button>
            }
          />
        </div>
      </div>

      {/* Version Info */}
      <div className="text-center pt-4">
        <p className="text-xs text-neutral-400 dark:text-neutral-500">
          Real-Debrid Manager v1.0.0
        </p>
        <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-0.5">
          Built by <a href="https://meshal.me" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">meshal.me</a>
        </p>
      </div>
    </div>
  )
}
