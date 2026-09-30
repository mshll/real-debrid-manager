import type { ReactNode } from "react";

import { Skeleton } from "@/components/ui/progress";

export function ListSkeleton(): ReactNode {
  return (
    <div className="flex flex-col">
      {[70, 55, 80, 60].map((width) => (
        <div key={width} className="flex h-9 items-center gap-3 px-2">
          <Skeleton className="size-3.5 rounded-full" />
          <Skeleton style={{ width: `${width}%` }} />
        </div>
      ))}
    </div>
  );
}

export function ListEmpty({
  icon,
  title,
  description,
  children,
}: {
  icon: ReactNode;
  title: string;
  description?: string;
  children?: ReactNode;
}): ReactNode {
  return (
    <div className="flex flex-col items-center px-8 py-12 text-center">
      <span className="text-fg-4 [&_svg]:size-5">{icon}</span>
      <p className="mt-2 text-[13px] font-medium">{title}</p>
      {description && <p className="mt-0.5 text-[12px] text-fg-3">{description}</p>}
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}
