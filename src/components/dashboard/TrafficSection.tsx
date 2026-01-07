import { AlertCircle, RefreshCw } from "lucide-react"
import { useState, useEffect, useCallback } from "react"
import { messages } from "~lib/messaging"
import type { TrafficInfo } from "~lib/api/traffic"

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B"
  const k = 1024
  const sizes = ["B", "KB", "MB", "GB", "TB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
}

function getUsagePercent(info: { left: number; bytes: number }): number {
  if (info.bytes === 0) return 0
  const used = info.bytes - info.left
  return Math.round((used / info.bytes) * 100)
}

export function TrafficSection() {
  const [traffic, setTraffic] = useState<TrafficInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTraffic = useCallback(async () => {
    setLoading(true)
    setError(null)

    const response = await messages.getTraffic()

    if (response.success && response.data) {
      setTraffic(response.data)
    } else {
      setError(response.error ?? "Failed to load traffic info")
    }

    setLoading(false)
  }, [])

  useEffect(() => {
    fetchTraffic()
  }, [fetchTraffic])

  // Calculate stats
  const hosts = traffic ? Object.entries(traffic) : []
  const totalRemaining = hosts.reduce((sum, [, info]) => sum + info.left, 0)
  const totalBytes = hosts.reduce((sum, [, info]) => sum + info.bytes, 0)
  const limitedHosts = hosts.filter(([, info]) => info.bytes > 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100 tracking-tight">
            Traffic
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Bandwidth usage for limited hosters
          </p>
        </div>
        <button
          onClick={fetchTraffic}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center mb-3">
            <AlertCircle size={24} className="text-red-500" />
          </div>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-2">{error}</p>
          <button
            onClick={fetchTraffic}
            className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
          >
            Try again
          </button>
        </div>
      ) : limitedHosts.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
            <span className="text-2xl">*</span>
          </div>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            No limited hosters
          </p>
          <p className="text-xs text-neutral-500 dark:text-neutral-500 mt-1">
            Premium accounts have unlimited traffic on most hosters
          </p>
        </div>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
              <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wide mb-1">
                Total Remaining
              </p>
              <p className="text-2xl font-semibold text-primary tabular-nums">
                {formatBytes(totalRemaining)}
              </p>
            </div>
            <div className="p-4 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
              <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wide mb-1">
                Total Available
              </p>
              <p className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100 tabular-nums">
                {formatBytes(totalBytes)}
              </p>
            </div>
            <div className="p-4 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
              <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wide mb-1">
                Limited Hosters
              </p>
              <p className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100 tabular-nums">
                {limitedHosts.length}
              </p>
            </div>
          </div>

          {/* Host List */}
          <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 overflow-hidden">
            <div className="px-4 py-3 border-b border-neutral-200 dark:border-neutral-800">
              <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                Traffic by Host
              </h2>
            </div>
            <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {limitedHosts.map(([host, info]) => (
                <HostTrafficRow key={host} host={host} info={info} />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

interface HostTrafficRowProps {
  host: string
  info: {
    left: number
    bytes: number
    links: number
    limit: number
    type: string
    extra: number
    reset: string
  }
}

function HostTrafficRow({ host, info }: HostTrafficRowProps) {
  const usagePercent = getUsagePercent(info)
  const used = info.bytes - info.left
  const isLow = usagePercent > 80

  return (
    <div className="px-4 py-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
          {host}
        </span>
        <span className="text-xs text-neutral-500 dark:text-neutral-400 tabular-nums">
          {formatBytes(info.left)} remaining
        </span>
      </div>
      {/* Progress bar */}
      <div className="h-2 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${
            isLow ? "bg-amber-500" : "bg-primary"
          }`}
          style={{ width: `${usagePercent}%` }}
        />
      </div>
      <div className="flex items-center justify-between mt-1.5">
        <span className="text-[10px] text-neutral-400 dark:text-neutral-500 tabular-nums">
          {formatBytes(used)} / {formatBytes(info.bytes)} used
        </span>
        <span className="text-[10px] text-neutral-400 dark:text-neutral-500">
          {info.type === "links" ? `${info.links} links` : `${usagePercent}%`}
        </span>
      </div>
      {info.reset && (
        <p className="text-[10px] text-neutral-400 dark:text-neutral-500 mt-1">
          Resets: {info.reset}
        </p>
      )}
    </div>
  )
}

export default TrafficSection
