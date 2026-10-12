"use client";

import { useId, useState } from "react";
import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface PasswordFieldProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label: string;
  error?: string;
  hint?: string;
}

/**
 * Light-theme password field with a show/hide toggle (TASK-ONBOARD-1). No shared
 * `ui/` equivalent exists; styled to match the onboarding light `Input` tone.
 */
export function PasswordField({ label, error, hint, className, id, ...props }: PasswordFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const describedById = error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined;
  const [visible, setVisible] = useState(false);

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className="text-sm font-medium text-brand-primary">
        {label}
      </label>
      <div className="relative">
        <input
          id={inputId}
          type={visible ? "text" : "password"}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedById}
          className={cn(
            "w-full rounded-xl border bg-white px-4 py-3 pr-16 text-sm text-brand-primary placeholder:text-slate-400",
            "focus:outline-none focus:ring-2 focus:ring-brand-accent",
            error ? "border-status-heat" : "border-brand-subtle",
            className,
          )}
          {...props}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-pressed={visible}
          aria-label={visible ? "Hide password" : "Show password"}
          className="absolute inset-y-0 right-0 flex items-center rounded-r-xl px-4 text-xs font-semibold text-slate-500 hover:text-brand-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent"
        >
          {visible ? "Hide" : "Show"}
        </button>
      </div>
      {error ? (
        <p id={describedById} className="text-xs text-status-heat">
          {error}
        </p>
      ) : hint ? (
        <p id={describedById} className="text-xs text-slate-500">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
