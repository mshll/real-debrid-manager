import { Check, Copy, Download, Loader2, Magnet, Search, Unlock } from "lucide-react"
import { useState } from "react"
import type { DetectedLink } from "~lib/messaging"
import type { UnrestrictedLink } from "~lib/api/unrestrict"

interface UnrestrictedState {
  loading: boolean
  error?: string
  result?: UnrestrictedLink
}

interface DetectedLinksProps {
  links: DetectedLink[]
  isScanning: boolean
  onScan: () => void
  onUnrestrict: (link: string) => Promise<UnrestrictedLink>
}

function getDisplayName(url: string, host: string): string {
  try {
    if (url.startsWith("magnet:")) {
      const match = url.match(/dn=([^&]+)/)
      if (match) {
        return decodeURIComponent(match[1]).slice(0, 40)
      }
      return "Magnet link"
    }
    const urlObj = new URL(url)
    const path = urlObj.pathname
    const filename = path.split("/").pop() || host
    return decodeURIComponent(filename).slice(0, 40)
  } catch {
    return host
  }
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

interface LinkItemProps {
  link: DetectedLink
  state: UnrestrictedState | undefined
  onUnrestrict: () => void
}

function LinkItem({ link, state, onUnrestrict }: LinkItemProps) {
  const displayName = getDisplayName(link.url, link.host)
  const isMagnet = link.type === "magnet"
  const isLoading = state?.loading
  const isUnrestricted = state?.result
  const hasError = state?.error

  const handleDownload = () => {
    if (state?.result?.download) {
      chrome.tabs.create({ url: state.result.download, active: false })
    }
  }

  const handleCopyLink = () => {
    if (state?.result?.download) {
      navigator.clipboard.writeText(state.result.download)
    }
  }

  return (
    <div className="group flex items-start gap-2 py-2 px-3 rounded-md hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
      {/* Icon */}
      <div className="flex-shrink-0 mt-0.5">
        {isMagnet ? (
          <Magnet size={14} className="text-orange-500" />
        ) : isUnrestricted ? (
          <Check size={14} className="text-primary" />
        ) : (
          <div className="w-3.5 h-3.5 rounded-sm bg-accent/20 flex items-center justify-center">
            <span className="text-[8px] font-bold text-accent uppercase">
              {link.host.slice(0, 2)}
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <span
          className="text-xs font-medium text-neutral-800 dark:text-neutral-200 truncate block"
          title={link.url}
        >
          {displayName}
        </span>
        {isUnrestricted && state.result && (
          <span className="text-[10px] font-mono text-neutral-500 dark:text-neutral-400 block">
            {formatFileSize(state.result.filesize)}
          </span>
        )}
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="text-[10px] font-mono text-neutral-400 dark:text-neutral-500 uppercase">
            {link.host}
          </span>
          {hasError && (
            <span className="text-[10px] text-red-500">{state.error}</span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex-shrink-0 flex items-center gap-1">
        {isLoading ? (
          <div className="p-1.5">
            <Loader2 size={14} className="text-neutral-400 animate-spin" />
          </div>
        ) : isUnrestricted ? (
          <>
            <button
              onClick={handleCopyLink}
              className="p-1.5 rounded text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
              title="Copy link"
            >
              <Copy size={14} />
            </button>
            <button
              onClick={handleDownload}
              className="p-1.5 rounded text-primary hover:bg-primary/10 transition-colors"
              title="Download"
            >
              <Download size={14} />
            </button>
          </>
        ) : (
          <button
            onClick={onUnrestrict}
            disabled={isMagnet}
            className="p-1.5 rounded text-neutral-400 hover:text-accent hover:bg-accent/10 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-neutral-400 transition-colors"
            title={isMagnet ? "Use context menu for magnets" : "Unrestrict"}
          >
            <Unlock size={14} />
          </button>
        )}
      </div>
    </div>
  )
}

export function DetectedLinks({
  links,
  isScanning,
  onScan,
  onUnrestrict,
}: DetectedLinksProps) {
  const [linkStates, setLinkStates] = useState<Record<string, UnrestrictedState>>({})
  const [isUnrestrictingAll, setIsUnrestrictingAll] = useState(false)

  // Reset link states when links change (new scan)
  const linksKey = links.map((l) => l.url).join(",")
  const [prevLinksKey, setPrevLinksKey] = useState(linksKey)
  if (linksKey !== prevLinksKey) {
    setPrevLinksKey(linksKey)
    setLinkStates({})
  }

  const handleUnrestrict = async (link: DetectedLink) => {
    const key = link.url
    setLinkStates((prev) => ({
      ...prev,
      [key]: { loading: true },
    }))

    try {
      const result = await onUnrestrict(link.url)
      setLinkStates((prev) => ({
        ...prev,
        [key]: { loading: false, result },
      }))
    } catch (err) {
      setLinkStates((prev) => ({
        ...prev,
        [key]: { loading: false, error: err instanceof Error ? err.message : "Failed" },
      }))
    }
  }

  const hosterLinks = links.filter((l) => l.type !== "magnet")
  const unrestrictedLinks = Object.entries(linkStates)
    .filter(([, state]) => state.result)
    .map(([, state]) => state.result!)
  const unrestrictedCount = unrestrictedLinks.length
  const pendingHosterLinks = hosterLinks.filter((l) => !linkStates[l.url]?.result && !linkStates[l.url]?.loading)

  const handleUnrestrictAll = async () => {
    if (isUnrestrictingAll || pendingHosterLinks.length === 0) return
    setIsUnrestrictingAll(true)

    // Unrestrict all pending hoster links
    for (const link of pendingHosterLinks) {
      await handleUnrestrict(link)
    }

    setIsUnrestrictingAll(false)
  }

  const handleDownloadAll = () => {
    // Open all unrestricted download URLs
    for (const result of unrestrictedLinks) {
      if (result.download) {
        chrome.tabs.create({ url: result.download, active: false })
      }
    }
  }

  return (
    <div className="border-t border-neutral-200 dark:border-neutral-800">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-neutral-100 dark:border-neutral-800/50">
        <h3 className="text-[11px] font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          Detected Links
          {links.length > 0 && (
            <span className="ml-1.5 text-neutral-400 dark:text-neutral-500">
              {links.length}
            </span>
          )}
        </h3>
        <button
          onClick={onScan}
          disabled={isScanning}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded-md bg-primary text-neutral-900 hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {isScanning ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              Scanning...
            </>
          ) : (
            <>
              <Search size={14} />
              Scan Page
            </>
          )}
        </button>
      </div>

      {/* Links list */}
      {links.length > 0 ? (
        <>
          <div className="max-h-48 overflow-y-auto">
            {links.map((link, index) => (
              <LinkItem
                key={`${link.url}-${index}`}
                link={link}
                state={linkStates[link.url]}
                onUnrestrict={() => handleUnrestrict(link)}
              />
            ))}
          </div>

          {/* Batch actions */}
          <div className="flex gap-2 px-3 py-2 border-t border-neutral-100 dark:border-neutral-800/50 bg-neutral-50/50 dark:bg-neutral-900/50">
            <button
              onClick={handleUnrestrictAll}
              disabled={pendingHosterLinks.length === 0 || isUnrestrictingAll}
              className="flex-1 h-7 px-2 text-[11px] font-medium rounded border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-40 transition-colors"
            >
              {isUnrestrictingAll ? "Unrestricting..." : `Unrestrict All (${pendingHosterLinks.length})`}
            </button>
            <button
              onClick={handleDownloadAll}
              disabled={unrestrictedCount === 0}
              className="flex-1 h-7 px-2 text-[11px] font-medium rounded bg-primary text-neutral-900 hover:bg-primary/90 disabled:opacity-40 transition-colors"
            >
              Download All ({unrestrictedCount})
            </button>
          </div>
        </>
      ) : (
        <div className="px-4 py-6 text-center">
          <p className="text-xs text-neutral-400 dark:text-neutral-500">
            {isScanning ? "Scanning page for links..." : "Click Scan to detect supported links"}
          </p>
        </div>
      )}
    </div>
  )
}

export default DetectedLinks
