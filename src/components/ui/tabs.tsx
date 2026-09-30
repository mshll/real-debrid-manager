import clsx from "clsx";
import type { ReactNode } from "react";

export interface TabOption<T extends string> {
  value: T;
  label: string;
  count?: number;
}

/** Filter tabs, as in Linear's view switcher. */
export function Tabs<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: TabOption<T>[];
  onChange: (value: T) => void;
}): ReactNode {
  return (
    <div role="radiogroup" className="flex items-center gap-1">
      {options.map((option) => {
        const on = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(option.value)}
            className={clsx(
              "press inline-flex h-7 items-center gap-1.5 rounded-[6px] px-2.5 text-[13px] font-medium whitespace-nowrap",
              on
                ? "bg-surface text-fg shadow-[0_0_0_1px_var(--border-strong)] dark:bg-fill-strong dark:shadow-[0_0_0_1px_var(--border)]"
                : "text-fg-3 hover:bg-fill hover:text-fg",
            )}
          >
            {option.label}
            {option.count !== undefined && option.count > 0 && (
              <span className={clsx("tabular text-[12px]", on ? "text-fg-3" : "text-fg-4")}>{option.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
