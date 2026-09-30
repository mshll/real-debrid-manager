import clsx from "clsx";
import type { MouseEvent, ReactNode } from "react";

import { CheckMark } from "@/components/ui/checkbox";

export interface RowSelect {
  checked: boolean;
  /** Keep checkboxes showing on every row once anything is selected. */
  selecting: boolean;
  onToggle: (event: MouseEvent) => void;
}

/** The whole row is one button laid under the content, so checkboxes and actions can sit on top without nesting. */
export function PopupRow({
  icon,
  title,
  meta,
  actions,
  select,
  muted,
  disabled,
  onClick,
}: {
  icon: ReactNode;
  title: string;
  meta?: ReactNode;
  actions?: ReactNode;
  select?: RowSelect;
  muted?: boolean;
  disabled?: boolean;
  onClick?: (event: MouseEvent) => void;
}): ReactNode {
  const showCheck = select && (select.selecting || select.checked);
  return (
    <div
      className={clsx(
        "group relative flex h-9 items-center gap-3 rounded-[8px] px-2 focus-within:bg-fill hover:bg-fill",
        select?.checked && "bg-accent-soft! hover:bg-accent-soft",
      )}
    >
      <button
        type="button"
        aria-label={title}
        title={title}
        disabled={disabled}
        onClick={onClick}
        className="absolute inset-0 rounded-[8px] outline-none focus-visible:shadow-[inset_0_0_0_1px_var(--border-strong)]"
      />
      <span className="pointer-events-none relative flex size-4 shrink-0 items-center justify-center">
        <span className={clsx("flex", select && (showCheck ? "invisible" : "group-hover:invisible"))}>{icon}</span>
        {select && (
          <button
            type="button"
            role="checkbox"
            aria-checked={select.checked}
            aria-label={`Select ${title}`}
            onClick={select.onToggle}
            className={clsx(
              "pointer-events-auto absolute -inset-1.5 flex items-center justify-center",
              !showCheck && "invisible group-hover:visible focus-visible:visible",
            )}
          >
            <CheckMark checked={select.checked} />
          </button>
        )}
      </span>
      <span className={clsx("pointer-events-none min-w-0 flex-1 truncate text-[13px]", muted && "text-fg-3")}>
        {title}
      </span>
      {meta && <span className="tabular pointer-events-none shrink-0 text-[12px] text-fg-3">{meta}</span>}
      {actions && (
        <div className="row-actions pointer-events-none absolute inset-y-0 right-0 flex items-center gap-0.5 rounded-r-[8px] pr-1.5 opacity-0 transition-opacity duration-100 group-focus-within:opacity-100 group-hover:opacity-100 [&>*]:pointer-events-auto">
          {actions}
        </div>
      )}
    </div>
  );
}
