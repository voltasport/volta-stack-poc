export function isPgError(error: unknown, code: string) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as {code: string}).code === code
  );
}

/** Undefined table (e.g. migration not applied yet). */
function messageOf(error: unknown) {
  if (error instanceof Error) return error.message;
  return String(error);
}

export function isMissingTable(error: unknown, table: string) {
  return isPgError(error, "42P01") && messageOf(error).includes(table);
}

/** Undefined column (e.g. school_slug before migration). */
export function isMissingColumn(error: unknown, column: string) {
  return isPgError(error, "42703") && messageOf(error).includes(column);
}
