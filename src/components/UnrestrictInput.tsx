import { ArrowRight, Check, Copy, Download, FileArchive, Loader2, X } from "lucide-react"
import { useRef, useState } from "react"

import type { UnrestrictedLink, LinkCheckResult } from "~lib/api/unrestrict"
import { messages } from "~lib/messaging"

interface UnrestrictInputProps {
  onUnrestrict: (link: string) => Promise<UnrestrictedLink>
}

const CONTAINER_EXTENSIONS = [".rsdf", ".ccf", ".ccf3", ".dlc"]

function isContainerFile(filename: string): boolean {
  const lower = filename.toLowerCase()
  return CONTAINER_EXTENSIONS.some((ext) => lower.endsWith(ext))
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B"
  const k = 1024
  const sizes = ["B", "KB", "MB", "GB", "TB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

export function UnrestrictInput({ onUnrestrict }: UnrestrictInputProps) {
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isChecking, setIsChecking] = useState(false)
  const [checkResult, setCheckResult] = useState<LinkCheckResult | null>(null)
  const [result, setResult] = useState<UnrestrictedLink | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [containerLinks, setContainerLinks] = useState<string[]>([])
  const [isProcessingContainer, setIsProcessingContainer] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleCheck = async (link: string) => {
    setIsChecking(true)
    setError(null)
    setCheckResult(null)

    try {
      const response = await messages.checkLink(link)
      if (response.success && response.data) {
        setCheckResult(response.data)
      } else {
        setError(response.error || "Failed to check link")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to check link")
    } finally {
      setIsChecking(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading || isChecking) return

    const link = input.trim()

    // If we already have check result, proceed to unrestrict
    if (checkResult) {
      setIsLoading(true)
      setError(null)

      try {
        const unrestricted = await onUnrestrict(link)
        setResult(unrestricted)
        setInput("")
        setCheckResult(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to unrestrict link")
      } finally {
        setIsLoading(false)
      }
    } else {
      // First check the link
      await handleCheck(link)
    }
  }

  const handleContainerFile = async (file: File) => {
    setIsProcessingContainer(true)
    setError(null)
    setContainerLinks([])

    try {
      const arrayBuffer = await file.arrayBuffer()
      const response = await messages.decryptContainerFile(arrayBuffer)
      if (response.success && response.data) {
        setContainerLinks(response.data)
      } else {
        setError(response.error || "Failed to decrypt container")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to process container file")
    } finally {
      setIsProcessingContainer(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && isContainerFile(file.name)) {
      handleContainerFile(file)
    } else if (file) {
      setError("Unsupported file type. Use .rsdf, .ccf, .ccf3, or .dlc files.")
    }
    // Reset input so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleDownload = () => {
    if (result?.download) {
      window.open(result.download, "_blank")
    }
  }

  const handleCopy = async () => {
    if (result?.download) {
      await navigator.clipboard.writeText(result.download)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleClear = () => {
    setResult(null)
    setCheckResult(null)
    setError(null)
    setContainerLinks([])
  }

  const handleClearContainerLinks = () => {
    setContainerLinks([])
  }

  return (
    <div className="px-4 py-3">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => {
            setInput(e.target.value)
            // Clear check result when input changes
            if (checkResult) setCheckResult(null)
          }}
          placeholder="Paste link..."
          disabled={isLoading || isChecking}
          className="flex-1 h-9 px-3 text-sm bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 rounded-md placeholder:text-neutral-400 dark:placeholder:text-neutral-500 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary disabled:opacity-50 transition-colors"
        />
        <button
          type="submit"
          disabled={!input.trim() || isLoading || isChecking}
          className="flex items-center justify-center w-9 h-9 rounded-md bg-primary text-neutral-900 hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading || isChecking ? (
            <Loader2 size={16} className="text-neutral-900 animate-spin" />
          ) : (
            <ArrowRight size={16} className="text-neutral-900" />
          )}
        </button>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isProcessingContainer}
          className="flex items-center justify-center w-9 h-9 rounded-md border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-40 transition-colors"
          title="Upload container file (.rsdf, .ccf, .dlc)"
        >
          {isProcessingContainer ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <FileArchive size={16} />
          )}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".rsdf,.ccf,.ccf3,.dlc"
          onChange={handleFileChange}
          className="hidden"
        />
      </form>

      {/* Link check preview */}
      {checkResult && !result && (
        <div className="mt-3 p-3 bg-accent/10 border border-accent/30 rounded-md">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">
                {checkResult.filename}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-neutral-500 dark:text-neutral-400 font-mono tabular-nums">
                  {formatFileSize(checkResult.filesize)}
                </span>
                <span className="text-xs text-neutral-400 dark:text-neutral-500">
                  {checkResult.host}
                </span>
                {checkResult.supported === 1 ? (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/20 text-primary font-medium">
                    Supported
                  </span>
                ) : (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-500 font-medium">
                    Not supported
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={() => setCheckResult(null)}
              className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
            >
              <X size={14} />
            </button>
          </div>
          {checkResult.supported === 1 && (
            <p className="mt-2 text-[11px] text-neutral-500 dark:text-neutral-400">
              Press Enter or click arrow to unrestrict
            </p>
          )}
        </div>
      )}

      {error && (
        <div className="mt-3 px-3 py-2 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-md">
          {error}
        </div>
      )}

      {result && (
        <div className="mt-3 p-3 bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 rounded-md">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">
                {result.filename}
              </p>
              <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400 font-mono tabular-nums">
                {formatFileSize(result.filesize)}
              </p>
            </div>
            <button
              onClick={handleClear}
              className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
            >
              <X size={14} />
            </button>
          </div>

          <div className="flex gap-2 mt-3">
            <button
              onClick={handleDownload}
              className="flex-1 inline-flex items-center justify-center gap-1.5 h-8 px-3 text-xs font-medium rounded-md bg-primary text-neutral-900 hover:bg-primary/90 transition-colors"
            >
              <Download size={14} />
              Download
            </button>
            <button
              onClick={handleCopy}
              className="inline-flex items-center justify-center gap-1.5 h-8 px-3 text-xs font-medium rounded-md border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            >
              {copied ? <Check size={14} className="text-primary" /> : <Copy size={14} />}
              {copied ? "Copied" : "Copy Link"}
            </button>
          </div>
        </div>
      )}

      {/* Container links extracted */}
      {containerLinks.length > 0 && (
        <div className="mt-3 p-3 bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 rounded-md">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
              Extracted Links ({containerLinks.length})
            </span>
            <button
              onClick={handleClearContainerLinks}
              className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
            >
              <X size={14} />
            </button>
          </div>
          <div className="max-h-32 overflow-y-auto space-y-1">
            {containerLinks.map((link, i) => (
              <div
                key={i}
                className="text-[11px] font-mono text-neutral-600 dark:text-neutral-400 truncate py-1 px-2 bg-neutral-100 dark:bg-neutral-800 rounded"
                title={link}
              >
                {link}
              </div>
            ))}
          </div>
          <p className="mt-2 text-[10px] text-neutral-500 dark:text-neutral-400">
            Copy a link and paste above to unrestrict
          </p>
        </div>
      )}
    </div>
  )
}

export default UnrestrictInput
