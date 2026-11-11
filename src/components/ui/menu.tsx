import { Menu as BaseMenu } from "@base-ui/react/menu";
import clsx from "clsx";
import type { ReactElement, ReactNode } from "react";

export interface MenuAction {
  label: string;
  icon?: ReactNode;
  onSelect: () => void;
  danger?: boolean;
  disabled?: boolean;
  checked?: boolean;
  hint?: string;
}

export type MenuEntry = MenuAction | "separator" | { heading: string };

export function Menu({
  trigger,
  items,
  align = "end",
}: {
  trigger: ReactElement;
  items: MenuEntry[];
  align?: "start" | "center" | "end";
}): ReactNode {
  return (
    <BaseMenu.Root>
      <BaseMenu.Trigger render={trigger} />
      <BaseMenu.Portal>
        <BaseMenu.Positioner sideOffset={6} align={align} className="z-50 outline-none">
          <BaseMenu.Popup className="min-w-52 origin-(--transform-origin) rounded-[10px] bg-raised p-1 shadow-popover transition-[scale,opacity] duration-150 ease-(--ease-out) outline-none data-ending-style:scale-[0.97] data-ending-style:opacity-0 data-starting-style:scale-[0.97] data-starting-style:opacity-0">
            {items.map((item, index) =>
              item === "separator" ? (
                <BaseMenu.Separator key={`separator-${index}`} className="mx-1 my-1 h-px bg-border" />
              ) : "heading" in item ? (
                <div key={item.heading} className="px-2 pt-1.5 pb-1 text-[12px] font-medium text-fg-3">
                  {item.heading}
                </div>
              ) : (
                <BaseMenu.Item
                  key={item.label}
                  disabled={item.disabled}
                  onClick={item.onSelect}
                  className={clsx(
                    "flex h-8 items-center gap-2.5 rounded-[6px] px-2 text-[13px] outline-none select-none data-disabled:opacity-40 data-highlighted:bg-fill-strong [&_svg]:size-4 [&_svg]:shrink-0",
                    item.danger ? "text-danger" : "text-fg [&_svg]:text-fg-3",
                  )}
                >
                  {item.icon}
                  <span className="flex-1 truncate">{item.label}</span>
                  {item.hint && <span className="tabular text-[12px] text-fg-3">{item.hint}</span>}
                  {item.checked && <span className="size-1.5 rounded-full bg-accent" />}
                </BaseMenu.Item>
              ),
            )}
          </BaseMenu.Popup>
        </BaseMenu.Positioner>
      </BaseMenu.Portal>
    </BaseMenu.Root>
  );
}
