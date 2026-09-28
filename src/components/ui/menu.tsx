import { Menu as BaseMenu } from "@base-ui/react/menu";
import clsx from "clsx";
import type { ReactElement, ReactNode } from "react";

export interface MenuAction {
  label: string;
  icon?: ReactNode;
  onSelect: () => void;
  danger?: boolean;
  disabled?: boolean;
}

export function Menu({
  trigger,
  items,
  align = "end",
}: {
  trigger: ReactElement;
  items: (MenuAction | "separator")[];
  align?: "start" | "center" | "end";
}): ReactNode {
  return (
    <BaseMenu.Root>
      <BaseMenu.Trigger render={trigger} />
      <BaseMenu.Portal>
        <BaseMenu.Positioner sideOffset={4} align={align} className="z-50 outline-none">
          <BaseMenu.Popup className="min-w-44 origin-(--transform-origin) rounded-[10px] bg-surface p-1 shadow-popover transition-[scale,opacity] duration-150 ease-(--ease-out) outline-none data-ending-style:scale-[0.97] data-ending-style:opacity-0 data-starting-style:scale-[0.97] data-starting-style:opacity-0 dark:bg-[#2a2a2d]">
            {items.map((item, index) =>
              item === "separator" ? (
                <BaseMenu.Separator key={`separator-${index}`} className="mx-2 my-1 h-px bg-separator" />
              ) : (
                <BaseMenu.Item
                  key={item.label}
                  disabled={item.disabled}
                  onClick={item.onSelect}
                  className={clsx(
                    "flex h-7 items-center gap-2 rounded-[6px] px-2 text-[13px] outline-none select-none data-disabled:opacity-40 data-highlighted:bg-accent data-highlighted:text-accent-fg [&_svg]:size-3.5",
                    item.danger ? "text-danger" : "text-fg",
                  )}
                >
                  {item.icon}
                  {item.label}
                </BaseMenu.Item>
              ),
            )}
          </BaseMenu.Popup>
        </BaseMenu.Positioner>
      </BaseMenu.Portal>
    </BaseMenu.Root>
  );
}
