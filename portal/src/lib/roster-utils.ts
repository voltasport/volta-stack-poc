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
