"use client";

import { useId } from "react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** Label content — can include inert link-styled spans. */
  children: ReactNode;
  error?: string;
  id?: string;
}

/**
 * Light-theme labelled checkbox (TASK-ONBOARD-1). Used for the 18+/terms consent.
 */
export function Checkbox({ checked, onChange, children, error, id }: CheckboxProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const describedById = error ? `${inputId}-error` : undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className="flex cursor-pointer items-start gap-3">
        <input
          id={inputId}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedById}
          className={cn(
            "mt-0.5 h-5 w-5 shrink-0 rounded border accent-brand-primary",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent",
            error ? "border-status-heat" : "border-brand-subtle",
          )}
        />
        <span className="text-sm leading-snug text-slate-600">{children}</span>
      </label>
      {error ? (
        <p id={describedById} className="text-xs text-status-heat">
          {error}
        </p>
      ) : null}
    </div>
  );
}
