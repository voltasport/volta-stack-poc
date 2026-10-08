"use client";

import {useRouter} from "next/navigation";
import {useState} from "react";
import type {KitItem} from "@/lib/data";
import {SIZED_ITEM_PRESETS} from "@/lib/sized-item-presets";

function parseSizes(text: string) {
  return text
    .split(/[,;\n]/)
    .map((value) => value.trim())
    .filter(Boolean);
}

function displayQty(qty: string) {
  const trimmed = qty.trim();
  return !trimmed || /^\[.*\]$/.test(trimmed) ? "—" : trimmed;
}

function hasProof(proof: string) {
  const trimmed = proof.trim();
  return Boolean(trimmed) && trimmed !== "—";
}

async function send(method: "POST" | "PATCH" | "DELETE", programSlug: string, body: unknown) {
  const res = await fetch(`/api/programs/${programSlug}/items`, {
    method,
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify(body),
  });
  if (res.ok) return null;
  const payload = (await res.json().catch(() => null)) as {error?: string} | null;
  return payload?.error ?? "Something went wrong. Try again.";
}

/**
 * The program's kit: one list of items, each optionally carrying size options. Sized items
 * become roster size columns and CSV template columns. Directors and admins edit; others view.
 */
export function KitItemsPanel({
  programSlug,
  items,
  canEdit,
  isAdmin,
}: {
  programSlug: string;
  items: KitItem[];
  canEdit: boolean;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [newName, setNewName] = useState("");
  const [newSizes, setNewSizes] = useState("");

  async function run(action: () => Promise<string | null>, after?: () => void) {
    setPending(true);
    setError(null);
    const failure = await action();
    setPending(false);
    if (failure) {
      setError(failure);
      return;
    }
    after?.();
    router.refresh();
  }

  const sizedCount = items.filter((item) => (item.sizeOptions?.length ?? 0) > 0).length;

  return (
    <div className="min-w-0">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-extrabold tracking-[0.08em]">ITEMS</h2>
        <p className="text-xs text-[#6d7b8a]">
          {sizedCount} sized item{sizedCount === 1 ? "" : "s"} · each becomes a roster size column
        </p>
      </div>
      {error ? (
        <p role="alert" className="mt-3 text-sm font-semibold text-[#9a3b3b]">
          {error}
        </p>
      ) : null}

      {items.length === 0 ? (
        <p className="mt-3 text-sm text-[#6d7b8a]">
          {canEdit ? "No items yet. Add your kit below or start from a preset." : "No items until kickoff."}
        </p>
      ) : (
        <div className="table-scroll mt-3 w-full overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="text-xs text-[#7b8794]">
              <tr>
                <th className="px-2 pb-2 font-medium">Item</th>
                <th className="px-2 pb-2 font-medium">Sizes</th>
                <th className="px-2 pb-2 font-medium">Qty</th>
                <th className="px-2 pb-2 font-medium">Proof</th>
                <th className="px-2 pb-2 font-medium">Status</th>
                {canEdit ? <th className="px-2 pb-2 font-medium sr-only">Actions</th> : null}
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) =>
                canEdit && item.id !== undefined && editingId === item.id ? (
                  <EditRow
                    key={item.id}
                    item={item}
                    pending={pending}
                    canRemove={isAdmin || !hasProof(item.proof)}
                    onCancel={() => setEditingId(null)}
                    onSave={(name, sizes) =>
                      void run(
                        () => send("PATCH", programSlug, {id: item.id, name, sizeOptions: sizes}),
                        () => setEditingId(null),
                      )
                    }
                    onRemove={() => {
                      const ok = window.confirm(
                        `Remove "${item.name}" from this kit?${
                          (item.sizeOptions?.length ?? 0) > 0
                            ? " Roster sizes entered for it will be removed too."
                            : ""
                        }`,
                      );
                      if (!ok) return;
                      void run(
                        () => send("DELETE", programSlug, {id: item.id}),
                        () => setEditingId(null),
                      );
                    }}
                  />
                ) : (
                  <tr key={item.id ?? `${item.name}-${index}`} className="border-t border-[#f0ece4] align-top">
                    <td className="px-2 py-3 font-semibold whitespace-nowrap">{item.name}</td>
                    <td className="px-2 py-3">
                      {(item.sizeOptions?.length ?? 0) > 0 ? (
                        <span className="flex flex-wrap gap-1">
                          {item.sizeOptions!.map((size) => (
                            <span
                              key={size}
                              className="rounded-md bg-[#eef1f4] px-1.5 py-0.5 text-xs font-medium whitespace-nowrap"
                            >
                              {size}
                            </span>
                          ))}
                        </span>
                      ) : (
                        <span className="text-xs text-[#7b8794]">No sizes</span>
                      )}
                    </td>
                    <td className="px-2 py-3">{displayQty(item.qty)}</td>
                    <td className="px-2 py-3 font-semibold text-[#1f8a4d] whitespace-nowrap">
                      {hasProof(item.proof) ? `${item.proof} ✓` : <span className="font-normal text-[#7b8794]">—</span>}
                    </td>
                    <td className="px-2 py-3 whitespace-nowrap">{item.status}</td>
                    {canEdit ? (
                      <td className="px-2 py-3 text-right">
                        {item.id !== undefined ? (
                          <button
                            type="button"
                            disabled={pending}
                            onClick={() => setEditingId(item.id!)}
                            className="rounded-full border px-3 py-1 text-xs font-semibold disabled:opacity-60"
                          >
                            Edit
                          </button>
                        ) : null}
                      </td>
                    ) : null}
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>
      )}

      {canEdit ? (
        <div className="mt-5 rounded-2xl bg-[#f7f4ee] p-4">
          <p className="text-xs font-bold tracking-wide text-[#6d7b8a]">ADD ITEM</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
            <label className="text-xs font-semibold text-[#6d7b8a]">
              Item name <span className="text-[#9a3b3b]">*</span>
              <input
                value={newName}
                onChange={(event) => setNewName(event.target.value)}
                placeholder="Hoodie"
                maxLength={60}
                className="mt-1 w-full rounded-xl border px-3 py-2 text-sm font-normal text-[#122033]"
              />
            </label>
            <label className="text-xs font-semibold text-[#6d7b8a]">
              Sizes (comma separated, leave blank for unsized items like a bag)
              <input
                value={newSizes}
                onChange={(event) => setNewSizes(event.target.value)}
                placeholder="S, M, L, XL"
                className="mt-1 w-full rounded-xl border px-3 py-2 text-sm font-normal text-[#122033]"
              />
            </label>
          </div>
          <button
            type="button"
            disabled={pending || !newName.trim()}
            onClick={() =>
              void run(
                () => send("POST", programSlug, {name: newName, sizeOptions: parseSizes(newSizes)}),
                () => {
                  setNewName("");
                  setNewSizes("");
                },
              )
            }
            className="mt-3 rounded-full bg-[#122033] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            Add item
          </button>
          <p className="mt-4 text-xs font-bold tracking-wide text-[#6d7b8a]">PRESETS</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {SIZED_ITEM_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                disabled={pending}
                onClick={() => void run(() => send("POST", programSlug, {presetId: preset.id}))}
                className="rounded-full border bg-white px-3 py-1.5 text-xs font-semibold disabled:opacity-60"
              >
                + {preset.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function EditRow({
  item,
  pending,
  canRemove,
  onSave,
  onCancel,
  onRemove,
}: {
  item: KitItem;
  pending: boolean;
  canRemove: boolean;
  onSave: (name: string, sizes: string[]) => void;
  onCancel: () => void;
  onRemove: () => void;
}) {
  const [name, setName] = useState(item.name);
  const [sizes, setSizes] = useState((item.sizeOptions ?? []).join(", "));
  return (
    <tr className="border-t border-[#f0ece4] bg-[#fbfaf7]">
      <td className="px-2 py-3" colSpan={6}>
        <div className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)_auto] lg:items-end">
          <label className="text-xs font-semibold text-[#6d7b8a]">
            Item name
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={60}
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm font-semibold text-[#122033]"
            />
          </label>
          <label className="text-xs font-semibold text-[#6d7b8a]">
            Sizes (blank = no sizes)
            <input
              value={sizes}
              onChange={(event) => setSizes(event.target.value)}
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm font-normal text-[#122033]"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={pending || !name.trim()}
              onClick={() => onSave(name, parseSizes(sizes))}
              className="rounded-full bg-[#122033] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
            >
              Save
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={onCancel}
              className="rounded-full border px-3 py-1.5 text-xs font-semibold"
            >
              Cancel
            </button>
            {canRemove ? (
              <button
                type="button"
                disabled={pending}
                onClick={onRemove}
                className="rounded-full border border-[#e8c4c4] px-3 py-1.5 text-xs font-semibold text-[#9a3b3b]"
              >
                Remove
              </button>
            ) : null}
          </div>
        </div>
      </td>
    </tr>
  );
}
