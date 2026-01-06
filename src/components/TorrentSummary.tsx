import { Check, ChevronDown, Copy, Download, FolderOpen, Trash2 } from "lucide-react"
import { useState } from "react"

import type { TorrentItem, TorrentStatus } from "~lib/api/torrents"

interface TorrentSummaryProps {
  torrents: TorrentItem[]
  onCopyLink: (torrent: TorrentItem) => void
  onDownload: (torrent: TorrentItem) => void
  onDelete: (torrent: TorrentItem) => void
  onSelectFiles: (torrent: TorrentItem) => void
  copiedId: string | null
  loadingId: string | null
}

function getStatusColor(status: TorrentStatus): string {
  switch (status) {
    case "downloading":
      return "text-accent"
    case "downloaded":
    case "uploading":
      return "text-primary"
    case "queued":
    case "magnet_conversion":
      return "text-neutral-500"
    case "waiting_files_selection":
      return "text-amber-500"
    case "error":
    case "virus":
    case "dead":
    case "magnet_error":
      return "text-red-500"
    case "compressing":
      return "text-amber-500"
    default:
      return "text-neutral-500"
  }
}

function getStatusLabel(status: TorrentStatus): string {
  switch (status) {
    case "downloading":
      return "Downloading"
    case "downloaded":
      return "Ready"
    case "uploading":
      return "Uploading"
    case "queued":
      return "Queued"
    case "waiting_files_selection":
      return "Select files"
    case "magnet_conversion":
      return "Converting"
    case "error":
      return "Error"
    case "virus":
      return "Virus detected"
    case "dead":
      return "Dead"
    case "magnet_error":
      return "Magnet error"
    case "compressing":
      return "Compressing"
    default:
      return status
  }
}

function formatSpeed(bytesPerSecond: number | undefined): string {
  if (!bytesPerSecond) return ""
  const k = 1024
  if (bytesPerSecond < k) return `${bytesPerSecond} B/s`
  if (bytesPerSecond < k * k) return `${(bytesPerSecond / k).toFixed(1)} KB/s`
  return `${(bytesPerSecond / k / k).toFixed(1)} MB/s`
}

interface TorrentRowProps {
  torrent: TorrentItem
  onCopyLink: () => void
  onDownload: () => void
  onDelete: () => void
  onSelectFiles: () => void
  isCopied: boolean
  isLoading: boolean
}

function TorrentRow({ torrent, onCopyLink, onDownload, onDelete, onSelectFiles, isCopied, isLoading }: TorrentRowProps) {
  const isActive = torrent.status === "downloading"
  const progress = Math.round(torrent.progress)
  const canSelectFiles = torrent.status === "waiting_files_selection"
  const canDownload = torrent.status === "downloaded" && torrent.links.length > 0

  return (
    <div className="py-2">
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className="text-sm text-neutral-900 dark:text-neutral-100 truncate flex-1">
          {torrent.filename}
        </span>
        <div className="flex items-center gap-1">
          <span className={`text-xs font-medium ${getStatusColor(torrent.status)}`}>
            {getStatusLabel(torrent.status)}
          </span>
          {/* Actions */}
          {canSelectFiles && (
            <button
              onClick={onSelectFiles}
              disabled={isLoading}
              className="p-1 rounded-md text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors disabled:opacity-50"
              title="Select Files"
            >
              <FolderOpen size={14} />
            </button>
          )}
          {canDownload && (
            <>
              <button
                onClick={onCopyLink}
                disabled={isLoading}
                className="p-1 rounded-md text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors disabled:opacity-50"
                title={isCopied ? "Copied!" : "Copy Link"}
              >
                {isCopied ? <Check size={14} className="text-primary" /> : <Copy size={14} />}
              </button>
              <button
                onClick={onDownload}
                disabled={isLoading}
                className="p-1 rounded-md text-primary hover:bg-primary/10 transition-colors disabled:opacity-50"
                title="Download"
              >
                <Download size={14} />
              </button>
            </>
          )}
          <button
            onClick={onDelete}
            disabled={isLoading}
            className="p-1 rounded-md text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
            title="Delete"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1 rounded-full bg-neutral-200 dark:bg-neutral-700 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              isActive ? "bg-accent" : progress === 100 ? "bg-primary" : "bg-neutral-400"
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-[10px] font-medium tabular-nums text-neutral-500 dark:text-neutral-400 w-8 text-right">
          {progress}%
        </span>
        {isActive && torrent.speed && (
          <span className="text-[10px] font-mono tabular-nums text-neutral-400 dark:text-neutral-500">
            {formatSpeed(torrent.speed)}
          </span>
        )}
      </div>
    </div>
  )
}

export function TorrentSummary({ torrents, onCopyLink, onDownload, onDelete, onSelectFiles, copiedId, loadingId }: TorrentSummaryProps) {
  const [isExpanded, setIsExpanded] = useState(true)

  // Filter to show active/recent torrents (downloading or recently added)
  const activeTorrents = torrents
    .filter((t) => ["downloading", "queued", "downloaded", "uploading", "compressing", "waiting_files_selection", "magnet_conversion"].includes(t.status))
    .slice(0, 3)

  const activeCount = torrents.filter((t) => t.status === "downloading").length

  if (torrents.length === 0) {
    return null
  }

  return (
    <div className="px-4 py-3 border-t border-neutral-200 dark:border-neutral-800">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between w-full mb-2 group"
      >
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            Recent Torrents
          </h3>
          {activeCount > 0 && (
            <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-medium rounded-full bg-accent/20 text-accent">
              {activeCount}
            </span>
          )}
        </div>
        <ChevronDown
          size={12}
          className={`text-neutral-400 dark:text-neutral-500 transition-transform duration-150 ${isExpanded ? "rotate-180" : ""}`}
        />
      </button>

      {/* Torrent list */}
      {isExpanded && (
        <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
          {activeTorrents.map((torrent) => (
            <TorrentRow
              key={torrent.id}
              torrent={torrent}
              onCopyLink={() => onCopyLink(torrent)}
              onDownload={() => onDownload(torrent)}
              onDelete={() => onDelete(torrent)}
              onSelectFiles={() => onSelectFiles(torrent)}
              isCopied={copiedId === torrent.id}
              isLoading={loadingId === torrent.id}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default TorrentSummary
