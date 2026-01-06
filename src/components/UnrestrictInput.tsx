import { ArrowRight, Check, Copy, Download, Loader2, X } from "lucide-react"
import { useState } from "react"

import type { UnrestrictedLink } from "~lib/api/unrestrict"

interface UnrestrictInputProps {
  onUnrestrict: (link: string) => Promise<UnrestrictedLink>
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
  const [result, setResult] = useState<UnrestrictedLink | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    setIsLoading(true)
    setError(null)
    setResult(null)

    try {
      const unrestricted = await onUnrestrict(input.trim())
      setResult(unrestricted)
      setInput("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to unrestrict link")
    } finally {
      setIsLoading(false)
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
    setError(null)
  }

  return (
    <div className="px-4 py-3">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Paste link..."
          disabled={isLoading}
          className="flex-1 h-9 px-3 text-sm bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 rounded-md placeholder:text-neutral-400 dark:placeholder:text-neutral-500 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary disabled:opacity-50 transition-colors"
        />
        <button
          type="submit"
          disabled={!input.trim() || isLoading}
          className="flex items-center justify-center w-9 h-9 rounded-md bg-primary text-neutral-900 hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? (
            <Loader2 size={16} className="text-neutral-900 animate-spin" />
          ) : (
            <ArrowRight size={16} className="text-neutral-900" />
          )}
        </button>
      </form>

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
    </div>
  )
}

export default UnrestrictInput
