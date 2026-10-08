import {ROSTER_CSV_TEMPLATE} from "@/lib/roster-csv-template";
import {rosterBackName, rosterRowSubmitted} from "@/lib/roster-utils";

export {ROSTER_CSV_TEMPLATE};

/** Upper bound on raw CSV text accepted by the import routes (~200 KB). */
export const MAX_ROSTER_CSV_CHARS = 200_000;
/** Upper bound on players per import. */
export const MAX_ROSTER_IMPORT_ROWS = 500;

const MAX_FIELD_LENGTH = {num: 8, name: 80, pos: 24, jersey: 16, short: 16, back: 24} as const;

export const ROSTER_CSV_TOO_LARGE = `CSV is too large. Keep it under ${Math.round(
  MAX_ROSTER_CSV_CHARS / 1000,
)} KB (up to ${MAX_ROSTER_IMPORT_ROWS} players).`;

/** Returns an error message when the CSV text is too large to import, otherwise null. */
export function rosterCsvSizeError(text: string) {
  return text.length > MAX_ROSTER_CSV_CHARS ? ROSTER_CSV_TOO_LARGE : null;
}

export type ParsedRosterCsvRow = {
  rowIndex: number;
  num: string;
  name: string;
  pos: string;
  jersey: string;
  short: string;
  back: string;
};

export type ValidatedRosterCsvRow = ParsedRosterCsvRow & {
  errors: string[];
  ok: boolean;
  submitted: boolean;
};

function splitCsvLine(line: string) {
  return line.split(/[,;\t]/).map((cell) => cell.trim());
}

function headerIndex(headerParts: string[], patterns: RegExp[]) {
  for (let index = 0; index < headerParts.length; index++) {
    const h = headerParts[index] ?? "";
    if (patterns.some((pattern) => pattern.test(h))) return index;
  }
  return -1;
}

export function parseRosterCsv(text: string): ParsedRosterCsvRow[] {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length === 0) return [];

  let numCol = 1;
  let nameCol = 0;
  let posCol = -1;
  let jerseyCol = 2;
  let shortCol = 3;
  let backCol = 4;
  let body = lines;

  const headerParts = splitCsvLine(lines[0]).map((cell) => cell.toLowerCase());
  const looksLikeHeader = headerParts.some((header) =>
    /^(name|number|num|#|no|jersey|short|back|position|pos|athlete|top|shorts)$/.test(header),
  );

  if (looksLikeHeader) {
    body = lines.slice(1);
    const nameIdx = headerIndex(headerParts, [/^name$/, /^athlete$/]);
    const numIdx = headerIndex(headerParts, [/^number$/, /^num$/, /^#$/, /^no$/]);
    const posIdx = headerIndex(headerParts, [/^pos$/, /^position$/]);
    const jerseyIdx = headerIndex(headerParts, [/^jersey$/, /^jersey_size$/, /^top$/, /^jersey_top$/]);
    const shortIdx = headerIndex(headerParts, [/^short$/, /^short_size$/, /^shorts$/]);
    const backIdx = headerIndex(headerParts, [/^back$/, /^back_name$/, /^name_on_back$/]);

    if (nameIdx >= 0) nameCol = nameIdx;
    if (numIdx >= 0) numCol = numIdx;
    if (posIdx >= 0) posCol = posIdx;
    if (jerseyIdx >= 0) jerseyCol = jerseyIdx;
    if (shortIdx >= 0) shortCol = shortIdx;
    if (backIdx >= 0) backCol = backIdx;
  }

  const out: ParsedRosterCsvRow[] = [];
  for (let index = 0; index < body.length; index++) {
    const line = body[index];
    const cols = splitCsvLine(line);
    if (cols.length === 0) continue;

    let num = cols[numCol] ?? "";
    let name = cols[nameCol] ?? "";
    if (!name && cols.length >= 2) {
      name = cols[0] ?? "";
      num = cols[1] ?? "";
    }
    if (!name && cols.length === 1) {
      const parts = line.split(/\s+/);
      if (parts.length >= 2) {
        num = parts[0] ?? "";
        name = parts.slice(1).join(" ");
      }
    }

    const jerseyRaw = jerseyCol >= 0 ? cols[jerseyCol] : "";
    const shortRaw = shortCol >= 0 ? cols[shortCol] : "";
    const backRaw = backCol >= 0 ? cols[backCol] : "";
    const posRaw = posCol >= 0 ? cols[posCol] : "";

    const jersey = jerseyRaw?.trim() || "—";
    const short = shortRaw?.trim() || "—";
    const back = backRaw?.trim() || rosterBackName(name);
    const pos = posRaw?.trim() || "—";

    out.push({
      rowIndex: index + (looksLikeHeader ? 2 : 1),
      num: num.trim(),
      name: name.trim(),
      pos,
      jersey,
      short,
      back,
    });
  }

  return out;
}

export function validateRosterCsvRows(rows: ParsedRosterCsvRow[]): ValidatedRosterCsvRow[] {
  const seenNumbers = new Map<string, number>();
  return rows.map((row) => {
    const errors: string[] = [];
    if (!row.name) errors.push("Name is required.");
    if (!row.num) errors.push("Number is required.");
    if (row.num) {
      const prior = seenNumbers.get(row.num);
      if (prior !== undefined) {
        errors.push(`Duplicate number (also on row ${prior}).`);
      } else {
        seenNumbers.set(row.num, row.rowIndex);
      }
    }
    for (const [field, max] of Object.entries(MAX_FIELD_LENGTH) as [keyof typeof MAX_FIELD_LENGTH, number][]) {
      if (row[field].length > max) {
        errors.push(`${field === "num" ? "Number" : field[0].toUpperCase() + field.slice(1)} is too long (max ${max}).`);
      }
    }
    const submitted = rosterRowSubmitted(row.jersey, row.short, row.back);
    return {
      ...row,
      errors,
      ok: errors.length === 0,
      submitted,
    };
  });
}

export function previewRosterCsv(text: string) {
  const rows = parseRosterCsv(text);
  const tooManyRows = rows.length > MAX_ROSTER_IMPORT_ROWS;
  const validated = validateRosterCsvRows(rows.slice(0, MAX_ROSTER_IMPORT_ROWS));
  const validRows = validated.filter((row) => row.ok);
  return {
    rows: validated,
    validCount: validRows.length,
    invalidCount: validated.length - validRows.length,
    canSave: validRows.length > 0 && !tooManyRows,
    error: tooManyRows
      ? `Too many rows (${rows.length}). Import up to ${MAX_ROSTER_IMPORT_ROWS} players at a time.`
      : undefined,
  };
}
