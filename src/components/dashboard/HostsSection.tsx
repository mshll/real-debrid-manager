import { AlertCircle, CheckCircle, RefreshCw, Search, XCircle, AlertTriangle } from "lucide-react"
import { useState, useEffect, useCallback, useMemo } from "react"
import { messages } from "~lib/messaging"
import type { HostInfo } from "~lib/api/hosts"

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  })
}

type HostStatus = "up" | "down" | "unknown"

function getStatusFromString(status: string): HostStatus {
  const s = status.toLowerCase()
  if (s === "up" || s === "online" || s === "working") return "up"
  if (s === "down" || s === "offline" || s === "error") return "down"
  return "unknown"
}

function getStatusConfig(status: HostStatus) {
  switch (status) {
    case "up":
      return {
        icon: CheckCircle,
        color: "text-primary",
        bgColor: "bg-primary/10",
        label: "Online",
      }
    case "down":
      return {
        icon: XCircle,
        color: "text-red-500",
        bgColor: "bg-red-500/10",
        label: "Offline",
      }
    default:
      return {
        icon: AlertTriangle,
        color: "text-amber-500",
        bgColor: "bg-amber-500/10",
        label: "Unknown",
      }
  }
}

export function HostsSection() {
  const [hosts, setHosts] = useState<Record<string, HostInfo> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<HostStatus | "all">("all")

  const fetchHosts = useCallback(async () => {
    setLoading(true)
    setError(null)

    const response = await messages.getHostsStatus()

    if (response.success && response.data) {
      setHosts(response.data)
    } else {
      setError(response.error ?? "Failed to load hosts")
    }

    setLoading(false)
  }, [])

  useEffect(() => {
    fetchHosts()
  }, [fetchHosts])

  // Calculate stats
  const hostList = useMemo(() => {
    if (!hosts) return []
    return Object.entries(hosts).map(([id, info]) => ({
      id,
      ...info,
      normalizedStatus: getStatusFromString(info.status),
    }))
  }, [hosts])

  const stats = useMemo(() => {
    const up = hostList.filter((h) => h.normalizedStatus === "up").length
    const down = hostList.filter((h) => h.normalizedStatus === "down").length
    const unknown = hostList.filter((h) => h.normalizedStatus === "unknown").length
    return { total: hostList.length, up, down, unknown }
  }, [hostList])

  // Filter hosts
  const filteredHosts = useMemo(() => {
    return hostList.filter((host) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        if (
          !host.name.toLowerCase().includes(query) &&
          !host.id.toLowerCase().includes(query)
        ) {
          return false
        }
      }
      // Status filter
      if (statusFilter !== "all" && host.normalizedStatus !== statusFilter) {
        return false
      }
      return true
    })
  }, [hostList, searchQuery, statusFilter])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100 tracking-tight">
            Host Status
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Status of supported file hosters
          </p>
        </div>
        <button
          onClick={fetchHosts}
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
            onClick={fetchHosts}
            className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
          >
            Try again
          </button>
        </div>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
              <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wide mb-1">
                Total Hosts
              </p>
              <p className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100 tabular-nums">
                {stats.total}
              </p>
            </div>
            <div className="p-4 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
              <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wide mb-1">
                Online
              </p>
              <p className="text-2xl font-semibold text-primary tabular-nums">
                {stats.up}
              </p>
            </div>
            <div className="p-4 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
              <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wide mb-1">
                Offline
              </p>
              <p className="text-2xl font-semibold text-red-500 tabular-nums">
                {stats.down}
              </p>
            </div>
            <div className="p-4 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
              <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wide mb-1">
                Unknown
              </p>
              <p className="text-2xl font-semibold text-amber-500 tabular-nums">
                {stats.unknown}
              </p>
            </div>
          </div>

          {/* Search and Filter */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
              />
              <input
                type="text"
                placeholder="Search hosts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-10 pl-9 pr-4 text-sm rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
              />
            </div>
            <div className="flex gap-2">
              {(["all", "up", "down", "unknown"] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setStatusFilter(filter)}
                  className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    statusFilter === filter
                      ? "bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900"
                      : "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700"
                  }`}
                >
                  {filter === "all" ? "All" : filter.charAt(0).toUpperCase() + filter.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Host List */}
          <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 overflow-hidden">
            {filteredHosts.length === 0 ? (
              <div className="p-8 text-center text-sm text-neutral-500 dark:text-neutral-400">
                No hosts found matching your criteria
              </div>
            ) : (
              <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {filteredHosts.map((host) => (
                  <HostRow key={host.id} host={host} />
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

interface HostRowProps {
  host: HostInfo & { normalizedStatus: HostStatus }
}

function HostRow({ host }: HostRowProps) {
  const status = getStatusConfig(host.normalizedStatus)
  const StatusIcon = status.icon

  return (
    <div className="px-4 py-3 flex items-center gap-3">
      {/* Host Icon */}
      <div className="w-8 h-8 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center flex-shrink-0 overflow-hidden">
        {host.image ? (
          <img
            src={host.image}
            alt={host.name}
            className="w-5 h-5 object-contain"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none"
            }}
          />
        ) : (
          <span className="text-xs font-bold text-neutral-400">
            {host.name.slice(0, 2).toUpperCase()}
          </span>
        )}
      </div>

      {/* Host Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">
          {host.name}
        </p>
        {host.check_time && (
          <p className="text-[10px] text-neutral-400 dark:text-neutral-500">
            Last checked: {formatDate(host.check_time)}
          </p>
        )}
      </div>

      {/* Status Badge */}
      <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full ${status.bgColor}`}>
        <StatusIcon size={14} className={status.color} />
        <span className={`text-xs font-medium ${status.color}`}>{status.label}</span>
      </div>
    </div>
  )
}

export default HostsSection
