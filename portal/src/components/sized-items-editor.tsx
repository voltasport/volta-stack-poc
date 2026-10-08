"use client";

import {useRouter} from "next/navigation";
import {useState} from "react";
import type {ProgramSizedItem} from "@/lib/data";
import {SIZED_ITEM_PRESETS} from "@/lib/sized-item-presets";

export function SizedItemsEditor({
  programSlug,
  items,
  canEdit,
}: {
  programSlug: string;
  items: ProgramSizedItem[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [newName, setNewName] = useState("");
  const [newOptions, setNewOptions] = useState("S,M,L,XL");

  async function addItem() {
    setPending(true);
    setError(null);
    const res = await fetch(`/api/programs/${programSlug}/sized-items`, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({
        name: newName,
        sizeOptions: newOptions.split(/[,;\n]/).map((value) => value.trim()).filter(Boolean),
      }),
    });
    setPending(false);
    const payload = await res.json().catch(() => null);
    if (!res.ok) {
      setError(payload?.error ?? "Could not add item");
      return;
    }
    setNewName("");
    router.refresh();
  }

  async function applyPreset(presetId: string) {
    setPending(true);
    setError(null);
    for (const presetItem of SIZED_ITEM_PRESETS.find((p) => p.id === presetId)?.items ?? []) {
      await fetch(`/api/programs/${programSlug}/sized-items`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({name: presetItem.name, sizeOptions: presetItem.sizeOptions}),
      });
    }
    setPending(false);
    router.refresh();
  }

  async function saveItem(item: ProgramSizedItem, name: string, optionsText: string) {
    setPending(true);
    setError(null);
    const res = await fetch(`/api/programs/${programSlug}/sized-items`, {
      method: "PATCH",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({
        id: item.id,
        name,
        sizeOptions: optionsText.split(/[,;\n]/).map((value) => value.trim()).filter(Boolean),
      }),
    });
    setPending(false);
    if (!res.ok) {
      const payload = await res.json().catch(() => null);
      setError(payload?.error ?? "Could not save item");
      return;
    }
    router.refresh();
  }

  async function removeItem(item: ProgramSizedItem, filled: boolean) {
    if (filled) {
      const ok = window.confirm(
        `Remove "${item.name}"? Existing roster sizes for this item will be deleted.`,
      );
      if (!ok) return;
    }
    setPending(true);
    const res = await fetch(`/api/programs/${programSlug}/sized-items`, {
      method: "DELETE",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({id: item.id}),
    });
    setPending(false);
    if (!res.ok) {
      const payload = await res.json().catch(() => null);
      setError(payload?.error ?? "Could not remove item");
      return;
    }
    router.refresh();
  }

  return (
    <div className="min-w-0">
      <h2 className="text-sm font-extrabold tracking-[0.08em]">SIZED ITEMS</h2>
      <p className="mt-2 max-w-2xl text-sm text-[#6d7b8a]">
        Define every kit piece that needs a size on the roster — jersey, shorts, hoodie, hat, socks,
        and more. Managers fill sizes; only directors and admins edit this list.
      </p>
      {error ? <p className="mt-3 text-sm font-semibold text-[#9a3b3b]">{error}</p> : null}

      <ul className="mt-4 flex flex-col gap-3">
        {items.map((item) => (
          <SizedItemRow
            key={item.id}
            item={item}
            canEdit={canEdit}
            pending={pending}
            onSave={saveItem}
            onRemove={removeItem}
          />
        ))}
      </ul>

      {canEdit ? (
        <div className="mt-6 rounded-2xl bg-[#f7f4ee] p-4">
          <p className="text-xs font-bold tracking-wide text-[#6d7b8a]">ADD ITEM</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <input
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              placeholder="Hoodie"
              className="rounded-xl border px-3 py-2 text-sm"
            />
            <input
              value={newOptions}
              onChange={(event) => setNewOptions(event.target.value)}
              placeholder="S,M,L,XL"
              className="rounded-xl border px-3 py-2 text-sm"
            />
          </div>
          <button
            type="button"
            disabled={pending || !newName.trim()}
            onClick={() => void addItem()}
            className="mt-3 rounded-full bg-[#122033] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            Add sized item
          </button>
          <p className="mt-4 text-xs font-bold tracking-wide text-[#6d7b8a]">PRESETS</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {SIZED_ITEM_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                disabled={pending}
                onClick={() => void applyPreset(preset.id)}
                className="rounded-full border px-3 py-1.5 text-xs font-semibold disabled:opacity-60"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SizedItemRow({
  item,
  canEdit,
  pending,
  onSave,
  onRemove,
}: {
  item: ProgramSizedItem;
  canEdit: boolean;
  pending: boolean;
  onSave: (item: ProgramSizedItem, name: string, optionsText: string) => void;
  onRemove: (item: ProgramSizedItem, filled: boolean) => void;
}) {
  const [name, setName] = useState(item.name);
  const [options, setOptions] = useState(item.sizeOptions.join(", "));

  return (
    <li className="rounded-2xl border border-[#ece6dc] px-4 py-3">
      {canEdit ? (
        <div className="grid gap-2 lg:grid-cols-[160px_minmax(0,1fr)_auto] lg:items-center">
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="rounded-xl border px-3 py-2 text-sm font-semibold"
          />
          <input
            value={options}
            onChange={(event) => setOptions(event.target.value)}
            className="rounded-xl border px-3 py-2 text-sm"
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() => onSave(item, name, options)}
              className="rounded-full border px-3 py-1.5 text-xs font-semibold"
            >
              Save
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => onRemove(item, false)}
              className="rounded-full border border-[#e8c4c4] px-3 py-1.5 text-xs font-semibold text-[#9a3b3b]"
            >
              Remove
            </button>
          </div>
        </div>
      ) : (
        <div>
          <p className="font-semibold">{item.name}</p>
          <p className="mt-1 text-sm text-[#6d7b8a]">{item.sizeOptions.join(" · ")}</p>
        </div>
      )}
    </li>
  );
}
