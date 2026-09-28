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
      className={clsx("relative grid h-7 rounded-[8px] bg-fill p-[2px] select-none", className)}
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      <div
        aria-hidden
        className="absolute inset-y-[2px] left-[2px] rounded-[6px] bg-surface shadow-[0_1px_2px_rgba(0,0,0,0.12),0_0_0_0.5px_rgba(0,0,0,0.05)] transition-transform duration-200 ease-(--ease-out) dark:bg-fill-strong"
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
            "relative z-10 truncate px-2.5 text-[12px] font-medium transition-colors",
            option.value === value ? "text-fg" : "text-fg-2 hover:text-fg",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
