import type { SelectHTMLAttributes } from "react";
import { useId } from "react";
import { cn } from "@/lib/utils";

export interface SelectOption {
  value: string;
  label: string;
}

/** Dark is the app default; "light" is the onboarding flow's scoped light theme. */
type SelectTone = "dark" | "light";

interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "children"> {
  label: string;
  options: readonly SelectOption[];
  /** Shown as the disabled first row; also the empty/unselected value. */
  placeholder?: string;
  error?: string;
  hint?: string;
  tone?: SelectTone;
}

interface ToneClasses {
  label: string;
  field: string;
  fieldBorder: string;
  hint: string;
}

// Light tone reuses the scheme-independent brand tokens on white/slate surfaces
// (same split as Input's light tone); it never redefines the dark tokens.
const TONE_CLASSES: Record<SelectTone, ToneClasses> = {
  dark: {
    label: "text-brand-surface",
    field: "bg-brand-secondary text-brand-surface",
    fieldBorder: "border-brand-subtle/30",
    hint: "text-brand-subtle",
  },
  light: {
    label: "text-brand-primary",
    field: "bg-white text-brand-primary",
    fieldBorder: "border-brand-subtle",
    hint: "text-slate-500",
  },
};

/**
 * Base labelled native <select> (TASK-103b-1; light tone added TASK-ONBOARD-8).
 * Native element = mobile-friendly picker. Token-styled with inline error/hint
 * support.
 */
export function Select({
  label,
  options,
  placeholder = "Select…",
  error,
  hint,
  tone = "dark",
  className,
  id,
  value,
  ...props
}: SelectProps) {
  const generatedId = useId();
  const selectId = id ?? generatedId;
  const describedById = error ? `${selectId}-error` : hint ? `${selectId}-hint` : undefined;
  const t = TONE_CLASSES[tone];

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={selectId} className={cn("text-sm font-medium", t.label)}>
        {label}
      </label>
      <select
        id={selectId}
        value={value}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedById}
        className={cn(
          "overlay-interactive w-full rounded-xl border px-4 py-3 text-sm",
          "focus:outline-none focus:ring-2 focus:ring-brand-accent",
          "disabled:cursor-not-allowed disabled:opacity-50",
          t.field,
          error ? "border-status-heat" : t.fieldBorder,
          className,
        )}
        {...props}
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
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
