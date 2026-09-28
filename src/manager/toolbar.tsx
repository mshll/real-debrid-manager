import { Search, X } from "lucide-react";
import type { ReactNode, RefObject } from "react";

export function Toolbar({
  title,
  subtitle,
  children,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  children?: ReactNode;
}): ReactNode {
  return (
    <header className="hairline-b flex h-[52px] shrink-0 items-center gap-3 overflow-hidden px-5">
      <h1 className="shrink-0 text-[15px] font-semibold tracking-[-0.01em]">{title}</h1>
      {subtitle && <span className="tabular shrink-0 text-[12px] whitespace-nowrap text-fg-3">{subtitle}</span>}
      <div className="ml-auto flex min-w-0 items-center justify-end gap-2">{children}</div>
    </header>
  );
}

export function SearchField({
  value,
  onChange,
  inputRef,
  placeholder = "Search",
}: {
  value: string;
  onChange: (value: string) => void;
  inputRef?: RefObject<HTMLInputElement | null>;
  placeholder?: string;
}): ReactNode {
  return (
    <div className="relative w-56 min-w-28 shrink">
      <Search className="pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-fg-3" />
      <input
        ref={inputRef}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            onChange("");
            event.currentTarget.blur();
          }
        }}
        className="h-7 w-full rounded-[7px] bg-fill pr-7 pl-7 text-[12.5px] outline-none placeholder:text-fg-3 focus:shadow-[0_0_0_3px_var(--accent-soft),0_0_0_1px_var(--accent)]"
      />
      {value && (
        <button
          type="button"
          aria-label="Clear"
          onClick={() => onChange("")}
          className="absolute top-1/2 right-1.5 -translate-y-1/2 rounded-full p-0.5 text-fg-3 hover:text-fg"
        >
          <X className="size-3" />
        </button>
      )}
    </div>
  );
}

export function SelectionBar({
  count,
  detail,
  children,
  onClear,
}: {
  count: number;
  detail?: string;
  children: ReactNode;
  onClear: () => void;
}): ReactNode {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-5 flex justify-center">
      <div className="pointer-events-auto flex items-center gap-1 rounded-[12px] bg-surface p-1.5 pl-3.5 shadow-popover transition-[opacity,translate] duration-200 ease-(--ease-out) dark:bg-[#2a2a2d] starting:translate-y-2 starting:opacity-0">
        <span className="tabular mr-2 text-[12.5px] font-medium">
          {count} selected{detail && <span className="font-normal text-fg-3"> · {detail}</span>}
        </span>
        {children}
        <button
          type="button"
          aria-label="Clear selection"
          onClick={onClear}
          className="ml-1 rounded-[7px] p-1.5 text-fg-3 hover:bg-fill hover:text-fg"
        >
          <X className="size-3.5" />
        </button>
      </div>
    </div>
  );
}
