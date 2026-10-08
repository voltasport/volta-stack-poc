import {normalizeSizeValue, rosterBackName, rowSizesComplete} from "@/lib/roster-utils";

/** Upper bound on raw CSV text accepted by the import routes (~200 KB). */
export const MAX_ROSTER_CSV_CHARS = 200_000;
/** Upper bound on players per import. */
export const MAX_ROSTER_IMPORT_ROWS = 500;

export const ROSTER_CSV_TOO_LARGE = `CSV is too large. Keep it under ${Math.round(
  MAX_ROSTER_CSV_CHARS / 1000,
)} KB (up to ${MAX_ROSTER_IMPORT_ROWS} players).`;

export function rosterCsvSizeError(text: string) {
  return text.length > MAX_ROSTER_CSV_CHARS ? ROSTER_CSV_TOO_LARGE : null;
}

export type SizedItemForCsv = {id: number; name: string; sizeOptions: string[]};

export type ParsedRosterCsvRow = {
  rowIndex: number;
  num: string;
  name: string;
  pos: string;
  back: string;
  sizes: Record<number, string>;
};

export type ValidatedRosterCsvRow = ParsedRosterCsvRow & {
  errors: string[];
  warnings: string[];
  /** Raw values that don't match the item's sizes (shown in the preview, never saved). */
  invalidSizes: Record<number, string>;
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

function normalizeHeader(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9#]+/g, " ").trim();
}

export function parseRosterCsvForItems(text: string, items: SizedItemForCsv[]): ParsedRosterCsvRow[] {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length === 0) return [];

  let numCol = 1;
  let nameCol = 0;
  let backCol = -1;
  let posCol = -1;
  const itemCols = new Map<number, number>();
  let body = lines;

  const headerParts = splitCsvLine(lines[0]).map((cell) => cell.toLowerCase());
  const itemHeaders = new Set(items.map((item) => normalizeHeader(item.name)));
  const looksLikeHeader = headerParts.some(
    (header) =>
      /^(name|number|num|#|no|back|back_name|position|pos|athlete)$/.test(header) ||
      itemHeaders.has(normalizeHeader(header)),
  );

  if (looksLikeHeader) {
    body = lines.slice(1);
    const nameIdx = headerIndex(headerParts, [/^name$/, /^athlete$/]);
    const numIdx = headerIndex(headerParts, [/^number$/, /^num$/, /^#$/, /^no$/]);
    const backIdx = headerIndex(headerParts, [/^back$/, /^back_name$/, /^name_on_back$/]);
    const posIdx = headerIndex(headerParts, [/^pos$/, /^position$/]);
    if (nameIdx >= 0) nameCol = nameIdx;
    if (numIdx >= 0) numCol = numIdx;
    if (backIdx >= 0) backCol = backIdx;
    if (posIdx >= 0) posCol = posIdx;

    const rawHeaders = splitCsvLine(lines[0]);
    for (const item of items) {
      const target = normalizeHeader(item.name);
      const idx = rawHeaders.findIndex((header) => normalizeHeader(header) === target);
      if (idx >= 0) itemCols.set(item.id, idx);
    }
  } else if (items.length === 2) {
    itemCols.set(items[0]!.id, 2);
    itemCols.set(items[1]!.id, 3);
    backCol = 4;
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

    const posRaw = posCol >= 0 ? cols[posCol] : "";
    const backRaw = backCol >= 0 ? cols[backCol] : "";
    const sizes: Record<number, string> = {};
    for (const [itemId, colIndex] of itemCols) {
      const raw = cols[colIndex] ?? "";
      if (raw.trim()) sizes[itemId] = raw.trim();
    }

    out.push({
      rowIndex: index + (looksLikeHeader ? 2 : 1),
      num: num.trim(),
      name: name.trim(),
      pos: posRaw?.trim() || "—",
      back: backRaw?.trim() || rosterBackName(name),
      sizes,
    });
  }

  return out.slice(0, MAX_ROSTER_IMPORT_ROWS + 1);
}

export function validateRosterCsvRows(
  rows: ParsedRosterCsvRow[],
  items: SizedItemForCsv[],
): ValidatedRosterCsvRow[] {
  const seenNumbers = new Map<string, number>();
  return rows.map((row) => {
    const errors: string[] = [];
    const warnings: string[] = [];
    if (!row.name) errors.push("Name is required.");
    if (!row.num) errors.push("Number is required.");
    if (row.num.length > 8) errors.push("Number is too long (max 8).");
    if (row.name.length > 80) errors.push("Name is too long (max 80).");
    if (row.back.length > 24) errors.push("Back name is too long (max 24).");
    if (row.num) {
      const prior = seenNumbers.get(row.num);
      if (prior !== undefined) errors.push(`Duplicate number (also on row ${prior}).`);
      else seenNumbers.set(row.num, row.rowIndex);
    }

    const canonical: Record<number, string> = {};
    const invalidSizes: Record<number, string> = {};
    for (const item of items) {
      const raw = row.sizes[item.id]?.trim();
      if (!raw) continue;
      const normalized = normalizeSizeValue(raw, item.sizeOptions);
      if (!normalized) {
        errors.push(`Invalid ${item.name} size "${raw.slice(0, 20)}" (use ${item.sizeOptions.join(", ")}).`);
        invalidSizes[item.id] = raw.slice(0, 20);
      } else {
        canonical[item.id] = normalized;
      }
    }

    const submitted = rowSizesComplete(items, canonical);
    return {
      ...row,
      sizes: canonical,
      errors,
      warnings,
      invalidSizes,
      ok: errors.length === 0,
      submitted,
    };
  });
}

export function previewRosterCsvForItems(text: string, items: SizedItemForCsv[]) {
  const rows = parseRosterCsvForItems(text, items);
  const tooManyRows = rows.length > MAX_ROSTER_IMPORT_ROWS;
  const validated = validateRosterCsvRows(rows.slice(0, MAX_ROSTER_IMPORT_ROWS), items);
  const validRows = validated.filter((row) => row.ok);
  return {
    /** Columns the preview table should render, in order. */
    items: items.map((item) => ({id: item.id, name: item.name})),
    rows: validated,
    validCount: validRows.length,
    invalidCount: validated.length - validRows.length,
    canSave: validRows.length > 0 && !tooManyRows,
    error: tooManyRows
      ? `Too many rows (${rows.length}). Import up to ${MAX_ROSTER_IMPORT_ROWS} players at a time.`
      : undefined,
    unmatchedColumns: unmatchedHeaderColumns(text, items),
  };
}

const KNOWN_HEADERS = /^(name|athlete|number|num|#|no|back|back name|name on back|pos|position)$/;

/** Header columns that are neither roster fields nor a sized item (their values are ignored). */
function unmatchedHeaderColumns(text: string, items: SizedItemForCsv[]) {
  const firstLine = text.split(/\r?\n/).find((line) => line.trim());
  if (!firstLine) return [];
  const headers = splitCsvLine(firstLine).filter(Boolean);
  const itemHeaders = new Set(items.map((item) => normalizeHeader(item.name)));
  const isHeaderRow = headers.some(
    (header) => KNOWN_HEADERS.test(normalizeHeader(header)) || itemHeaders.has(normalizeHeader(header)),
  );
  if (!isHeaderRow) return [];
  return headers
    .filter((header) => !KNOWN_HEADERS.test(normalizeHeader(header)) && !itemHeaders.has(normalizeHeader(header)))
    .slice(0, 10);
}
