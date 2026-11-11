import clsx from "clsx";
import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";

const FIELD =
  "w-full rounded-[8px] bg-surface px-3 text-[13px] text-fg shadow-[0_0_0_1px_var(--border-strong)] outline-none transition-shadow duration-150 placeholder:text-fg-3 focus:shadow-[0_0_0_1px_var(--accent),0_0_0_4px_var(--accent-soft)]";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>): ReactNode {
  return <input className={clsx(FIELD, "h-8", className)} {...props} />;
}

export function TextArea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>): ReactNode {
  return <textarea className={clsx(FIELD, "resize-none py-2 leading-normal", className)} {...props} />;
}
