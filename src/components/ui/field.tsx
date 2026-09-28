import clsx from "clsx";
import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";

const FIELD =
  "w-full rounded-[8px] bg-fill px-2.5 text-[13px] text-fg placeholder:text-fg-3 outline-none transition-shadow focus:shadow-[0_0_0_3px_var(--accent-soft),0_0_0_1px_var(--accent)]";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>): ReactNode {
  return <input className={clsx(FIELD, "h-8", className)} {...props} />;
}

export function TextArea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>): ReactNode {
  return <textarea className={clsx(FIELD, "resize-none py-2 leading-snug", className)} {...props} />;
}
