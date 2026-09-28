import clsx from "clsx";
import { Check, Minus } from "lucide-react";
import type { ReactNode } from "react";

/** Visual only; the clickable row owns role="checkbox" so row and box never double-toggle. */
export function CheckMark({
  checked,
  indeterminate,
  className,
}: {
  checked: boolean;
  indeterminate?: boolean;
  className?: string;
}): ReactNode {
  const on = checked || indeterminate;
  return (
    <span
      aria-hidden
      className={clsx(
        "flex size-4 shrink-0 items-center justify-center rounded-[4.5px] transition-colors",
        on ? "bg-accent text-accent-fg" : "shadow-[inset_0_0_0_1.25px_var(--fg-3)]",
        className,
      )}
    >
      {indeterminate ? (
        <Minus className="size-3" strokeWidth={3} />
      ) : checked ? (
        <Check className="size-3" strokeWidth={3} />
      ) : null}
    </span>
  );
}
