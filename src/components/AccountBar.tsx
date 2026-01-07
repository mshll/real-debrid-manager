import logoImage from "data-base64:~assets/logo.png"

import type { UserProfile } from "~lib/api/user"

interface AccountBarProps {
  user: UserProfile
}

function formatDaysRemaining(expiration: string): string {
  const expirationDate = new Date(expiration)
  const now = new Date()
  const diffTime = expirationDate.getTime() - now.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  if (diffDays < 0) return "Expired"
  if (diffDays === 0) return "Today"
  if (diffDays === 1) return "1 day"
  return `${diffDays} days`
}

function formatPoints(points: number): string {
  if (points >= 1000) {
    return `${(points / 1000).toFixed(1)}k`
  }
  return points.toString()
}

export function AccountBar({ user }: AccountBarProps) {
  const daysRemaining = formatDaysRemaining(user.expiration)
  const isPremium = user.type === "premium"

  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-neutral-200 dark:border-neutral-800">
      {/* RD Logo */}
      <img src={logoImage} alt="Real-Debrid" className="w-6 h-6" />

      {/* User info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">
            {user.username}
          </span>
          {isPremium && (
            <span className="px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide rounded bg-primary/20 text-primary dark:bg-primary/15">
              Premium
            </span>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-3 text-xs">
        <div className="flex flex-col items-end">
          <span className="text-neutral-500 dark:text-neutral-400">Expires</span>
          <span className="font-medium tabular-nums text-neutral-900 dark:text-neutral-100">
            {daysRemaining}
          </span>
        </div>
        <div className="w-px h-6 bg-neutral-200 dark:bg-neutral-700" />
        <div className="flex flex-col items-end">
          <span className="text-neutral-500 dark:text-neutral-400">Points</span>
          <span className="font-medium tabular-nums text-neutral-900 dark:text-neutral-100">
            {formatPoints(user.points)}
          </span>
        </div>
      </div>
    </div>
  )
}

export default AccountBar
