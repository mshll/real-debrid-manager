import { Switch as BaseSwitch } from "@base-ui/react/switch";
import type { ReactNode } from "react";

export function Switch({
  checked,
  onChange,
  disabled,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
}): ReactNode {
  return (
    <BaseSwitch.Root
      checked={checked}
      onCheckedChange={onChange}
      disabled={disabled}
      aria-label={label}
      className="relative inline-flex h-5 w-8 shrink-0 rounded-full bg-fill-strong p-0.5 shadow-[inset_0_0_0_1px_var(--border)] transition-colors duration-150 data-checked:bg-accent data-checked:shadow-none data-disabled:opacity-40"
    >
      <BaseSwitch.Thumb className="size-4 rounded-full bg-white shadow-[0_1px_2px_rgba(0,0,0,0.25)] transition-transform duration-150 ease-(--ease-out) data-checked:translate-x-3" />
    </BaseSwitch.Root>
  );
}
