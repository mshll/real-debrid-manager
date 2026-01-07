import { useState, useEffect } from "react"

import { useStorage } from "@plasmohq/storage/hook"

import "~style.css"

import { Sidebar, type Section } from "~components/dashboard/Sidebar"
import { AccountSection } from "~components/dashboard/AccountSection"
import { TorrentsSection } from "~components/dashboard/TorrentsSection"
import { DownloadsSection } from "~components/dashboard/DownloadsSection"
import { HostsSection } from "~components/dashboard/HostsSection"
import { SettingsSection } from "~components/dashboard/SettingsSection"
import { messages } from "~lib/messaging"
import type { AuthData } from "~lib/auth"
import { authStorage, STORAGE_KEYS } from "~lib/storage"

function Dashboard() {
  const [activeSection, setActiveSection] = useState<Section>("account")
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)

  // Watch for auth changes from other contexts (e.g., signed out in popup)
  const [authData] = useStorage<AuthData | null>({
    key: STORAGE_KEYS.AUTH_DATA,
    instance: authStorage,
  })

  // Read URL hash for initial section
  useEffect(() => {
    const hash = window.location.hash.slice(1) // Remove #
    if (hash && ["account", "torrents", "downloads", "hosts", "settings"].includes(hash)) {
      setActiveSection(hash as Section)
    }
  }, [])

  useEffect(() => {
    // Check authentication status
    async function checkAuth() {
      const response = await messages.checkAuthStatus()
      setIsAuthenticated(response.success && response.data?.authenticated === true)
    }
    checkAuth()
  }, [])

  // Handle auth state changes from other contexts
  useEffect(() => {
    if (authData === null && isAuthenticated === true) {
      setIsAuthenticated(false)
    } else if (authData !== null && isAuthenticated === false) {
      // Auth was restored, refresh auth status
      setIsAuthenticated(true)
    }
  }, [authData, isAuthenticated])

  // Show loading while checking auth
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // Show login prompt if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-6 text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl font-bold text-primary">RD</span>
            </div>
            <h1 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
              Not Signed In
            </h1>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-6">
              Please sign in through the extension popup to access the dashboard.
            </p>
            <button
              onClick={() => window.close()}
              className="w-full py-2 px-4 rounded-lg text-sm font-medium bg-primary text-neutral-900 hover:bg-primary/90 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    )
  }

  const renderSection = () => {
    switch (activeSection) {
      case "account":
        return <AccountSection />
      case "torrents":
        return <TorrentsSection />
      case "downloads":
        return <DownloadsSection />
      case "hosts":
        return <HostsSection />
      case "settings":
        return <SettingsSection />
      default:
        return <AccountSection />
    }
  }

  return (
    <div className="h-screen bg-neutral-50 dark:bg-neutral-950 flex overflow-hidden">
      {/* Sidebar */}
      <Sidebar
        activeSection={activeSection}
        onSectionChange={setActiveSection}
      />

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto p-6 lg:p-8">
          {renderSection()}
        </div>
      </main>
    </div>
  )
}

export default Dashboard
