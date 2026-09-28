import { Dialog as BaseDialog } from "@base-ui/react/dialog";
import clsx from "clsx";
import type { ReactNode } from "react";

export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  className,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  className?: string;
}): ReactNode {
  return (
    <BaseDialog.Root open={open} onOpenChange={onOpenChange}>
      <BaseDialog.Portal>
        <BaseDialog.Backdrop className="fixed inset-0 z-40 bg-black/25 transition-opacity duration-200 data-ending-style:opacity-0 data-starting-style:opacity-0 dark:bg-black/50" />
        <BaseDialog.Popup
          className={clsx(
            "fixed top-1/2 left-1/2 z-50 flex max-h-[calc(100vh-32px)] w-[calc(100vw-32px)] max-w-lg -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-[14px] bg-bg shadow-popover transition-[scale,opacity] duration-200 ease-(--ease-out) outline-none data-ending-style:scale-[0.97] data-ending-style:opacity-0 data-starting-style:scale-[0.97] data-starting-style:opacity-0",
            className,
          )}
        >
          <div className="px-5 pt-4 pb-3">
            <BaseDialog.Title className="text-[15px] font-semibold text-fg">{title}</BaseDialog.Title>
            {description && (
              <BaseDialog.Description className="mt-1 text-[12.5px] text-fg-2">{description}</BaseDialog.Description>
            )}
          </div>
          {children && <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-3">{children}</div>}
          {footer && <div className="flex items-center justify-end gap-2 px-5 pt-2 pb-4">{footer}</div>}
        </BaseDialog.Popup>
      </BaseDialog.Portal>
    </BaseDialog.Root>
  );
}
