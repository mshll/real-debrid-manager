import { AlertCircle, Check, Copy, Download, RefreshCw, Trash2 } from "lucide-react"
import { useState, useEffect, useCallback } from "react"
import { messages } from "~lib/messaging"
import type { DownloadItem } from "~lib/api/downloads"
import type { UnrestrictedLink } from "~lib/api/unrestrict"
import { UnrestrictInput } from "~components/UnrestrictInput"

// NOTE: Streaming feature disabled - Real-Debrid API returns "not_allowed_method" error (code 4)
// for GET /streaming/transcode/{id} and GET /streaming/mediaInfos/{id} endpoints despite
// documentation saying they should work. The feature works on their website but not via API.

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B"
  const k = 1024
  const sizes = ["B", "KB", "MB", "GB", "TB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  })
}

function getHostName(host: string): string {
  try {
    return new URL(`https://${host}`).hostname.replace("www.", "")
  } catch {
    return host
  }
}

export function DownloadsSection() {
  const [downloads, setDownloads] = useState<DownloadItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const fetchDownloads = useCallback(async () => {
    setLoading(true)
    setError(null)

    const response = await messages.listDownloads()

    if (response.success && response.data) {
      setDownloads(response.data)
    } else {
      setError(response.error ?? "Failed to load downloads")
    }

    setLoading(false)
  }, [])

  useEffect(() => {
    fetchDownloads()
  }, [fetchDownloads])

  const handleDownload = (download: DownloadItem) => {
    window.open(download.download, "_blank")
  }

  const handleCopyLink = async (download: DownloadItem) => {
    try {
      await navigator.clipboard.writeText(download.download)
      setCopiedId(download.id)
      setTimeout(() => setCopiedId(null), 2000)
    } catch (err) {
      console.error("Failed to copy link:", err)
    }
  }

  const handleDelete = async (downloadId: string) => {
    if (!confirm("Are you sure you want to remove this download from history?")) return

    setActionLoading(downloadId)
    const response = await messages.deleteDownload(downloadId)
    if (response.success) {
      setDownloads(downloads.filter((d) => d.id !== downloadId))
    }
    setActionLoading(null)
  }

  const handleUnrestrict = async (link: string): Promise<UnrestrictedLink> => {
    const response = await messages.unrestrictLink(link)
    if (!response.success || !response.data) {
      throw new Error(response.error ?? "Failed to unrestrict link")
    }
    // Refresh downloads list after unrestricting
    fetchDownloads()
    return response.data
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100 tracking-tight">
            Downloads
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Your unrestricted link history
          </p>
        </div>
        <button
          onClick={fetchDownloads}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Unrestrict Input */}
      <div className="py-4 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800">
        <h2 className="px-4 text-sm font-medium text-neutral-900 dark:text-neutral-100 mb-2">
          Unrestrict Link
        </h2>
        <UnrestrictInput onUnrestrict={handleUnrestrict} />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
          <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wide mb-1">
            Total Downloads
          </p>
          <p className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100 tabular-nums">
            {downloads.length}
          </p>
        </div>
        <div className="p-4 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
          <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wide mb-1">
            Total Size
          </p>
          <p className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100 tabular-nums">
            {formatBytes(downloads.reduce((sum, d) => sum + d.filesize, 0))}
          </p>
        </div>
        <div className="p-4 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 col-span-2 sm:col-span-1">
          <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wide mb-1">
            Unique Hosts
          </p>
          <p className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100 tabular-nums">
            {new Set(downloads.map((d) => d.host)).size}
          </p>
        </div>
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
            onClick={fetchDownloads}
            className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
          >
            Try again
          </button>
        </div>
      ) : downloads.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <div className="w-12 h-12 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center mb-3">
            <Download size={24} className="text-neutral-400" />
          </div>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            No downloads yet
          </p>
          <p className="text-xs text-neutral-500 dark:text-neutral-500 mt-1">
            Unrestricted links will appear here
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 overflow-hidden">
          <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {downloads.map((download) => (
              <DownloadRow
                key={download.id}
                download={download}
                onDownload={() => handleDownload(download)}
                onCopyLink={() => handleCopyLink(download)}
                onDelete={() => handleDelete(download.id)}
                isLoading={actionLoading === download.id}
                isCopied={copiedId === download.id}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

interface DownloadRowProps {
  download: DownloadItem
  onDownload: () => void
  onCopyLink: () => void
  onDelete: () => void
  isLoading: boolean
  isCopied: boolean
}

function DownloadRow({ download, onDownload, onCopyLink, onDelete, isLoading, isCopied }: DownloadRowProps) {
  return (
    <div className="px-4 py-3 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
      <div className="flex items-start gap-3">
        {/* Host Icon */}
        <div className="w-8 h-8 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center flex-shrink-0 overflow-hidden">
          {download.host_icon ? (
            <img
              src={download.host_icon}
              alt={download.host}
              className="w-5 h-5 object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none"
              }}
            />
          ) : (
            <Download size={16} className="text-neutral-400" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate mb-1">
            {download.filename}
          </h3>
          <div className="flex items-center gap-3 text-xs text-neutral-500 dark:text-neutral-400">
            <span className="font-mono tabular-nums">{formatBytes(download.filesize)}</span>
            <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400">
              {getHostName(download.host)}
            </span>
            <span>{formatDate(download.generated)}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={onDownload}
            disabled={isLoading}
            className="p-1.5 rounded-md text-primary hover:bg-primary/10 transition-colors disabled:opacity-50"
            title="Download"
          >
            <Download size={16} />
          </button>
          <button
            onClick={onCopyLink}
            disabled={isLoading}
            className="p-1.5 rounded-md text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors disabled:opacity-50"
            title={isCopied ? "Copied!" : "Copy Link"}
          >
            {isCopied ? (
              <Check size={16} className="text-primary" />
            ) : (
              <Copy size={16} />
            )}
          </button>
          <button
            onClick={onDelete}
            disabled={isLoading}
            className="p-1.5 rounded-md text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
            title="Delete"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}
