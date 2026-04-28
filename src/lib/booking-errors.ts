// Friendly mapping for database errors raised by booking operations.
// The exclusion constraint `appointments_no_overlap` guarantees that
// the same staff member cannot have two overlapping appointments.
// Postgres raises SQLSTATE 23P01 (exclusion_violation) when this happens.

type SupabaseLikeError = {
  code?: string | null;
  message?: string | null;
} | null | undefined;

export function isOverlapError(error: SupabaseLikeError): boolean {
  if (!error) return false;
  if (error.code === "23P01") return true;
  const msg = (error.message || "").toLowerCase();
  return msg.includes("appointments_no_overlap") || msg.includes("conflicting key value");
}

export function bookingErrorMessage(
  error: SupabaseLikeError,
  fallback: string,
  overlapMessage = "This time slot was just taken for the selected staff. Please pick another time."
): string {
  if (isOverlapError(error)) return overlapMessage;
  return error?.message || fallback;
}
