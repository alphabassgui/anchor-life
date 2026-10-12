import type { InputHTMLAttributes } from "react";
import { useId } from "react";
import { cn } from "@/lib/utils";

/** Dark is the app default; "light" is the onboarding flow's scoped light theme. */
type InputTone = "dark" | "light";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  /** Inline validation message; when set, the field renders an error state. */
  error?: string;
  /** Non-error helper text shown below the field (e.g. a format hint). */
  hint?: string;
  tone?: InputTone;
}

interface ToneClasses {
  label: string;
  field: string;
  fieldBorder: string;
  hint: string;
}

// Light tone reuses the scheme-independent brand tokens on white/slate surfaces;
// it never redefines the scheme-flipping dark tokens.
const TONE_CLASSES: Record<InputTone, ToneClasses> = {
  dark: {
    label: "text-brand-surface",
    field: "bg-brand-secondary text-brand-surface placeholder:text-brand-subtle/60 focus:ring-brand-accent",
    fieldBorder: "border-brand-subtle/30",
    hint: "text-brand-subtle",
  },
  light: {
    label: "text-brand-primary",
    field: "bg-white text-brand-primary placeholder:text-slate-400 focus:ring-brand-accent",
    fieldBorder: "border-brand-subtle",
    hint: "text-slate-500",
  },
};

/**
 * Base labelled text input (TASK-103b-1; light tone added TASK-ONBOARD-1).
 * Token-styled; shows an inline error or a hint beneath the field.
 */
export function Input({ label, error, hint, tone = "dark", className, id, ...props }: InputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const describedById = error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined;
  const t = TONE_CLASSES[tone];

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className={cn("text-sm font-medium", t.label)}>
        {label}
      </label>
      <input
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedById}
        className={cn(
          "overlay-interactive w-full rounded-xl border px-4 py-3 text-sm",
          "focus:outline-none focus:ring-2",
          t.field,
          error ? "border-status-heat" : t.fieldBorder,
          className,
        )}
        {...props}
      />
      {error ? (
        <p id={describedById} className="text-xs text-status-heat">
          {error}
        </p>
      ) : hint ? (
        <p id={describedById} className={cn("text-xs", t.hint)}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}
