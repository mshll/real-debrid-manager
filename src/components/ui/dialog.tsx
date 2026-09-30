import { Dialog as BaseDialog } from "@base-ui/react/dialog";
import { XIcon } from "@phosphor-icons/react";
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
        <BaseDialog.Backdrop className="fixed inset-0 z-40 bg-black/30 transition-opacity duration-200 data-ending-style:opacity-0 data-starting-style:opacity-0 dark:bg-black/60" />
        <BaseDialog.Popup
          className={clsx(
            "fixed top-[12vh] left-1/2 z-50 flex max-h-[76vh] w-[calc(100vw-32px)] max-w-lg -translate-x-1/2 flex-col overflow-hidden rounded-[12px] bg-raised shadow-popover transition-[scale,opacity] duration-200 ease-(--ease-out) outline-none data-ending-style:scale-[0.97] data-ending-style:opacity-0 data-starting-style:scale-[0.97] data-starting-style:opacity-0",
            className,
          )}
        >
          <div className="flex items-start gap-3 px-5 pt-5 pb-4">
            <div className="min-w-0 flex-1">
              <BaseDialog.Title className="text-[16px] font-semibold tracking-[-0.01em] text-fg">
                {title}
              </BaseDialog.Title>
              {description && (
                <BaseDialog.Description className="mt-1 text-[13px] text-fg-2">{description}</BaseDialog.Description>
              )}
            </div>
            <BaseDialog.Close
              aria-label="Close"
              className="press -mt-1 -mr-1.5 flex size-7 shrink-0 items-center justify-center rounded-[6px] text-fg-3 hover:bg-fill hover:text-fg"
            >
              <XIcon className="size-4" />
            </BaseDialog.Close>
          </div>
          {children && <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5">{children}</div>}
          {footer && (
            <div className="flex items-center justify-end gap-2 border-t border-border bg-subtle px-5 py-3 dark:bg-surface">
              {footer}
            </div>
          )}
        </BaseDialog.Popup>
      </BaseDialog.Portal>
    </BaseDialog.Root>
  );
}
