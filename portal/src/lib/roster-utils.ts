export function rosterBackName(displayName: string) {
  const parts = displayName.trim().split(/\s+/).filter(Boolean);
  const last = parts[parts.length - 1] ?? displayName;
  const back = last.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return back.slice(0, 12) || "—";
}

export function rosterRowSubmitted(jersey: string, short: string, back: string) {
  const filled = (value: string) => {
    const trimmed = value.trim();
    return trimmed.length > 0 && trimmed !== "—";
  };
  return filled(jersey) && filled(short) && filled(back);
}

/** Match a raw size against an item's options (case-insensitive); returns the canonical option or null. */
export function normalizeSizeValue(raw: string, options: readonly string[]) {
  const trimmed = raw.trim();
  if (!trimmed || trimmed === "—") return null;
  return options.find((option) => option.toLowerCase() === trimmed.toLowerCase()) ?? null;
}

/** True when every sized item has a valid size for this row (no sized items means complete). */
export function rowSizesComplete(
  items: {id: number; sizeOptions: readonly string[]}[],
  values: Record<number, string>,
) {
  return items.every((item) => normalizeSizeValue(values[item.id] ?? "", item.sizeOptions) !== null);
}
