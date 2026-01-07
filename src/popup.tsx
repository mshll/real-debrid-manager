import { Download, HardDrive, Settings, User, X } from "lucide-react"

import logoImage from "data-base64:~assets/logo.png"
import { useEffect, useRef, useState } from "react"

import { AccountBar } from "~components/AccountBar"
import { DetectedLinks } from "~components/DetectedLinks"
import { TorrentSummary } from "~components/TorrentSummary"
import { UnrestrictInput } from "~components/UnrestrictInput"
import type { TorrentItem, TorrentInfo } from "~lib/api/torrents"
import type { UnrestrictedLink } from "~lib/api/unrestrict"
import type { UserProfile } from "~lib/api/user"
import { messages, scanPageLinks, sendMessage, type DetectedLink } from "~lib/messaging"

import "~style.css"

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B"
  const k = 1024
  const sizes = ["B", "KB", "MB", "GB", "TB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
}

interface FileSelectionModalProps {
  isOpen: boolean
  onClose: () => void
  torrentInfo: TorrentInfo | null
  onSelect: (fileIds: number[]) => void
  loading: boolean
}

function FileSelectionModal({ isOpen, onClose, torrentInfo, onSelect, loading }: FileSelectionModalProps) {
  const [selectedFiles, setSelectedFiles] = useState<Set<number>>(new Set())

  useEffect(() => {
    if (torrentInfo?.files) {
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

  const totalSize = torrentInfo.files
    .filter(f => selectedFiles.has(f.id))
    .reduce((sum, f) => sum + f.bytes, 0)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-[330px] max-h-[400px] flex flex-col bg-white dark:bg-neutral-900 rounded-xl shadow-xl border border-neutral-200 dark:border-neutral-800">
        <div className="flex items-center justify-between px-3 py-2.5 border-b border-neutral-200 dark:border-neutral-800">
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              Select Files
            </h3>
            <p className="text-[10px] text-neutral-500 dark:text-neutral-400 truncate">
              {torrentInfo.filename}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors ml-2"
          >
            <X size={14} />
          </button>
        </div>

        <div className="flex items-center justify-between px-3 py-2 border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={selectedFiles.size === torrentInfo.files.length}
              onChange={toggleAll}
              className="w-3.5 h-3.5 rounded border-neutral-300 dark:border-neutral-600 text-primary focus:ring-primary"
            />
            <span className="text-[10px] font-medium text-neutral-600 dark:text-neutral-400">
              All ({torrentInfo.files.length})
            </span>
          </label>
          <span className="text-[10px] font-mono text-neutral-500">
            {formatBytes(totalSize)}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto max-h-[220px]">
          <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {torrentInfo.files.map((file) => (
              <label
                key={file.id}
                className="flex items-center gap-2 px-3 py-2 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 cursor-pointer transition-colors"
              >
                <input
                  type="checkbox"
                  checked={selectedFiles.has(file.id)}
                  onChange={() => toggleFile(file.id)}
                  className="w-3.5 h-3.5 rounded border-neutral-300 dark:border-neutral-600 text-primary focus:ring-primary flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-neutral-900 dark:text-neutral-100 truncate">
                    {file.path.split("/").pop()}
                  </p>
                </div>
                <span className="text-[10px] font-mono text-neutral-500 flex-shrink-0">
                  {formatBytes(file.bytes)}
                </span>
              </label>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between px-3 py-2.5 border-t border-neutral-200 dark:border-neutral-800">
          <span className="text-[10px] text-neutral-500">
            {selectedFiles.size}/{torrentInfo.files.length} selected
          </span>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-2.5 py-1 rounded-md text-xs font-medium text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => onSelect(Array.from(selectedFiles))}
              disabled={selectedFiles.size === 0 || loading}
              className="px-2.5 py-1 rounded-md text-xs font-medium bg-primary text-neutral-900 hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? "..." : "Download"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

type OAuthStatus = "idle" | "pending" | "success" | "error"

function LoginPrompt({ onLoginComplete }: { onLoginComplete: () => void }) {
  const [status, setStatus] = useState<OAuthStatus>("idle")
  const [error, setError] = useState<string | null>(null)
  const pollIntervalRef = useRef<number | null>(null)

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
      }
    }
  }, [])

  const handleAuthorize = async () => {
    setStatus("pending")
    setError(null)

    try {
      // Start OAuth flow in background
      const response = await chrome.runtime.sendMessage({ type: "START_OAUTH" })

      if (response.error) {
        setError(response.error)
        setStatus("error")
        return
      }

      if (response.deviceCode) {
        // Open authorization URL in new tab
        const authUrl = `https://real-debrid.com/authorize?client_id=X245A4XAIBGVM&device_id=${response.deviceCode.device_code}`
        chrome.tabs.create({ url: authUrl })

        // Poll for completion
        pollIntervalRef.current = window.setInterval(async () => {
          const statusResponse = await chrome.runtime.sendMessage({
            type: "CHECK_OAUTH_STATUS",
          })

          if (statusResponse.status === "success") {
            if (pollIntervalRef.current) {
              clearInterval(pollIntervalRef.current)
              pollIntervalRef.current = null
            }
            setStatus("success")
            onLoginComplete()
          } else if (statusResponse.status === "error") {
            if (pollIntervalRef.current) {
              clearInterval(pollIntervalRef.current)
              pollIntervalRef.current = null
            }
            setError(statusResponse.error || "Authorization failed")
            setStatus("error")
          }
        }, 1000)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start authorization")
      setStatus("error")
    }
  }

  const handleCancel = () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current)
      pollIntervalRef.current = null
    }
    chrome.runtime.sendMessage({ type: "CANCEL_OAUTH" })
    setStatus("idle")
    setError(null)
  }

  return (
    <div className="flex flex-col items-center justify-center h-full px-6 py-8">
      {/* Logo */}
      <div className="flex items-center justify-center w-12 h-12 mb-4">
        <img src={logoImage} alt="Real-Debrid" className="w-12 h-12" />
      </div>

      <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100 mb-1">
        Real-Debrid Manager
      </h2>

      {status === "idle" || status === "error" ? (
        <>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 text-center mb-4">
            Connect your Real-Debrid account
          </p>

          {error && (
            <p className="text-xs text-red-500 text-center mb-3">{error}</p>
          )}

          <button
            onClick={handleAuthorize}
            className="w-full h-10 px-4 text-sm font-medium rounded-lg bg-primary text-neutral-900 hover:bg-primary/90 transition-colors"
          >
            Authorize with Real-Debrid
          </button>

          <a
            href="https://real-debrid.com/?id=8457529"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 text-xs text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
          >
            No account? Sign up
          </a>
        </>
      ) : (
        <>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 text-center mb-4">
            Complete authorization in the browser tab
          </p>

          <div className="flex items-center justify-center mb-4">
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="ml-2 text-sm text-neutral-600 dark:text-neutral-300">
              Waiting for authorization...
            </span>
          </div>

          <button
            onClick={handleCancel}
            className="w-full h-10 px-4 text-sm font-medium rounded-lg border border-neutral-300 dark:border-neutral-600 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            Cancel
          </button>
        </>
      )}
    </div>
  )
}

interface PopupState {
  isLoading: boolean
  isAuthenticated: boolean
  user: UserProfile | null
  torrents: TorrentItem[]
  detectedLinks: DetectedLink[]
  isScanning: boolean
  torrentLoadingId: string | null
  copiedId: string | null
  showFileModal: boolean
  selectedTorrentInfo: TorrentInfo | null
}

function IndexPopup() {
  const [state, setState] = useState<PopupState>({
    isLoading: true,
    isAuthenticated: false,
    user: null,
    torrents: [],
    detectedLinks: [],
    isScanning: false,
    torrentLoadingId: null,
    copiedId: null,
    showFileModal: false,
    selectedTorrentInfo: null,
  })

  // Check auth status and load data on mount
  useEffect(() => {
    async function initialize() {
      try {
        const authResponse = await messages.checkAuthStatus()

        if (authResponse.success && authResponse.data?.authenticated) {
          const [torrentsResponse, cachedLinksResponse] = await Promise.all([
            messages.listTorrents({ limit: 10 }),
            messages.getDetectedLinks(),
          ])

          setState((prev) => ({
            ...prev,
            isLoading: false,
            isAuthenticated: true,
            user: authResponse.data?.profile ?? null,
            torrents: torrentsResponse.success ? torrentsResponse.data ?? [] : [],
            detectedLinks: cachedLinksResponse.success ? cachedLinksResponse.data ?? [] : [],
          }))
        } else {
          setState((prev) => ({
            ...prev,
            isLoading: false,
            isAuthenticated: false,
          }))
        }
      } catch (error) {
        console.error("Failed to initialize popup:", error)
        setState((prev) => ({
          ...prev,
          isLoading: false,
          isAuthenticated: false,
        }))
      }
    }

    initialize()
  }, [])

  const handleLoginComplete = () => {
    // Reload the popup state after successful login
    window.location.reload()
  }

  const handleUnrestrict = async (link: string): Promise<UnrestrictedLink> => {
    const response = await messages.unrestrictLink(link)
    if (!response.success || !response.data) {
      throw new Error(response.error ?? "Failed to unrestrict link")
    }
    return response.data
  }

  const handleScan = async () => {
    setState((prev) => ({ ...prev, isScanning: true }))

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
      if (!tab?.id) {
        setState((prev) => ({ ...prev, isScanning: false }))
        return
      }

      const response = await scanPageLinks(tab.id)
      const links = response.success ? response.data ?? [] : []

      setState((prev) => ({
        ...prev,
        detectedLinks: links,
        isScanning: false,
      }))

      // Report to background to update cache and badge
      if (links.length > 0) {
        chrome.runtime.sendMessage({
          type: "REPORT_DETECTED_LINKS",
          payload: { links },
        })
      }
    } catch (error) {
      console.error("Failed to scan page:", error)
      setState((prev) => ({ ...prev, isScanning: false }))
    }
  }

  const refreshTorrents = async () => {
    const response = await messages.listTorrents({ limit: 10 })
    if (response.success && response.data) {
      setState((prev) => ({ ...prev, torrents: response.data ?? [] }))
    }
  }

  const handleCopyLink = async (torrent: TorrentItem) => {
    if (torrent.links.length === 0) return

    setState((prev) => ({ ...prev, torrentLoadingId: torrent.id }))
    const response = await messages.unrestrictLink(torrent.links[0])
    if (response.success && response.data) {
      await navigator.clipboard.writeText(response.data.download)
      setState((prev) => ({ ...prev, copiedId: torrent.id }))
      setTimeout(() => setState((prev) => ({ ...prev, copiedId: null })), 2000)
    }
    setState((prev) => ({ ...prev, torrentLoadingId: null }))
  }

  const handleDownloadTorrent = async (torrent: TorrentItem) => {
    if (torrent.links.length === 0) return

    setState((prev) => ({ ...prev, torrentLoadingId: torrent.id }))
    for (const link of torrent.links) {
      const response = await messages.unrestrictLink(link)
      if (response.success && response.data) {
        window.open(response.data.download, "_blank")
      }
    }
    setState((prev) => ({ ...prev, torrentLoadingId: null }))
  }

  const handleDeleteTorrent = async (torrent: TorrentItem) => {
    setState((prev) => ({ ...prev, torrentLoadingId: torrent.id }))
    const response = await messages.deleteTorrent(torrent.id)
    if (response.success) {
      setState((prev) => ({
        ...prev,
        torrents: prev.torrents.filter((t) => t.id !== torrent.id),
      }))
    }
    setState((prev) => ({ ...prev, torrentLoadingId: null }))
  }

  const handleSelectFiles = async (torrent: TorrentItem) => {
    setState((prev) => ({ ...prev, torrentLoadingId: torrent.id }))
    const response = await messages.getTorrentInfo(torrent.id)
    if (response.success && response.data) {
      setState((prev) => ({
        ...prev,
        selectedTorrentInfo: response.data ?? null,
        showFileModal: true,
        torrentLoadingId: null,
      }))
    } else {
      setState((prev) => ({ ...prev, torrentLoadingId: null }))
    }
  }

  const handleFileSelection = async (fileIds: number[]) => {
    if (!state.selectedTorrentInfo) return

    setState((prev) => ({ ...prev, torrentLoadingId: prev.selectedTorrentInfo?.id ?? null }))
    const files = state.selectedTorrentInfo.files?.length === fileIds.length ? "all" : fileIds.join(",")
    await sendMessage({
      type: "SELECT_TORRENT_FILES",
      payload: { id: state.selectedTorrentInfo.id, files },
    })
    setState((prev) => ({
      ...prev,
      showFileModal: false,
      selectedTorrentInfo: null,
      torrentLoadingId: null,
    }))
    refreshTorrents()
  }

  const openDashboard = (section?: string) => {
    const url = section
      ? chrome.runtime.getURL(`tabs/dashboard.html#${section}`)
      : chrome.runtime.getURL("tabs/dashboard.html")
    chrome.tabs.create({ url })
  }

  // Loading state
  if (state.isLoading) {
    return (
      <div className="w-[350px] h-[200px] flex items-center justify-center bg-white dark:bg-neutral-900">
        <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // Unauthenticated state
  if (!state.isAuthenticated) {
    return (
      <div className="w-[350px] bg-white dark:bg-neutral-900">
        <LoginPrompt onLoginComplete={handleLoginComplete} />
      </div>
    )
  }

  // Authenticated state
  return (
    <div className="w-[350px] bg-white dark:bg-neutral-900 overflow-hidden">
      {/* Account bar */}
      {state.user && <AccountBar user={state.user} />}

      {/* Unrestrict input */}
      <UnrestrictInput onUnrestrict={handleUnrestrict} />

      {/* Detected links */}
      <DetectedLinks
        links={state.detectedLinks}
        isScanning={state.isScanning}
        onScan={handleScan}
        onUnrestrict={handleUnrestrict}
      />

      {/* Torrent summary */}
      <TorrentSummary
        torrents={state.torrents}
        onCopyLink={handleCopyLink}
        onDownload={handleDownloadTorrent}
        onDelete={handleDeleteTorrent}
        onSelectFiles={handleSelectFiles}
        copiedId={state.copiedId}
        loadingId={state.torrentLoadingId}
      />

      {/* Footer - Dashboard Navigation */}
      <div className="grid grid-cols-4 border-t border-neutral-200 dark:border-neutral-800">
        <button
          onClick={() => openDashboard("account")}
          className="flex flex-col items-center gap-1 py-3 text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
        >
          <User size={18} />
          <span className="text-[10px] font-medium">Account</span>
        </button>
        <button
          onClick={() => openDashboard("torrents")}
          className="flex flex-col items-center gap-1 py-3 text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
        >
          <HardDrive size={18} />
          <span className="text-[10px] font-medium">Torrents</span>
        </button>
        <button
          onClick={() => openDashboard("downloads")}
          className="flex flex-col items-center gap-1 py-3 text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
        >
          <Download size={18} />
          <span className="text-[10px] font-medium">Downloads</span>
        </button>
        <button
          onClick={() => openDashboard("settings")}
          className="flex flex-col items-center gap-1 py-3 text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
        >
          <Settings size={18} />
          <span className="text-[10px] font-medium">Settings</span>
        </button>
      </div>

      {/* File Selection Modal */}
      <FileSelectionModal
        isOpen={state.showFileModal}
        onClose={() => setState((prev) => ({ ...prev, showFileModal: false, selectedTorrentInfo: null }))}
        torrentInfo={state.selectedTorrentInfo}
        onSelect={handleFileSelection}
        loading={state.torrentLoadingId !== null}
      />
    </div>
  )
}

export default IndexPopup
