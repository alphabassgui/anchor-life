import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge Tailwind utility classes with conditional logic.
 * `clsx` resolves conditionals/arrays; `tailwind-merge` dedupes conflicting
 * Tailwind classes so the last-declared utility wins (e.g. `px-2 px-4` -> `px-4`).
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
