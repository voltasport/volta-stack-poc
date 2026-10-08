"use client";

import {useRouter} from "next/navigation";
import {useEffect, useRef, useState} from "react";

type PreviewRow = {
  rowIndex: number;
  num: string;
  name: string;
  back: string;
  sizes: Record<number, string>;
  invalidSizes?: Record<number, string>;
  errors: string[];
  ok: boolean;
  submitted: boolean;
};

type PreviewResponse = {
  /** Sized item columns for this program, from the server (source of truth). */
  items: {id: number; name: string}[];
  unmatchedColumns?: string[];
  rows: PreviewRow[];
  validCount: number;
  invalidCount: number;
  canSave: boolean;
  error?: string;
};

export function RosterImportPanel({
  programSlug,
  compact = false,
  onSaved,
}: {
  programSlug: string;
  compact?: boolean;
  onSaved?: () => void;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [mode, setMode] = useState<"append" | "replace">("append");
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [template, setTemplate] = useState("");

  // The per-program template is shown as placeholder text only, so sample rows are never saved by accident.
  useEffect(() => {
    let cancelled = false;
    void fetch(`/api/programs/${programSlug}/roster/import`)
      .then((res) => (res.ok ? res.text() : ""))
      .then((body) => {
        if (!cancelled) setTemplate(body.trim());
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [programSlug]);

  async function runPreview(nextText?: string) {
    setPending(true);
    setError(null);
    setMessage(null);
    const payload = nextText ?? text;
    const res = await fetch(`/api/programs/${programSlug}/roster/import`, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({text: payload, action: "preview"}),
    });
    setPending(false);
    const body = (await res.json().catch(() => null)) as PreviewResponse & {error?: string};
    if (!res.ok) {
      setError(body?.error ?? "Could not preview import");
      setPreview(null);
      return;
    }
    setPreview(body);
    if (body.error) setError(body.error);
  }

  async function commitImport() {
    if (!preview?.canSave) {
      setError("Preview and fix errors before saving.");
      return;
    }
    setPending(true);
    setError(null);
    const res = await fetch(`/api/programs/${programSlug}/roster/import`, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({text, mode, action: "commit"}),
    });
    setPending(false);
    const body = (await res.json().catch(() => null)) as {error?: string; count?: number};
    if (!res.ok) {
      setError(body?.error ?? "Could not save roster");
      return;
    }
    setMessage(`Saved ${body.count ?? preview.validCount} players to your roster.`);
    setPreview(null);
    onSaved?.();
    router.refresh();
  }

  async function onFileChange(file: File | null) {
    if (!file) return;
    setFileName(file.name);
    const contents = await file.text();
    setText(contents);
    await runPreview(contents);
  }

  const itemColumns = preview?.items ?? [];

  return (
    <div className={`flex min-w-0 flex-col gap-3 ${compact ? "" : "rounded-2xl bg-[#f7f4ee] p-4"}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-bold tracking-wide text-[#6d7b8a]">IMPORT ROSTER</p>
        {/* Same-origin GET; the route builds the per-program template and sends it as an attachment. */}
        <a
          href={`/api/programs/${programSlug}/roster/import`}
          download
          className="text-xs font-semibold text-[#1f8a4d] underline-offset-2 hover:underline"
        >
          Download CSV template
        </a>
      </div>
      <p className="text-sm text-[#3c4a5c]">
        Upload or paste CSV with name, number, back name, and one column per sized item. Position is
        ignored if present.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv,text/plain"
          className="sr-only"
          onChange={(event) => void onFileChange(event.target.files?.[0] ?? null)}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="rounded-full border border-[#d8d2c8] bg-white px-4 py-2 text-sm font-semibold"
        >
          Choose CSV file
        </button>
        {fileName ? <span className="text-sm text-[#6d7b8a]">{fileName}</span> : null}
      </div>
      <textarea
        value={text}
        onChange={(event) => setText(event.target.value)}
        rows={compact ? 6 : 5}
        aria-label="Roster CSV"
        placeholder={template}
        className="w-full rounded-xl border px-3 py-2 text-sm font-normal"
        spellCheck={false}
      />
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={mode}
          onChange={(event) => setMode(event.target.value as "append" | "replace")}
          className="rounded-lg border px-2 py-1 text-sm"
        >
          <option value="append">Append to roster</option>
          <option value="replace">Replace entire roster</option>
        </select>
        <button
          type="button"
          disabled={pending || !text.trim()}
          onClick={() => void runPreview()}
          className="rounded-full border px-4 py-2 text-sm font-semibold disabled:opacity-60"
        >
          Preview import
        </button>
        <button
          type="button"
          disabled={pending || !preview?.canSave}
          onClick={() => void commitImport()}
          className="rounded-full bg-[#122033] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          Save to roster
        </button>
      </div>

      {preview && preview.rows.length > 0 ? (
        <div className="table-scroll w-full overflow-x-auto rounded-xl border border-[#e8e2d8] bg-white">
          <table className="w-full text-left text-sm" style={{minWidth: 600 + itemColumns.length * 72}}>
            <thead className="text-xs text-[#7b8794]">
              <tr>
                <th className="px-3 pb-2 font-medium">Row</th>
                <th className="px-3 pb-2 font-medium">#</th>
                <th className="px-3 pb-2 font-medium">Name</th>
                <th className="px-3 pb-2 font-medium">Back</th>
                {itemColumns.map((item) => (
                  <th key={item.id} className="px-3 pb-2 font-medium whitespace-nowrap">
                    {item.name}
                  </th>
                ))}
                <th className="px-3 pb-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {preview.rows.map((row) => (
                <tr key={row.rowIndex} className="border-t border-[#e8e2d8]">
                  <td className="px-3 py-2 text-xs text-[#7b8794]">{row.rowIndex}</td>
                  <td className="px-3 py-2">{row.num || "—"}</td>
                  <td className="px-3 py-2">{row.name || "—"}</td>
                  <td className="px-3 py-2">{row.back}</td>
                  {itemColumns.map((item) => (
                    <td key={item.id} className="px-3 py-2 whitespace-nowrap">
                      {row.sizes[item.id] ??
                        (row.invalidSizes?.[item.id] ? (
                          <span className="rounded bg-[#fbe9e9] px-1 font-semibold text-[#9a3b3b]">
                            {row.invalidSizes[item.id]}
                          </span>
                        ) : (
                          "—"
                        ))}
                    </td>
                  ))}
                  <td className="px-3 py-2">
                    {row.ok ? (
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                          row.submitted
                            ? "bg-[#e5f6ea] text-[#187243]"
                            : "bg-[#f8efd0] text-[#8a6914]"
                        }`}
                      >
                        {row.submitted ? "Sizes complete" : "Missing sizes"}
                      </span>
                    ) : (
                      <span className="block w-72 whitespace-normal text-xs font-semibold leading-5 text-[#9a3b3b]">
                        {row.errors.join(" ")}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {preview.unmatchedColumns && preview.unmatchedColumns.length > 0 ? (
            <p className="px-3 pt-2 text-xs font-semibold text-[#8a6914]">
              Ignored columns (not an item on this program): {preview.unmatchedColumns.join(", ")}. Add
              them on the Items tab to import those sizes.
            </p>
          ) : null}
          <p className="px-3 py-2 text-xs text-[#6d7b8a]">
            {preview.validCount} ready to save
            {preview.invalidCount > 0 ? ` · ${preview.invalidCount} with errors (skipped on save)` : ""}
          </p>
        </div>
      ) : null}

      {message ? <p className="text-sm font-semibold text-[#187243]">{message}</p> : null}
      {error ? <p className="text-sm font-semibold text-[#9a3b3b]">{error}</p> : null}
    </div>
  );
}
