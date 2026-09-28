import clsx from "clsx";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-accent text-accent-fg hover:brightness-105 disabled:opacity-40",
  secondary: "bg-fill text-fg hover:bg-fill-strong disabled:opacity-40",
  ghost: "text-fg-2 hover:bg-fill hover:text-fg disabled:opacity-40",
  danger: "bg-danger-soft text-danger hover:brightness-110 disabled:opacity-40",
};

const SIZES: Record<Size, string> = {
  sm: "h-7 px-2.5 text-[12px] gap-1.5 rounded-[7px]",
  md: "h-8 px-3 text-[13px] gap-1.5 rounded-[8px]",
  lg: "h-10 px-4 text-[14px] gap-2 rounded-[10px]",
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
        "press inline-flex shrink-0 items-center justify-center font-medium whitespace-nowrap transition-[background-color,color,filter] select-none disabled:pointer-events-none",
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
  size?: "sm" | "md";
}

export function IconButton({ label, size = "md", className, children, ...props }: IconButtonProps): ReactNode {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={clsx(
        "press inline-flex shrink-0 items-center justify-center rounded-[7px] text-fg-2 transition-colors hover:bg-fill hover:text-fg disabled:opacity-40 [&_svg]:size-4",
        size === "sm" ? "size-6 [&_svg]:size-3.5" : "size-7",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
