import {ROSTER_CSV_TEMPLATE} from "@/lib/roster-csv-template";
import {rosterBackName, rosterRowSubmitted} from "@/lib/roster-utils";

export {ROSTER_CSV_TEMPLATE};

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

  return out.slice(0, 500);
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
  const validated = validateRosterCsvRows(rows);
  const validRows = validated.filter((row) => row.ok);
  return {
    rows: validated,
    validCount: validRows.length,
    invalidCount: validated.length - validRows.length,
    canSave: validRows.length > 0,
  };
}
