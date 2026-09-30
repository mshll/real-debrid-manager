import type { ReactNode } from "react";

export function SectionHeader({ title, children }: { title: ReactNode; children?: ReactNode }): ReactNode {
  return (
    <div className="flex h-10 shrink-0 items-center justify-between gap-2 border-t border-border px-4">
      <h2 className="text-[12px] font-medium text-fg-3">{title}</h2>
      {children}
    </div>
  );
}
