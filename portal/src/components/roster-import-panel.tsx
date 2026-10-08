"use client";

import {useRouter} from "next/navigation";
import {useRef, useState} from "react";
import {ROSTER_CSV_TEMPLATE} from "@/lib/roster-csv-template";

type PreviewRow = {
  rowIndex: number;
  num: string;
  name: string;
  jersey: string;
  short: string;
  back: string;
  errors: string[];
  ok: boolean;
  submitted: boolean;
};

type PreviewResponse = {
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
  const [mode, setMode] = useState<"append" | "replace">("append");
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  function downloadTemplate() {
    const blob = new Blob([ROSTER_CSV_TEMPLATE], {type: "text/csv;charset=utf-8"});
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "roster-template.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  }

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
    const contents = await file.text();
    setText(contents);
    await runPreview(contents);
  }

  return (
    <div className={`flex flex-col gap-3 ${compact ? "" : "rounded-2xl bg-[#f7f4ee] p-4"}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-bold tracking-wide text-[#6d7b8a]">IMPORT ROSTER</p>
        <button
          type="button"
          onClick={downloadTemplate}
          className="text-xs font-semibold text-[#1f8a4d] underline-offset-2 hover:underline"
        >
          Download CSV template
        </button>
      </div>
      <p className="text-sm text-[#3c4a5c]">
        Upload or paste CSV with name, number, and size columns. Position is optional if included.
      </p>
      <input
        ref={fileRef}
        type="file"
        accept=".csv,text/csv,text/plain"
        className="text-sm"
        onChange={(event) => void onFileChange(event.target.files?.[0] ?? null)}
      />
      <textarea
        value={text}
        onChange={(event) => setText(event.target.value)}
        rows={compact ? 6 : 5}
        placeholder={ROSTER_CSV_TEMPLATE}
        aria-label="Roster CSV"
        className="w-full rounded-xl border px-3 py-2 text-sm font-normal"
        spellCheck={false}
      />
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2 text-sm">
          <select
            value={mode}
            onChange={(event) => setMode(event.target.value as "append" | "replace")}
            className="rounded-lg border px-2 py-1 text-sm"
          >
            <option value="append">Append to roster</option>
            <option value="replace">Replace entire roster</option>
          </select>
        </label>
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
        <div className="table-scroll -mx-1 overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead className="text-xs text-[#7b8794]">
              <tr>
                <th className="pb-2 pr-2 font-medium">Row</th>
                <th className="pb-2 pr-2 font-medium">#</th>
                <th className="pb-2 pr-2 font-medium">Name</th>
                <th className="pb-2 pr-2 font-medium">Jersey</th>
                <th className="pb-2 pr-2 font-medium">Short</th>
                <th className="pb-2 pr-2 font-medium">Back</th>
                <th className="pb-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {preview.rows.map((row) => (
                <tr key={row.rowIndex} className="border-t border-[#e8e2d8]">
                  <td className="py-2 pr-2 text-xs text-[#7b8794]">{row.rowIndex}</td>
                  <td className="py-2 pr-2">{row.num || "—"}</td>
                  <td className="py-2 pr-2">{row.name || "—"}</td>
                  <td className="py-2 pr-2">{row.jersey}</td>
                  <td className="py-2 pr-2">{row.short}</td>
                  <td className="py-2 pr-2">{row.back}</td>
                  <td className="py-2">
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
                      <span className="text-xs font-semibold text-[#9a3b3b]">{row.errors.join(" ")}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-xs text-[#6d7b8a]">
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
