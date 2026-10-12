import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    "bg-brand-accent text-brand-primary hover:bg-brand-accent-hover focus-visible:ring-brand-accent",
  secondary:
    "bg-brand-secondary text-brand-surface hover:bg-brand-primary focus-visible:ring-brand-subtle",
};

/**
 * Base button (TASK-103b-1). Token-styled; `pointer-events-auto` so it stays
 * interactive under the pointer-events-none overlay convention (globals.css).
 */
export function Button({ variant = "primary", className, type = "button", ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "overlay-interactive inline-flex items-center justify-center rounded-xl px-5 py-3 text-sm font-semibold transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-brand-primary",
        "disabled:cursor-not-allowed disabled:opacity-50",
        VARIANT_CLASSES[variant],
        className,
      )}
      {...props}
    />
  );
}
