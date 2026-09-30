import clsx from "clsx";
import type { ReactNode } from "react";

export function PopupRow({
  icon,
  title,
  meta,
  actions,
  muted,
  disabled,
  onClick,
}: {
  icon: ReactNode;
  title: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
  muted?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}): ReactNode {
  return (
    <div className="group relative flex h-9 items-center rounded-[8px] focus-within:bg-fill hover:bg-fill">
      <button
        type="button"
        disabled={disabled}
        onClick={onClick}
        title={typeof title === "string" ? title : undefined}
        className="flex h-full min-w-0 flex-1 items-center gap-3 px-2 text-left"
      >
        {icon}
        <span className={clsx("min-w-0 flex-1 truncate text-[13px]", muted && "text-fg-3")}>{title}</span>
        {meta && <span className="tabular shrink-0 text-[12px] text-fg-3">{meta}</span>}
      </button>
      {actions && (
        <div className="row-actions absolute inset-y-0 right-0 flex items-center gap-0.5 rounded-r-[8px] pr-1.5 opacity-0 transition-opacity duration-100 group-focus-within:opacity-100 group-hover:opacity-100">
          {actions}
        </div>
      )}
    </div>
  );
}
