import clsx from "clsx";
import type { ReactNode } from "react";

/** Inset grouped list, as in macOS System Settings. */
export function Group({
  title,
  footer,
  action,
  children,
  className,
}: {
  title?: ReactNode;
  footer?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}): ReactNode {
  return (
    <section className={className}>
      {(title || action) && (
        <div className="mb-1.5 flex items-end justify-between px-1">
          {title && <h3 className="text-[12px] font-semibold text-fg-2">{title}</h3>}
          {action}
        </div>
      )}
      <div className="[&>*+*]:hairline-t overflow-hidden rounded-[10px] bg-surface shadow-card">{children}</div>
      {footer && <p className="mt-1.5 px-1 text-[11.5px] leading-snug text-fg-3">{footer}</p>}
    </section>
  );
}

export function Row({
  label,
  description,
  children,
  icon,
  onClick,
  className,
}: {
  label: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  icon?: ReactNode;
  onClick?: () => void;
  className?: string;
}): ReactNode {
  const content = (
    <>
      {icon && <span className="flex shrink-0 text-fg-2 [&_svg]:size-4">{icon}</span>}
      <span className="min-w-0 flex-1">
        <span className="block text-[13px] text-fg">{label}</span>
        {description && <span className="mt-0.5 block text-[11.5px] leading-snug text-fg-2">{description}</span>}
      </span>
      {children && <span className="flex shrink-0 items-center gap-2 text-fg-2">{children}</span>}
    </>
  );
  const classes = clsx("flex min-h-11 w-full items-center gap-3 px-3.5 py-2 text-left", className);
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={clsx(classes, "transition-colors hover:bg-fill")}>
        {content}
      </button>
    );
  }
  return <div className={classes}>{content}</div>;
}
