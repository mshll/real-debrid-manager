import clsx from "clsx";
import type { ReactNode } from "react";

export interface SegmentedOption<T extends string> {
  value: T;
  label: ReactNode;
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  className,
}: {
  value: T;
  options: SegmentedOption<T>[];
  onChange: (value: T) => void;
  className?: string;
}): ReactNode {
  const index = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );
  return (
    <div
      role="radiogroup"
      className={clsx("relative grid h-8 rounded-[8px] bg-fill p-0.5 select-none", className)}
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      <div
        aria-hidden
        className="absolute inset-y-0.5 left-0.5 rounded-[6px] bg-surface shadow-[0_0_0_1px_var(--border),0_1px_2px_rgba(0,0,0,0.06)] transition-transform duration-200 ease-(--ease-out) dark:bg-fill-strong dark:shadow-none"
        style={{ width: `calc((100% - 4px) / ${options.length})`, transform: `translateX(${index * 100}%)` }}
      />
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={option.value === value}
          onClick={() => onChange(option.value)}
          className={clsx(
            "relative z-10 truncate px-3 text-[13px] font-medium transition-colors duration-150",
            option.value === value ? "text-fg" : "text-fg-3 hover:text-fg",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
