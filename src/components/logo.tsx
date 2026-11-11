import clsx from "clsx";
import type { ReactNode } from "react";

import icon from "@/assets/icon.png";

export function Logo({ className }: { className?: string }): ReactNode {
  return <img src={icon} alt="" className={clsx("select-none", className)} draggable={false} />;
}
