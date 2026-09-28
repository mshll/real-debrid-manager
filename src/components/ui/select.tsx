import clsx from "clsx";
import { ChevronsUpDown } from "lucide-react";
import type { ReactNode } from "react";

export function Select<T extends string>({
  value,
  options,
  onChange,
  disabled,
  className,
  label,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  disabled?: boolean;
  className?: string;
  label?: string;
}): ReactNode {
  return (
    <span className={clsx("relative inline-flex", className)}>
      <select
        aria-label={label}
        value={value}
        disabled={disabled}
        onChange={(event) => {
          const match = options.find((option) => option.value === event.target.value);
          if (match) onChange(match.value);
        }}
        className="h-7 w-full appearance-none rounded-[7px] bg-fill pr-7 pl-2.5 text-[12.5px] text-fg outline-none hover:bg-fill-strong disabled:opacity-40"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronsUpDown className="pointer-events-none absolute top-1/2 right-2 size-3 -translate-y-1/2 text-fg-3" />
    </span>
  );
}
