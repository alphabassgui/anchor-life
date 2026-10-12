import type { SelectHTMLAttributes } from "react";
import { useId } from "react";
import { cn } from "@/lib/utils";

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "children"> {
  label: string;
  options: readonly SelectOption[];
  /** Shown as the disabled first row; also the empty/unselected value. */
  placeholder?: string;
  error?: string;
  hint?: string;
}

/**
 * Base labelled native <select> (TASK-103b-1). Native element = mobile-friendly
 * picker. Token-styled with inline error/hint support.
 */
export function Select({
  label,
  options,
  placeholder = "Select…",
  error,
  hint,
  className,
  id,
  value,
  ...props
}: SelectProps) {
  const generatedId = useId();
  const selectId = id ?? generatedId;
  const describedById = error ? `${selectId}-error` : hint ? `${selectId}-hint` : undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={selectId} className="text-sm font-medium text-brand-surface">
        {label}
      </label>
      <select
        id={selectId}
        value={value}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedById}
        className={cn(
          "overlay-interactive w-full rounded-xl border bg-brand-secondary px-4 py-3 text-sm text-brand-surface",
          "focus:outline-none focus:ring-2 focus:ring-brand-accent",
          "disabled:cursor-not-allowed disabled:opacity-50",
          error ? "border-status-heat" : "border-brand-subtle/30",
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
        <p id={describedById} className="text-xs text-brand-subtle">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
