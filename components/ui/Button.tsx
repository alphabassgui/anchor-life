import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary";
/** Dark is the app default; "light" is the onboarding flow's scoped light theme. */
type ButtonTone = "dark" | "light";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  tone?: ButtonTone;
}

// Brand tokens (brand-primary navy, brand-accent gold, brand-subtle) are fixed
// hex regardless of color scheme, so the light tone reuses them on white/slate
// surfaces without touching the scheme-flipping dark tokens.
const TONE_VARIANT_CLASSES: Record<ButtonTone, Record<ButtonVariant, string>> = {
  dark: {
    primary:
      "bg-brand-accent text-brand-primary hover:bg-brand-accent-hover focus-visible:ring-brand-accent focus-visible:ring-offset-brand-primary",
    secondary:
      "bg-brand-secondary text-brand-surface hover:bg-brand-primary focus-visible:ring-brand-subtle focus-visible:ring-offset-brand-primary",
  },
  light: {
    primary:
      "bg-brand-primary text-white hover:bg-brand-secondary focus-visible:ring-brand-accent focus-visible:ring-offset-white",
    secondary:
      "bg-white text-brand-primary border border-brand-subtle hover:bg-slate-50 focus-visible:ring-brand-accent focus-visible:ring-offset-white",
  },
};

/**
 * Base button (TASK-103b-1; light tone added TASK-ONBOARD-1). Token-styled;
 * `pointer-events-auto` so it stays interactive under the pointer-events-none
 * overlay convention (globals.css).
 */
export function Button({
  variant = "primary",
  tone = "dark",
  className,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "overlay-interactive inline-flex items-center justify-center rounded-xl px-5 py-3 text-sm font-semibold transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-50",
        TONE_VARIANT_CLASSES[tone][variant],
        className,
      )}
      {...props}
    />
  );
}
