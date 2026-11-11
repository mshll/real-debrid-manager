import clsx from "clsx";
import type { ButtonHTMLAttributes, ReactNode } from "react";

import { Tooltip } from "./tooltip";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-accent text-accent-fg shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] hover:brightness-[1.06]",
  secondary: "bg-surface text-fg shadow-[0_0_0_1px_var(--border-strong)] hover:bg-subtle dark:hover:bg-raised",
  ghost: "text-fg-2 hover:bg-fill hover:text-fg",
  danger: "bg-danger-soft text-danger hover:bg-danger hover:text-white",
};

const SIZES: Record<Size, string> = {
  sm: "h-7 gap-1.5 rounded-[6px] px-2.5 text-[13px] [&_svg]:size-3.5",
  md: "h-8 gap-2 rounded-[8px] px-3 text-[13px] [&_svg]:size-4",
  lg: "h-10 gap-2 rounded-[8px] px-4 text-[14px] [&_svg]:size-4",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
}

export function Button({
  variant = "secondary",
  size = "md",
  icon,
  className,
  children,
  ...props
}: ButtonProps): ReactNode {
  return (
    <button
      type="button"
      className={clsx(
        "press inline-flex shrink-0 items-center justify-center font-medium whitespace-nowrap select-none disabled:pointer-events-none disabled:opacity-40 [&_svg]:shrink-0",
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
}

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  shortcut?: string;
  size?: "sm" | "md" | "lg";
}

export function IconButton({
  label,
  shortcut,
  size = "md",
  className,
  children,
  ...props
}: IconButtonProps): ReactNode {
  return (
    <Tooltip label={label} shortcut={shortcut}>
      <button
        type="button"
        aria-label={label}
        className={clsx(
          "press inline-flex shrink-0 items-center justify-center rounded-[6px] text-fg-3 hover:bg-fill hover:text-fg disabled:pointer-events-none disabled:opacity-40 data-popup-open:bg-fill data-popup-open:text-fg",
          { sm: "size-6 [&_svg]:size-3.5", md: "size-7 [&_svg]:size-4", lg: "size-8 [&_svg]:size-[18px]" }[size],
          className,
        )}
        {...props}
      >
        {children}
      </button>
    </Tooltip>
  );
}

export function Kbd({ children, className }: { children: ReactNode; className?: string }): ReactNode {
  return (
    <kbd
      className={clsx(
        "inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-[4px] bg-fill-strong px-1 font-sans text-[11px] font-medium text-fg-2",
        className,
      )}
    >
      {children}
    </kbd>
  );
}
