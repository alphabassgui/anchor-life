import type { InputHTMLAttributes } from "react";
import { useId } from "react";
import { cn } from "@/lib/utils";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  /** Inline validation message; when set, the field renders an error state. */
  error?: string;
  /** Non-error helper text shown below the field (e.g. a format hint). */
  hint?: string;
}

/**
 * Base labelled text input (TASK-103b-1). Token-styled; shows an inline error or
 * a hint beneath the field. `pointer-events-auto` for the overlay convention.
 */
export function Input({ label, error, hint, className, id, ...props }: InputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const describedById = error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className="text-sm font-medium text-brand-surface">
        {label}
      </label>
      <input
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedById}
        className={cn(
          "overlay-interactive w-full rounded-xl border bg-brand-secondary px-4 py-3 text-sm text-brand-surface placeholder:text-brand-subtle/60",
          "focus:outline-none focus:ring-2 focus:ring-brand-accent",
          error ? "border-status-heat" : "border-brand-subtle/30",
          className,
        )}
        {...props}
      />
      {error ? (
        <p id={describedById} className="text-xs text-status-heat">
          {error}
        </p>
      ) : hint ? (
        <p id={describedById} className="text-xs text-brand-subtle">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
