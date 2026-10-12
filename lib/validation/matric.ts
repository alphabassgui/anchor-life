/**
 * Shared matric-number validation (TASK-103a).
 *
 * Format: AUL/<3 uppercase letters>/<2 digits>/<3 digits>  e.g. "AUL/CSC/23/045".
 * Pure module — safe to import from both client and server code. No server-only imports.
 */
export const MATRIC_REGEX = /^AUL\/[A-Z]{3}\/\d{2}\/\d{3}$/;

export function isValidMatric(value: string): boolean {
  return MATRIC_REGEX.test(value);
}
