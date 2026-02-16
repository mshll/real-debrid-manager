import { Check, Copy, Download, X } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import type { TorrentItem } from "~lib/api/torrents"
import type { UnrestrictedLink } from "~lib/api/unrestrict"
import { messages } from "~lib/messaging"

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B"
  const k = 1024
  const sizes = ["B", "KB", "MB", "GB", "TB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
}

interface ResolvedFile {
  filename: string
  filesize: number
  download: string
}

interface DownloadPickerModalProps {
  isOpen: boolean
  onClose: () => void
  torrent: TorrentItem
  variant: "popup" | "dashboard"
}

type Phase = "resolving" | "picking" | "error"

function copyToClipboard(text: string): void {
  try {
    navigator.clipboard.writeText(text)
  } catch {
    const textArea = document.createElement("textarea")
    textArea.value = text
    textArea.style.position = "fixed"
    textArea.style.left = "-9999px"
    document.body.appendChild(textArea)
    textArea.select()
    document.execCommand("copy")
    document.body.removeChild(textArea)
  }
}

export function DownloadPickerModal({ isOpen, onClose, torrent, variant }: DownloadPickerModalProps) {
  const [phase, setPhase] = useState<Phase>("resolving")
  const [files, setFiles] = useState<ResolvedFile[]>([])
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [resolved, setResolved] = useState(0)
  const [failCount, setFailCount] = useState(0)
  const [copied, setCopied] = useState(false)
  const cancelledRef = useRef(false)

  useEffect(() => {
    if (!isOpen) return

    cancelledRef.current = false
    setPhase("resolving")
    setFiles([])
    setSelected(new Set())
    setResolved(0)
    setFailCount(0)
    setCopied(false)

    let isCancelled = false

    async function resolve() {
      const results: ResolvedFile[] = []
      let failures = 0

      for (let i = 0; i < torrent.links.length; i++) {
        if (cancelledRef.current || isCancelled) return

        const response = await messages.unrestrictLink(torrent.links[i])
        if (response.success && response.data) {
          results.push({
            filename: response.data.filename,
            filesize: response.data.filesize,
            download: response.data.download,
          })
        } else {
          failures++
        }

        if (cancelledRef.current || isCancelled) return
        setResolved(i + 1)
        setFailCount(failures)
      }

      if (cancelledRef.current || isCancelled) return

      if (results.length === 0) {
        setPhase("error")
        return
      }

      setFiles(results)
      setSelected(new Set(results.map((_, i) => i)))
      setPhase("picking")
    }

    resolve()

    return () => {
      isCancelled = true
      cancelledRef.current = true
    }
  }, [isOpen, torrent.links])

  if (!isOpen) return null

  const handleClose = () => {
    cancelledRef.current = true
    onClose()
  }

  const toggleFile = (index: number) => {
    const next = new Set(selected)
    if (next.has(index)) {
      next.delete(index)
    } else {
      next.add(index)
    }
    setSelected(next)
  }

  const toggleAll = () => {
    if (selected.size === files.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(files.map((_, i) => i)))
    }
  }

  const downloadFiles = (indices: number[]) => {
    for (const i of indices) {
      const file = files[i]
      if (file) {
        messages.downloadFile(file.download, file.filename)
      }
    }
  }

  const handleDownloadSelected = () => {
    downloadFiles(Array.from(selected))
    handleClose()
  }

  const handleDownloadAll = () => {
    downloadFiles(files.map((_, i) => i))
    handleClose()
  }

  const handleCopyLinks = () => {
    const urls = Array.from(selected)
      .map((i) => files[i]?.download)
      .filter(Boolean)
      .join("\n")
    copyToClipboard(urls)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const isPopup = variant === "popup"
  const containerClass = isPopup
    ? "w-[330px] max-h-[400px]"
    : "w-full max-w-lg mx-4 max-h-[80vh]"
  const listMaxH = isPopup ? "max-h-[200px]" : "max-h-[50vh]"

  const totalLinks = torrent.links.length
  const progress = totalLinks > 0 ? Math.round((resolved / totalLinks) * 100) : 0

  const selectedSize = Array.from(selected).reduce(
    (sum, i) => sum + (files[i]?.filesize ?? 0),
    0
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />
      <div className={`relative flex flex-col bg-white dark:bg-neutral-900 rounded-xl shadow-xl border border-neutral-200 dark:border-neutral-800 ${containerClass}`}>
        {/* Header */}
        <div className={`flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 ${isPopup ? "px-3 py-2.5" : "px-4 py-3"}`}>
          <div className="min-w-0 flex-1">
            <h3 className={`font-semibold text-neutral-900 dark:text-neutral-100 ${isPopup ? "text-sm" : "text-sm"}`}>
              Download Files
            </h3>
            <p className={`text-neutral-500 dark:text-neutral-400 truncate ${isPopup ? "text-[10px]" : "text-xs mt-0.5"}`}>
              {torrent.filename}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-1 rounded-md text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors ml-2"
          >
            <X size={isPopup ? 14 : 16} />
          </button>
        </div>

        {/* Resolving phase */}
        {phase === "resolving" && (
          <div className={`flex flex-col items-center justify-center ${isPopup ? "py-8 px-3" : "py-12 px-4"}`}>
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin mb-3" />
            <p className={`text-neutral-600 dark:text-neutral-300 mb-3 ${isPopup ? "text-xs" : "text-sm"}`}>
              Preparing files... {resolved}/{totalLinks}
            </p>
            <div className={`w-full bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden ${isPopup ? "h-1.5 max-w-[200px]" : "h-2 max-w-xs"}`}>
              <div
                className="h-full bg-primary rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            {failCount > 0 && (
              <p className="text-[10px] text-red-500 mt-2">
                {failCount} failed
              </p>
            )}
          </div>
        )}

        {/* Error phase */}
        {phase === "error" && (
          <div className={`flex flex-col items-center justify-center ${isPopup ? "py-8 px-3" : "py-12 px-4"}`}>
            <p className={`text-red-500 ${isPopup ? "text-xs" : "text-sm"}`}>
              Failed to resolve any download links
            </p>
          </div>
        )}

        {/* Picking phase */}
        {phase === "picking" && (
          <>
            {/* Select all bar */}
            <div className={`flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50 ${isPopup ? "px-3 py-2" : "px-4 py-2"}`}>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selected.size === files.length}
                  onChange={toggleAll}
                  className={`rounded border-neutral-300 dark:border-neutral-600 text-primary focus:ring-primary ${isPopup ? "w-3.5 h-3.5" : "w-4 h-4"}`}
                />
                <span className={`font-medium text-neutral-600 dark:text-neutral-400 ${isPopup ? "text-[10px]" : "text-xs"}`}>
                  All ({files.length})
                </span>
              </label>
              <span className={`font-mono text-neutral-500 ${isPopup ? "text-[10px]" : "text-xs"}`}>
                {formatBytes(selectedSize)}
              </span>
            </div>

            {/* File list */}
            <div className={`flex-1 overflow-y-auto ${listMaxH}`}>
              <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {files.map((file, index) => (
                  <label
                    key={index}
                    className={`flex items-center cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors ${isPopup ? "gap-2 px-3 py-2" : "gap-3 px-4 py-2.5"}`}
                  >
                    <input
                      type="checkbox"
                      checked={selected.has(index)}
                      onChange={() => toggleFile(index)}
                      className={`rounded border-neutral-300 dark:border-neutral-600 text-primary focus:ring-primary flex-shrink-0 ${isPopup ? "w-3.5 h-3.5" : "w-4 h-4"}`}
                    />
                    <div className="flex-1 min-w-0">
                      <p className={`text-neutral-900 dark:text-neutral-100 truncate ${isPopup ? "text-xs" : "text-sm"}`}>
                        {file.filename}
                      </p>
                    </div>
                    <span className={`font-mono text-neutral-500 flex-shrink-0 ${isPopup ? "text-[10px]" : "text-xs"}`}>
                      {formatBytes(file.filesize)}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {failCount > 0 && (
              <div className={`border-t border-neutral-100 dark:border-neutral-800 ${isPopup ? "px-3 py-1.5" : "px-4 py-2"}`}>
                <p className="text-[10px] text-red-500">
                  {failCount} link{failCount > 1 ? "s" : ""} failed to resolve
                </p>
              </div>
            )}

            {/* Footer */}
            <div className={`flex items-center justify-between border-t border-neutral-200 dark:border-neutral-800 ${isPopup ? "px-3 py-2.5" : "px-4 py-3"}`}>
              <span className={`text-neutral-500 ${isPopup ? "text-[10px]" : "text-xs"}`}>
                {selected.size}/{files.length} selected
              </span>
              <div className="flex gap-1.5">
                <button
                  onClick={handleCopyLinks}
                  disabled={selected.size === 0}
                  className={`inline-flex items-center gap-1 rounded-md font-medium text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${isPopup ? "px-2 py-1 text-[10px]" : "px-2.5 py-1.5 text-xs"}`}
                >
                  {copied ? <Check size={12} className="text-primary" /> : <Copy size={12} />}
                  {copied ? "Copied" : "Copy Links"}
                </button>
                <button
                  onClick={handleDownloadSelected}
                  disabled={selected.size === 0}
                  className={`inline-flex items-center gap-1 rounded-md font-medium bg-primary text-neutral-900 hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${isPopup ? "px-2 py-1 text-[10px]" : "px-2.5 py-1.5 text-xs"}`}
                >
                  <Download size={12} />
                  {selected.size === files.length ? "Download All" : "Download"}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
