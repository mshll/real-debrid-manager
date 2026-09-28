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
      className="relative inline-flex h-[22px] w-[38px] shrink-0 rounded-full bg-fill-strong p-[2px] transition-colors duration-200 data-checked:bg-accent data-disabled:opacity-40"
    >
      <BaseSwitch.Thumb className="size-[18px] rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.25),0_0_0_0.5px_rgba(0,0,0,0.04)] transition-transform duration-200 ease-(--ease-out) data-checked:translate-x-4" />
    </BaseSwitch.Root>
  );
}
