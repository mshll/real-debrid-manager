import clsx from "clsx";
import type { ReactNode } from "react";

export function Progress({
  value,
  tone = "accent",
  className,
}: {
  value: number;
  tone?: "accent" | "info" | "danger";
  className?: string;
}): ReactNode {
  const fill = { accent: "bg-accent", info: "bg-info", danger: "bg-danger" }[tone];
  return (
    <div
      className={clsx("h-[3px] overflow-hidden rounded-full bg-fill", className)}
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={clsx("h-full rounded-full transition-[width] duration-500 ease-linear", fill)}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

export function Spinner({ className }: { className?: string }): ReactNode {
  return (
    <svg viewBox="0 0 16 16" className={clsx("size-4 animate-spin [animation-duration:700ms]", className)} aria-hidden>
      <circle cx="8" cy="8" r="6.5" fill="none" stroke="currentColor" strokeOpacity="0.2" strokeWidth="2" />
      <path d="M8 1.5a6.5 6.5 0 0 1 6.5 6.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
