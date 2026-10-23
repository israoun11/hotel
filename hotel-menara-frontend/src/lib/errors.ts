import { ApiError } from "../api/client";
import type { Dictionary } from "../i18n";

/** Translated, user-facing message for any error thrown by the API layer. */
export function errorMessage(error: unknown, t: Dictionary): string {
  if (error instanceof ApiError) {
    const known = (t.errors as Record<string, unknown>)[error.code];
    if (typeof known === "string") return known;
    if (error.status >= 500) return t.errors.INTERNAL_ERROR;
  }
  return t.errors.generic;
}

/**
 * Maps the backend's VALIDATION_ERROR details (`{ path: "guest.email", message }`) to form field names.
 * `aliases` translates backend paths to the form's field names, e.g. { "guest.email": "email" }.
 */
export function fieldErrorsFrom(error: unknown, aliases: Record<string, string> = {}): Record<string, string> {
  if (!(error instanceof ApiError) || error.details.length === 0) return {};
  const result: Record<string, string> = {};
  for (const issue of error.details) {
    const field = aliases[issue.path] ?? issue.path;
    if (!result[field]) result[field] = issue.message;
  }
  return result;
}
