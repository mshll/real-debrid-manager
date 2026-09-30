import { Select as BaseSelect } from "@base-ui/react/select";
import { CaretUpDownIcon, CheckIcon } from "@phosphor-icons/react";
import clsx from "clsx";
import type { ReactNode } from "react";

export function Select<T extends string>({
  value,
  options,
  onChange,
  disabled,
  className,
  label,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  disabled?: boolean;
  className?: string;
  label?: string;
}): ReactNode {
  return (
    <BaseSelect.Root
      items={options}
      value={value}
      disabled={disabled}
      onValueChange={(next) => {
        const match = options.find((option) => option.value === next);
        if (match) onChange(match.value);
      }}
    >
      <BaseSelect.Trigger
        aria-label={label}
        className={clsx(
          "press inline-flex h-8 min-w-0 items-center justify-between gap-2 rounded-[8px] bg-surface pr-2 pl-3 text-[13px] whitespace-nowrap text-fg shadow-[0_0_0_1px_var(--border-strong)] outline-none select-none hover:bg-subtle focus-visible:shadow-[0_0_0_1px_var(--accent),0_0_0_4px_var(--accent-soft)] data-disabled:opacity-40 data-popup-open:bg-subtle dark:hover:bg-raised dark:data-popup-open:bg-raised",
          className,
        )}
      >
        <BaseSelect.Value className="truncate" />
        <BaseSelect.Icon className="flex shrink-0 text-fg-3">
          <CaretUpDownIcon className="size-3.5" weight="bold" />
        </BaseSelect.Icon>
      </BaseSelect.Trigger>
      <BaseSelect.Portal>
        <BaseSelect.Positioner sideOffset={4} alignItemWithTrigger={false} className="z-50 outline-none select-none">
          <BaseSelect.Popup className="min-w-(--anchor-width) origin-(--transform-origin) rounded-[10px] bg-raised p-1 shadow-popover transition-[scale,opacity] duration-150 ease-(--ease-out) outline-none data-ending-style:scale-[0.97] data-ending-style:opacity-0 data-starting-style:scale-[0.97] data-starting-style:opacity-0">
            <BaseSelect.List className="max-h-(--available-height) overflow-y-auto">
              {options.map((option) => (
                <BaseSelect.Item
                  key={option.value}
                  value={option.value}
                  className="flex h-8 items-center gap-2 rounded-[6px] pr-3 pl-2 text-[13px] text-fg outline-none data-highlighted:bg-fill-strong"
                >
                  <span className="flex size-4 shrink-0 items-center justify-center text-accent">
                    <BaseSelect.ItemIndicator>
                      <CheckIcon className="size-3.5" weight="bold" />
                    </BaseSelect.ItemIndicator>
                  </span>
                  <BaseSelect.ItemText className="truncate">{option.label}</BaseSelect.ItemText>
                </BaseSelect.Item>
              ))}
            </BaseSelect.List>
          </BaseSelect.Popup>
        </BaseSelect.Positioner>
      </BaseSelect.Portal>
    </BaseSelect.Root>
  );
}
