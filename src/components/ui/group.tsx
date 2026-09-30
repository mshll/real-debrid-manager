import clsx from "clsx";
import type { ReactNode } from "react";

export function Card({ children, className }: { children: ReactNode; className?: string }): ReactNode {
  return <div className={clsx("rounded-[12px] bg-surface shadow-panel", className)}>{children}</div>;
}

/** Titled section with a card of rows, as in Linear's settings. */
export function Group({
  title,
  description,
  footer,
  action,
  children,
  className,
}: {
  title?: ReactNode;
  description?: ReactNode;
  footer?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}): ReactNode {
  return (
    <section className={className}>
      {(title || action) && (
        <div className="mb-3 flex items-end justify-between gap-4">
          <div className="min-w-0">
            {title && <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-fg">{title}</h2>}
            {description && <p className="mt-0.5 text-[13px] text-fg-3">{description}</p>}
          </div>
          {action}
        </div>
      )}
      <Card className="divide-y divide-border overflow-hidden">{children}</Card>
      {footer && <p className="mt-2.5 text-[12px] leading-relaxed text-fg-3">{footer}</p>}
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
      {icon && (
        <span className="flex size-8 shrink-0 items-center justify-center rounded-[8px] bg-fill text-fg-2 [&_svg]:size-4">
          {icon}
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block text-[14px] text-fg">{label}</span>
        {description && <span className="mt-0.5 block text-[13px] leading-snug text-fg-3">{description}</span>}
      </span>
      {children && <span className="flex shrink-0 items-center gap-2 text-fg-2">{children}</span>}
    </>
  );
  const classes = clsx("flex min-h-14 w-full items-center gap-4 px-4 py-3 text-left", className);
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={clsx(classes, "transition-colors duration-150 hover:bg-fill")}>
        {content}
      </button>
    );
  }
  return <div className={classes}>{content}</div>;
}
