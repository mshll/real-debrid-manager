import { MagnifyingGlassIcon, XIcon } from "@phosphor-icons/react";
import type { ReactNode, RefObject } from "react";

import { Kbd } from "@/components/ui/button";

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
    <header className="@container flex h-13 shrink-0 items-center gap-3 border-b border-border px-5">
      <h1 className="shrink-0 text-[14px] font-semibold">{title}</h1>
      {subtitle && <span className="tabular shrink-0 text-[13px] whitespace-nowrap text-fg-3">{subtitle}</span>}
      <div className="ml-auto flex min-w-0 items-center justify-end gap-2">{children}</div>
    </header>
  );
}

/** Page for account and settings: centered, width-capped, with a large title. */
export function Page({
  title,
  description,
  leading,
  action,
  width = "max-w-3xl",
  children,
}: {
  title: string;
  description?: ReactNode;
  leading?: ReactNode;
  action?: ReactNode;
  width?: string;
  children: ReactNode;
}): ReactNode {
  return (
    <section className="min-w-0 flex-1 overflow-y-auto">
      <div className={`mx-auto flex flex-col gap-10 px-8 pt-12 pb-16 ${width}`}>
        <div className="flex items-center gap-4">
          {leading}
          <div className="min-w-0 flex-1">
            <h1 className="text-[24px] font-semibold tracking-[-0.02em]">{title}</h1>
            {description && <p className="mt-0.5 truncate text-[14px] text-fg-3">{description}</p>}
          </div>
          {action}
        </div>
        {children}
      </div>
    </section>
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
    <div className="relative w-64 min-w-32 shrink">
      <MagnifyingGlassIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-fg-3" />
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
        className="peer h-8 w-full rounded-[8px] bg-fill pr-8 pl-8 text-[13px] transition-shadow duration-150 outline-none placeholder:text-fg-3 focus:bg-surface focus:shadow-[0_0_0_1px_var(--accent),0_0_0_4px_var(--accent-soft)]"
      />
      {value ? (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => onChange("")}
          className="absolute top-1/2 right-1.5 flex size-5 -translate-y-1/2 items-center justify-center rounded-[4px] text-fg-3 hover:bg-fill-strong hover:text-fg"
        >
          <XIcon className="size-3" />
        </button>
      ) : (
        <Kbd className="pointer-events-none absolute top-1/2 right-1.5 -translate-y-1/2 peer-focus:hidden">/</Kbd>
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
    <div className="pointer-events-none absolute inset-x-0 bottom-6 z-20 flex justify-center">
      <div className="pointer-events-auto flex items-center gap-1 rounded-[12px] bg-raised p-1.5 pl-2 shadow-popover transition-[opacity,translate] duration-200 ease-(--ease-out) starting:translate-y-2 starting:opacity-0">
        <button
          type="button"
          aria-label="Clear selection"
          onClick={onClear}
          className="press flex h-7 items-center gap-2 rounded-[6px] pr-2.5 pl-2 text-[13px] font-medium hover:bg-fill"
        >
          <XIcon className="size-3.5 text-fg-3" />
          <span className="tabular">
            {count} selected{detail && <span className="font-normal text-fg-3"> · {detail}</span>}
          </span>
        </button>
        <span className="mx-1 h-5 w-px bg-border" />
        {children}
      </div>
    </div>
  );
}
