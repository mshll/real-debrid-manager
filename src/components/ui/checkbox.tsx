import { CheckIcon, MinusIcon } from "@phosphor-icons/react";
import clsx from "clsx";
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
        "flex size-4 shrink-0 items-center justify-center rounded-[4px] transition-colors duration-150",
        on ? "bg-accent text-accent-fg" : "bg-surface shadow-[inset_0_0_0_1px_var(--fg-4)]",
        className,
      )}
    >
      {indeterminate ? (
        <MinusIcon className="size-3" weight="bold" />
      ) : checked ? (
        <CheckIcon className="size-3" weight="bold" />
      ) : null}
    </span>
  );
}
