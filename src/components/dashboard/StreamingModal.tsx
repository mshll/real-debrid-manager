import { Check, Copy, ExternalLink, Film, Loader2, X } from "lucide-react"
import { useState, useEffect } from "react"
import { messages } from "~lib/messaging"
import type { TranscodeQuality, MediaInfo } from "~lib/api/streaming"

interface StreamingModalProps {
  isOpen: boolean
  onClose: () => void
  fileId: string
  filename: string
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)

  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }
  return `${minutes}m ${secs}s`
}

function formatBitrate(bitrate: number): string {
  if (bitrate >= 1000000) {
    return `${(bitrate / 1000000).toFixed(1)} Mbps`
  }
  return `${(bitrate / 1000).toFixed(0)} Kbps`
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B"
  const k = 1024
  const sizes = ["B", "KB", "MB", "GB", "TB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

export function StreamingModal({ isOpen, onClose, fileId, filename }: StreamingModalProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [transcodeLinks, setTranscodeLinks] = useState<TranscodeQuality | null>(null)
  const [mediaInfo, setMediaInfo] = useState<MediaInfo | null>(null)
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen || !fileId) return

    const fetchData = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const [transcodeResponse, mediaResponse] = await Promise.all([
          messages.getTranscodeLinks(fileId),
          messages.getMediaInfo(fileId),
        ])

        if (transcodeResponse.success && transcodeResponse.data) {
          setTranscodeLinks(transcodeResponse.data)
        } else {
          setError(transcodeResponse.error || "Failed to get transcode links")
        }

        if (mediaResponse.success && mediaResponse.data) {
          setMediaInfo(mediaResponse.data)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load streaming info")
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [isOpen, fileId])

  const handleCopyLink = async (url: string) => {
    await navigator.clipboard.writeText(url)
    setCopiedUrl(url)
    setTimeout(() => setCopiedUrl(null), 2000)
  }

  const handleOpenStream = (url: string) => {
    window.open(url, "_blank")
  }

  if (!isOpen) return null

  // Extract video info from mediaInfo
  const videoInfo = mediaInfo?.video ? Object.values(mediaInfo.video)[0] : null
  const audioInfo = mediaInfo?.audio ? Object.values(mediaInfo.audio)[0] : null

  // Parse transcode links into quality options
  const qualityOptions: Array<{ name: string; url: string; resolution?: string }> = []
  if (transcodeLinks) {
    for (const [format, urls] of Object.entries(transcodeLinks)) {
      if (typeof urls === "object" && urls !== null) {
        for (const [quality, url] of Object.entries(urls)) {
          if (typeof url === "string") {
            qualityOptions.push({
              name: format === "apple" ? "HLS" : format === "dash" ? "DASH" : format,
              resolution: quality === "full" ? "Original" : quality,
              url,
            })
          }
        }
      }
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-lg mx-4 bg-white dark:bg-neutral-900 rounded-xl shadow-xl border border-neutral-200 dark:border-neutral-800 max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center gap-2">
            <Film size={18} className="text-accent" />
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              Stream Video
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Filename */}
          <div>
            <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate" title={filename}>
              {filename}
            </p>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={24} className="text-neutral-400 animate-spin" />
            </div>
          ) : error ? (
            <div className="px-4 py-3 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg">
              {error}
            </div>
          ) : (
            <>
              {/* Media Info */}
              {mediaInfo && (
                <div className="grid grid-cols-2 gap-3">
                  {videoInfo && (
                    <div className="p-3 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg">
                      <p className="text-[10px] uppercase tracking-wide text-neutral-500 dark:text-neutral-400 mb-1">
                        Video
                      </p>
                      <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                        {videoInfo.width}x{videoInfo.height}
                      </p>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">
                        {videoInfo.codec}
                      </p>
                    </div>
                  )}
                  {mediaInfo.duration > 0 && (
                    <div className="p-3 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg">
                      <p className="text-[10px] uppercase tracking-wide text-neutral-500 dark:text-neutral-400 mb-1">
                        Duration
                      </p>
                      <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                        {formatDuration(mediaInfo.duration)}
                      </p>
                      {mediaInfo.bitrate > 0 && (
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">
                          {formatBitrate(mediaInfo.bitrate)}
                        </p>
                      )}
                    </div>
                  )}
                  {audioInfo && (
                    <div className="p-3 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg">
                      <p className="text-[10px] uppercase tracking-wide text-neutral-500 dark:text-neutral-400 mb-1">
                        Audio
                      </p>
                      <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                        {audioInfo.codec}
                      </p>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">
                        {audioInfo.channels}ch
                      </p>
                    </div>
                  )}
                  {mediaInfo.size > 0 && (
                    <div className="p-3 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg">
                      <p className="text-[10px] uppercase tracking-wide text-neutral-500 dark:text-neutral-400 mb-1">
                        Size
                      </p>
                      <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                        {formatFileSize(mediaInfo.size)}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Quality Options */}
              {qualityOptions.length > 0 && (
                <div>
                  <h4 className="text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-2">
                    Stream Quality
                  </h4>
                  <div className="space-y-2">
                    {qualityOptions.map((option, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg border border-neutral-200 dark:border-neutral-700"
                      >
                        <div>
                          <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                            {option.resolution}
                          </p>
                          <p className="text-xs text-neutral-500 dark:text-neutral-400">
                            {option.name}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleCopyLink(option.url)}
                            className="p-2 rounded-md text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
                            title="Copy stream URL"
                          >
                            {copiedUrl === option.url ? (
                              <Check size={16} className="text-primary" />
                            ) : (
                              <Copy size={16} />
                            )}
                          </button>
                          <button
                            onClick={() => handleOpenStream(option.url)}
                            className="p-2 rounded-md text-accent hover:bg-accent/10 transition-colors"
                            title="Open stream"
                          >
                            <ExternalLink size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {qualityOptions.length === 0 && !error && (
                <div className="text-center py-6 text-sm text-neutral-500 dark:text-neutral-400">
                  No streaming options available for this file
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default StreamingModal
