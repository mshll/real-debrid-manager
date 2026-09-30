import type { ReactNode } from "react";

export function EmptyState({
  icon,
  title,
  description,
  children,
}: {
  icon: ReactNode;
  title: string;
  description?: ReactNode;
  children?: ReactNode;
}): ReactNode {
  return (
    <div className="flex h-full min-h-72 flex-col items-center justify-center px-8 py-16 text-center">
      <div className="flex size-12 items-center justify-center rounded-[12px] bg-surface text-fg-3 shadow-panel [&_svg]:size-6">
        {icon}
      </div>
      <p className="mt-4 text-[15px] font-semibold tracking-[-0.01em]">{title}</p>
      {description && <p className="mt-1 max-w-80 text-[13px] leading-relaxed text-fg-3">{description}</p>}
      {children && <div className="mt-5 flex items-center gap-2">{children}</div>}
    </div>
  );
}
