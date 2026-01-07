import { AlertCircle, Check, Copy, Download, FolderOpen, Plus, RefreshCw, Trash2, Upload, X } from "lucide-react"
import { useState, useEffect, useCallback } from "react"
import { messages, sendMessage } from "~lib/messaging"
import type { TorrentItem, TorrentStatus, TorrentInfo } from "~lib/api/torrents"

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

type FilterType = "all" | "downloading" | "ready" | "error"

const statusConfig: Record<TorrentStatus, { label: string; color: string }> = {
  magnet_error: { label: "Error", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  magnet_conversion: { label: "Converting", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  waiting_files_selection: { label: "Select Files", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  queued: { label: "Queued", color: "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400" },
  downloading: { label: "Downloading", color: "bg-accent/20 text-accent" },
  downloaded: { label: "Ready", color: "bg-primary/20 text-primary" },
  error: { label: "Error", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  virus: { label: "Virus", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  compressing: { label: "Compressing", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  uploading: { label: "Uploading", color: "bg-accent/20 text-accent" },
  dead: { label: "Dead", color: "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400" }
}

function getFilterForStatus(status: TorrentStatus): FilterType {
  if (["error", "magnet_error", "virus", "dead"].includes(status)) return "error"
  if (["downloaded"].includes(status)) return "ready"
  if (["downloading", "queued", "magnet_conversion", "compressing", "uploading"].includes(status)) return "downloading"
  return "all"
}

// Add Torrent Modal
interface AddTorrentModalProps {
  isOpen: boolean
  onClose: () => void
  onAdd: (magnet: string) => void
  onFileUpload: (file: File) => void
}

function AddTorrentModal({ isOpen, onClose, onAdd, onFileUpload }: AddTorrentModalProps) {
  const [magnetLink, setMagnetLink] = useState("")
  const [isDragging, setIsDragging] = useState(false)

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (magnetLink.trim()) {
      onAdd(magnetLink.trim())
      setMagnetLink("")
      onClose()
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file && file.name.endsWith(".torrent")) {
      onFileUpload(file)
      onClose()
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      onFileUpload(file)
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-md mx-4 bg-white dark:bg-neutral-900 rounded-xl shadow-xl border border-neutral-200 dark:border-neutral-800">
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200 dark:border-neutral-800">
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
            Add Torrent
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Magnet Link Input */}
          <div>
            <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1.5">
              Magnet Link
            </label>
            <input
              type="text"
              value={magnetLink}
              onChange={(e) => setMagnetLink(e.target.value)}
              placeholder="magnet:?xt=urn:btih:..."
              className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
            />
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-neutral-200 dark:bg-neutral-700" />
            <span className="text-xs text-neutral-400">or</span>
            <div className="flex-1 h-px bg-neutral-200 dark:bg-neutral-700" />
          </div>

          {/* File Upload Area */}
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`
              relative border-2 border-dashed rounded-lg p-6 text-center transition-colors
              ${isDragging
                ? "border-primary bg-primary/5"
                : "border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600"
              }
            `}
          >
            <input
              type="file"
              accept=".torrent"
              onChange={handleFileSelect}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <div className="flex flex-col items-center">
              <Upload size={24} className="text-neutral-400 mb-2" />
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                Drop .torrent file or <span className="text-primary font-medium">browse</span>
              </p>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!magnetLink.trim()}
            className="w-full py-2 px-4 rounded-lg text-sm font-medium bg-primary text-neutral-900 hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Add Magnet Link
          </button>
        </form>
      </div>
    </div>
  )
}

// File Selection Modal
interface FileSelectionModalProps {
  isOpen: boolean
  onClose: () => void
  torrentInfo: TorrentInfo | null
  onSelect: (torrentId: string, fileIds: number[]) => void
  loading: boolean
}

function FileSelectionModal({ isOpen, onClose, torrentInfo, onSelect, loading }: FileSelectionModalProps) {
  const [selectedFiles, setSelectedFiles] = useState<Set<number>>(new Set())

  useEffect(() => {
    if (torrentInfo?.files) {
      // Pre-select all files
      setSelectedFiles(new Set(torrentInfo.files.map(f => f.id)))
    }
  }, [torrentInfo])

  if (!isOpen || !torrentInfo) return null

  const toggleFile = (fileId: number) => {
    const newSelected = new Set(selectedFiles)
    if (newSelected.has(fileId)) {
      newSelected.delete(fileId)
    } else {
      newSelected.add(fileId)
    }
    setSelectedFiles(newSelected)
  }

  const toggleAll = () => {
    if (selectedFiles.size === torrentInfo.files.length) {
      setSelectedFiles(new Set())
    } else {
      setSelectedFiles(new Set(torrentInfo.files.map(f => f.id)))
    }
  }

  const handleSubmit = () => {
    onSelect(torrentInfo.id, Array.from(selectedFiles))
  }

  const totalSize = torrentInfo.files
    .filter(f => selectedFiles.has(f.id))
    .reduce((sum, f) => sum + f.bytes, 0)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-lg mx-4 max-h-[80vh] flex flex-col bg-white dark:bg-neutral-900 rounded-xl shadow-xl border border-neutral-200 dark:border-neutral-800">
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200 dark:border-neutral-800">
          <div>
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              Select Files
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 truncate max-w-[280px]">
              {torrentInfo.filename}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Select All */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={selectedFiles.size === torrentInfo.files.length}
              onChange={toggleAll}
              className="w-4 h-4 rounded border-neutral-300 dark:border-neutral-600 text-primary focus:ring-primary"
            />
            <span className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
              Select All ({torrentInfo.files.length} files)
            </span>
          </label>
          <span className="text-xs font-mono text-neutral-500">
            {formatBytes(totalSize)}
          </span>
        </div>

        {/* File List */}
        <div className="flex-1 overflow-y-auto">
          <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {torrentInfo.files.map((file) => (
              <label
                key={file.id}
                className="flex items-center gap-3 px-4 py-2.5 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 cursor-pointer transition-colors"
              >
                <input
                  type="checkbox"
                  checked={selectedFiles.has(file.id)}
                  onChange={() => toggleFile(file.id)}
                  className="w-4 h-4 rounded border-neutral-300 dark:border-neutral-600 text-primary focus:ring-primary flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-neutral-900 dark:text-neutral-100 truncate">
                    {file.path.split("/").pop()}
                  </p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                    {file.path}
                  </p>
                </div>
                <span className="text-xs font-mono text-neutral-500 flex-shrink-0">
                  {formatBytes(file.bytes)}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900">
          <span className="text-xs text-neutral-500">
            {selectedFiles.size} of {torrentInfo.files.length} selected
          </span>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={selectedFiles.size === 0 || loading}
              className="px-3 py-1.5 rounded-lg text-sm font-medium bg-primary text-neutral-900 hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? "Saving..." : "Start Download"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export function TorrentsSection() {
  const [torrents, setTorrents] = useState<TorrentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<FilterType>("all")
  const [showAddModal, setShowAddModal] = useState(false)
  const [showFileModal, setShowFileModal] = useState(false)
  const [selectedTorrentInfo, setSelectedTorrentInfo] = useState<TorrentInfo | null>(null)
  const [fileModalLoading, setFileModalLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const fetchTorrents = useCallback(async () => {
    setLoading(true)
    setError(null)

    const response = await messages.listTorrents()

    if (response.success && response.data) {
      setTorrents(response.data)
    } else {
      setError(response.error ?? "Failed to load torrents")
    }

    setLoading(false)
  }, [])

  useEffect(() => {
    fetchTorrents()
  }, [fetchTorrents])

  const handleAddMagnet = async (magnet: string) => {
    const response = await messages.addMagnet(magnet)
    if (response.success) {
      fetchTorrents()
    }
  }

  const handleFileUpload = async (file: File) => {
    const buffer = await file.arrayBuffer()
    const response = await sendMessage({ type: "ADD_TORRENT", payload: { fileData: buffer } })
    if (response.success) {
      fetchTorrents()
    }
  }

  const handleSelectFiles = async (torrent: TorrentItem) => {
    setFileModalLoading(true)
    setShowFileModal(true)

    const response = await messages.getTorrentInfo(torrent.id)
    if (response.success && response.data) {
      setSelectedTorrentInfo(response.data)
    }
    setFileModalLoading(false)
  }

  const handleFileSelection = async (torrentId: string, fileIds: number[]) => {
    setFileModalLoading(true)
    const response = await sendMessage({
      type: "SELECT_TORRENT_FILES",
      payload: { id: torrentId, files: fileIds.length === selectedTorrentInfo?.files.length ? "all" : fileIds }
    })
    if (response.success) {
      setShowFileModal(false)
      setSelectedTorrentInfo(null)
      fetchTorrents()
    }
    setFileModalLoading(false)
  }

  const handleUnrestrict = async (torrent: TorrentItem) => {
    if (torrent.links.length === 0) return
    setActionLoading(torrent.id)

    for (const link of torrent.links) {
      const response = await messages.unrestrictLink(link)
      if (response.success && response.data) {
        // Trigger download
        window.open(response.data.download, "_blank")
      }
    }

    setActionLoading(null)
  }

  const handleDelete = async (torrentId: string) => {
    if (!confirm("Are you sure you want to delete this torrent?")) return

    setActionLoading(torrentId)
    const response = await messages.deleteTorrent(torrentId)
    if (response.success) {
      fetchTorrents()
    }
    setActionLoading(null)
  }

  const handleCopyLink = async (torrent: TorrentItem) => {
    if (torrent.links.length === 0) return

    setActionLoading(torrent.id)
    try {
      const response = await messages.unrestrictLink(torrent.links[0])
      if (response.success && response.data) {
        try {
          await navigator.clipboard.writeText(response.data.download)
        } catch {
          // Fallback for when clipboard API fails (e.g., lost user gesture context)
          const textArea = document.createElement("textarea")
          textArea.value = response.data.download
          textArea.style.position = "fixed"
          textArea.style.left = "-9999px"
          document.body.appendChild(textArea)
          textArea.select()
          document.execCommand("copy")
          document.body.removeChild(textArea)
        }
        setCopiedId(torrent.id)
        setTimeout(() => setCopiedId(null), 2000)
      }
    } catch (err) {
      console.error("Failed to copy link:", err)
    } finally {
      setActionLoading(null)
    }
  }

  const filteredTorrents = torrents.filter((torrent) => {
    if (filter === "all") return true
    return getFilterForStatus(torrent.status) === filter
  })

  const filterCounts = {
    all: torrents.length,
    downloading: torrents.filter((t) => getFilterForStatus(t.status) === "downloading").length,
    ready: torrents.filter((t) => getFilterForStatus(t.status) === "ready").length,
    error: torrents.filter((t) => getFilterForStatus(t.status) === "error").length
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100 tracking-tight">
            Torrents
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Manage your torrent downloads
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchTorrents}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-primary text-neutral-900 hover:bg-primary/90 transition-colors"
          >
            <Plus size={16} />
            Add Torrent
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-1 p-1 bg-neutral-100 dark:bg-neutral-800 rounded-lg w-fit">
        {(["all", "downloading", "ready", "error"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`
              px-3 py-1.5 rounded-md text-sm font-medium transition-colors
              ${filter === f
                ? "bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-sm"
                : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
              }
            `}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
            <span className="ml-1.5 text-xs tabular-nums text-neutral-400 dark:text-neutral-500">
              {filterCounts[f]}
            </span>
          </button>
        ))}
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
            onClick={fetchTorrents}
            className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
          >
            Try again
          </button>
        </div>
      ) : filteredTorrents.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <div className="w-12 h-12 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center mb-3">
            <Upload size={24} className="text-neutral-400" />
          </div>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-2">
            {filter === "all" ? "No torrents yet" : `No ${filter} torrents`}
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
          >
            Add your first torrent
          </button>
        </div>
      ) : (
        <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 overflow-hidden">
          <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {filteredTorrents.map((torrent) => (
              <TorrentRow
                key={torrent.id}
                torrent={torrent}
                onSelectFiles={() => handleSelectFiles(torrent)}
                onUnrestrict={() => handleUnrestrict(torrent)}
                onCopyLink={() => handleCopyLink(torrent)}
                onDelete={() => handleDelete(torrent.id)}
                isLoading={actionLoading === torrent.id}
                isCopied={copiedId === torrent.id}
              />
            ))}
          </div>
        </div>
      )}

      {/* Modals */}
      <AddTorrentModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={handleAddMagnet}
        onFileUpload={handleFileUpload}
      />

      <FileSelectionModal
        isOpen={showFileModal}
        onClose={() => { setShowFileModal(false); setSelectedTorrentInfo(null) }}
        torrentInfo={selectedTorrentInfo}
        onSelect={handleFileSelection}
        loading={fileModalLoading}
      />
    </div>
  )
}

interface TorrentRowProps {
  torrent: TorrentItem
  onSelectFiles: () => void
  onUnrestrict: () => void
  onCopyLink: () => void
  onDelete: () => void
  isLoading: boolean
  isCopied: boolean
}

function TorrentRow({ torrent, onSelectFiles, onUnrestrict, onCopyLink, onDelete, isLoading, isCopied }: TorrentRowProps) {
  const status = statusConfig[torrent.status]
  const showProgress = torrent.status === "downloading" && torrent.progress > 0
  const canSelectFiles = torrent.status === "waiting_files_selection"
  const canUnrestrict = torrent.status === "downloaded" && torrent.links.length > 0

  return (
    <div className="px-4 py-3 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">
              {torrent.filename}
            </h3>
            <span className={`inline-flex px-1.5 py-0.5 rounded text-xs font-medium flex-shrink-0 ${status.color}`}>
              {status.label}
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs text-neutral-500 dark:text-neutral-400">
            <span className="font-mono tabular-nums">{formatBytes(torrent.bytes)}</span>
            <span>{formatDate(torrent.added)}</span>
            {torrent.seeders !== undefined && (
              <span>{torrent.seeders} seeders</span>
            )}
          </div>

          {showProgress && (
            <div className="mt-2">
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-accent rounded-full transition-all duration-300"
                    style={{ width: `${torrent.progress}%` }}
                  />
                </div>
                <span className="text-xs font-mono tabular-nums text-neutral-500 w-10 text-right">
                  {torrent.progress}%
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {canSelectFiles && (
            <button
              onClick={onSelectFiles}
              disabled={isLoading}
              className="p-1.5 rounded-md text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors disabled:opacity-50"
              title="Select Files"
            >
              <FolderOpen size={16} />
            </button>
          )}
          {canUnrestrict && (
            <>
              <button
                onClick={onCopyLink}
                disabled={isLoading}
                className="p-1.5 rounded-md text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors disabled:opacity-50"
                title={isCopied ? "Copied!" : "Copy Link"}
              >
                {isCopied ? <Check size={16} className="text-primary" /> : <Copy size={16} />}
              </button>
              <button
                onClick={onUnrestrict}
                disabled={isLoading}
                className="p-1.5 rounded-md text-primary hover:bg-primary/10 transition-colors disabled:opacity-50"
                title="Download"
              >
                <Download size={16} />
              </button>
            </>
          )}
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
