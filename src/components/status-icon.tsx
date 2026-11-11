import clsx from "clsx";
import type { ReactNode } from "react";

import { isFailed } from "@/lib/format";
import type { TorrentStatus } from "@/lib/rd/types";

const PIE_R = 2.5;
const PIE_C = 2 * Math.PI * PIE_R;

/** Linear-style status glyph: the inner pie tracks download progress. */
export function StatusIcon({
  status,
  progress = 0,
  className,
}: {
  status: TorrentStatus;
  progress?: number;
  className?: string;
}): ReactNode {
  const classes = clsx("size-3.5 shrink-0", className);

  if (status === "downloaded") {
    return (
      <svg viewBox="0 0 14 14" className={clsx(classes, "text-accent")} aria-hidden>
        <circle cx="7" cy="7" r="7" fill="currentColor" />
        <path
          d="M4.2 7.2 6.1 9l3.7-3.9"
          fill="none"
          stroke="var(--accent-fg)"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (isFailed(status)) {
    return (
      <svg viewBox="0 0 14 14" className={clsx(classes, "text-danger")} aria-hidden>
        <circle cx="7" cy="7" r="7" fill="currentColor" />
        <path d="M4.9 4.9 9.1 9.1M9.1 4.9 4.9 9.1" stroke="var(--panel)" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    );
  }
  if (status === "magnet_conversion") {
    return (
      <svg viewBox="0 0 14 14" className={clsx(classes, "animate-spin text-info [animation-duration:3s]")} aria-hidden>
        <circle cx="7" cy="7" r="6" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2.2 2.5" />
      </svg>
    );
  }
  if (status === "waiting_files_selection") {
    return (
      <svg viewBox="0 0 14 14" className={clsx(classes, "text-warning")} aria-hidden>
        <circle cx="7" cy="7" r="6" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="7" cy="7" r="2" fill="currentColor" />
      </svg>
    );
  }
  if (status === "queued") {
    return (
      <svg viewBox="0 0 14 14" className={clsx(classes, "text-fg-3")} aria-hidden>
        <circle cx="7" cy="7" r="6" fill="none" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    );
  }
  const filled = (Math.min(100, Math.max(0, progress)) / 100) * PIE_C;
  return (
    <svg viewBox="0 0 14 14" className={clsx(classes, "text-info")} aria-hidden>
      <circle cx="7" cy="7" r="6" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <circle
        cx="7"
        cy="7"
        r={PIE_R}
        fill="none"
        stroke="currentColor"
        strokeWidth={PIE_R * 2}
        strokeDasharray={`${filled} ${PIE_C}`}
        transform="rotate(-90 7 7)"
        className="transition-[stroke-dasharray] duration-500"
      />
    </svg>
  );
}
