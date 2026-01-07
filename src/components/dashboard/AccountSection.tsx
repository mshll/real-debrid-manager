import { AlertCircle, Gift, Loader2 } from "lucide-react"
import { useState, useEffect, useCallback } from "react"
import { messages } from "~lib/messaging"
import type { UserProfile } from "~lib/api/user"

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B"
  const k = 1024
  const sizes = ["B", "KB", "MB", "GB", "TB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric"
  })
}

function getDaysUntil(dateString: string): number {
  const expiration = new Date(dateString)
  const now = new Date()
  const diffTime = expiration.getTime() - now.getTime()
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

interface StatCardProps {
  label: string
  value: string | number
  subtext?: string
  variant?: "default" | "accent"
}

function StatCard({ label, value, subtext, variant = "default" }: StatCardProps) {
  return (
    <div className="p-4 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
      <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wide mb-1">
        {label}
      </p>
      <p
        className={`text-2xl font-semibold tracking-tight tabular-nums ${
          variant === "accent"
            ? "text-primary"
            : "text-neutral-900 dark:text-neutral-100"
        }`}
      >
        {value}
      </p>
      {subtext && (
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
          {subtext}
        </p>
      )}
    </div>
  )
}

export function AccountSection() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isConverting, setIsConverting] = useState(false)
  const [convertError, setConvertError] = useState<string | null>(null)
  const [convertSuccess, setConvertSuccess] = useState(false)

  const fetchProfile = useCallback(async () => {
    setLoading(true)
    setError(null)

    const response = await messages.getUserProfile()

    if (response.success && response.data) {
      setProfile(response.data)
    } else {
      setError(response.error ?? "Failed to load profile")
    }

    setLoading(false)
  }, [])

  useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  const handleConvertPoints = async () => {
    if (!profile || profile.points < 1000) return

    if (!confirm(`Convert ${profile.points.toLocaleString()} fidelity points to premium time?\n\n1000 points = 1 day of premium`)) {
      return
    }

    setIsConverting(true)
    setConvertError(null)
    setConvertSuccess(false)

    const response = await messages.convertPoints()

    if (response.success) {
      setConvertSuccess(true)
      // Refresh profile to get updated points and premium time
      await fetchProfile()
      setTimeout(() => setConvertSuccess(false), 3000)
    } else {
      setConvertError(response.error || "Failed to convert points")
    }

    setIsConverting(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center mb-3">
          <AlertCircle size={24} className="text-red-500" />
        </div>
        <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-2">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
        >
          Try again
        </button>
      </div>
    )
  }

  if (!profile) return null

  const premiumDays = getDaysUntil(profile.expiration)
  const isPremium = profile.type === "premium"

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100 tracking-tight">
          Account
        </h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
          Manage your Real-Debrid account
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Premium Days"
          value={premiumDays > 0 ? premiumDays : 0}
          subtext={isPremium ? "days remaining" : "Not premium"}
          variant={isPremium && premiumDays > 0 ? "accent" : "default"}
        />
        <div className="p-4 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
          <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wide mb-1">
            Fidelity Points
          </p>
          <p className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100 tracking-tight tabular-nums">
            {profile.points.toLocaleString()}
          </p>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            1000 points = 1 day premium
          </p>
          {profile.points >= 1000 && (
            <button
              onClick={handleConvertPoints}
              disabled={isConverting}
              className="mt-3 w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-primary text-neutral-900 hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {isConverting ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Gift size={14} />
              )}
              {isConverting ? "Converting..." : "Convert to Premium"}
            </button>
          )}
          {convertSuccess && (
            <p className="mt-2 text-xs text-primary">Points converted successfully!</p>
          )}
          {convertError && (
            <p className="mt-2 text-xs text-red-500">{convertError}</p>
          )}
        </div>
        <StatCard
          label="Account Type"
          value={isPremium ? "Premium" : "Free"}
          subtext={isPremium ? `Expires ${formatDate(profile.expiration)}` : "Upgrade for full features"}
          variant={isPremium ? "accent" : "default"}
        />
      </div>

      {/* Account Details Card */}
      <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 overflow-hidden">
        <div className="px-4 py-3 border-b border-neutral-200 dark:border-neutral-800">
          <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
            Account Details
          </h2>
        </div>
        <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
          <DetailRow label="Username" value={profile.username} />
          <DetailRow label="Email" value={profile.email} />
          <DetailRow label="User ID" value={String(profile.id)} mono />
          <DetailRow
            label="Status"
            value={
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                  isPremium
                    ? "bg-primary/10 text-primary"
                    : "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400"
                }`}
              >
                {isPremium ? "Premium" : "Free"}
              </span>
            }
          />
          <DetailRow label="Expiration" value={formatDate(profile.expiration)} />
          <DetailRow label="Locale" value={profile.locale.toUpperCase()} />
        </div>
      </div>
    </div>
  )
}

interface DetailRowProps {
  label: string
  value: string | React.ReactNode
  mono?: boolean
}

function DetailRow({ label, value, mono }: DetailRowProps) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <span className="text-sm text-neutral-500 dark:text-neutral-400">{label}</span>
      <span
        className={`text-sm text-neutral-900 dark:text-neutral-100 ${
          mono ? "font-mono tabular-nums" : ""
        }`}
      >
        {value}
      </span>
    </div>
  )
}
