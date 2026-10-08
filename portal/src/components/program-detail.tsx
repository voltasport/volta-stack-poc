"use client";

import Link from "next/link";
import {usePathname, useRouter, useSearchParams} from "next/navigation";
import {useEffect, useState} from "react";
import type {Program, TabId} from "@/lib/data";
import {RosterImportPanel} from "@/components/roster-import-panel";
import {SizedItemsEditor} from "@/components/sized-items-editor";
const tabs: {id: TabId; label: string}[] = [
  {id: "items", label: "Items"},
  {id: "sized-items", label: "Sized items"},
  {id: "roster", label: "Roster"},
  {id: "proofs", label: "Proofs"},
  {id: "files", label: "Files"},
];

export function ProgramDetail({
  program,
  initialTab = "items",
  showAdminActions = false,
  canEditRoster = false,
  canEditSizedItems = false,
}: {
  program: Program;
  initialTab?: string;
  showAdminActions?: boolean;
  canEditRoster?: boolean;
  canEditSizedItems?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const start = tabs.some((tab) => tab.id === initialTab) ? (initialTab as TabId) : "items";
  const [tab, setTab] = useState<TabId>(start);

  useEffect(() => {
    const fromUrl = search.get("tab");
    if (fromUrl && tabs.some((item) => item.id === fromUrl)) {
      setTab(fromUrl as TabId);
    }
  }, [search]);
  const doneCount = program.milestones.filter((item) => item.state === "done").length;
  const progress = Math.round((doneCount / program.milestones.length) * 100);

  return (
    <div>
      <Link href="/" className="text-sm font-semibold text-[#1f8a4d]">
        ← All programs
      </Link>
      <p className="mt-3 text-sm text-[#6d7b8a]">{program.eyebrow}</p>
      <div className="mt-1 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <h1 className="text-3xl font-black tracking-[-0.045em] sm:text-5xl">{program.title}</h1>
        <div className="flex flex-wrap items-start gap-2 sm:pt-2">
          {showAdminActions ? (
            <Link
              href="/store"
              className="rounded-full border border-[#e4dfd6] bg-white px-4 py-2 text-sm font-semibold"
            >
              Share status link
            </Link>
          ) : null}
          <a
            href="mailto:hello@voltasport.co"
            className="rounded-full bg-[#122033] px-4 py-2 text-sm font-semibold text-white"
          >
            Message Volta
          </a>
        </div>
      </div>

      <section className="mt-5 rounded-3xl bg-[#0e1c30] px-6 py-5 text-white">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
          <p className="text-2xl font-black tracking-tight">
            <span className="mr-2 text-[#3ee58a]">●</span>
            {program.phase}
          </p>
          <div className="text-right">
            <p className="text-xs text-[#b7c6d4]">{program.deliveryLabel}</p>
            <p className="text-3xl font-black tracking-tight text-[#3ee58a]">{program.deliveryDate}</p>
          </div>
        </div>
        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-[#24384c]">
          <div className="h-full rounded-full bg-[#3cba6f]" style={{width: `${Math.max(progress, 8)}%`}} />
        </div>
        <ol className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-3 lg:grid-cols-6">
          {program.milestones.map((milestone) => (
            <li key={milestone.label}>
              <p className={milestone.state === "next" ? "text-[#8aa0b5]" : "font-semibold text-[#d7f5e4]"}>
                {milestone.label}
              </p>
              <p className="text-[#9eb0c2]">{milestone.date}</p>
            </li>
          ))}
        </ol>
      </section>

      <div className="mt-4 flex max-w-full gap-1 overflow-x-auto rounded-full bg-white p-1">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              setTab(item.id);
              const params = new URLSearchParams(search.toString());
              if (item.id === "items") params.delete("tab");
              else params.set("tab", item.id);
              const query = params.toString();
              router.replace(query ? `${pathname}?${query}` : pathname, {scroll: false});
              requestAnimationFrame(() => window.dispatchEvent(new Event("volta-url-updated")));
            }}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold ${
              tab === item.id ? "bg-[#122033] text-white" : "text-[#3c4a5c]"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div
        className={`mt-4 grid grid-cols-1 gap-4 ${
          tab === "roster" || tab === "sized-items"
            ? ""
            : "xl:grid-cols-[minmax(0,1.6fr)_280px]"
        }`}
      >
        <section className="min-w-0 rounded-3xl bg-white p-5">
          {tab === "items" ? <Items program={program} /> : null}
          {tab === "sized-items" ? (
            <SizedItemsEditor
              programSlug={program.slug}
              items={program.sizedItems ?? []}
              canEdit={canEditSizedItems}
            />
          ) : null}
          {tab === "roster" ? <Roster program={program} canEdit={canEditRoster} /> : null}
          {tab === "proofs" ? <Proofs program={program} /> : null}
          {tab === "files" ? <Files program={program} /> : null}
        </section>
        {tab === "roster" || tab === "sized-items" ? null : (
        <div className="flex flex-col gap-4">
          <section className="rounded-3xl bg-white p-5">
            <h2 className="text-sm font-extrabold tracking-[0.08em]">THIS WEEK</h2>
            <p className="mt-3 text-sm leading-6 text-[#3c4a5c]">
              {program.displayWeekNote ?? program.weekNote}
            </p>
            <p className="mt-4 text-xs text-[#6d7b8a]">{program.weekAuthor}</p>
          </section>
          <section className="rounded-3xl bg-white p-5">
            <h2 className="text-sm font-extrabold tracking-[0.08em]">SHIP TO</h2>
            <ShipTo program={program} />
          </section>
        </div>
        )}
      </div>
    </div>
  );
}

function ShipTo({program}: {program: Program}) {
  const recipient = program.shipTo?.trim() ?? "";
  const note = program.shipNote?.trim() ?? "";
  const hasRecipient = recipient.length > 0 && recipient !== "TBD";
  const hasNote = note.length > 0 && !/address added at kickoff/i.test(note);

  if (!hasRecipient && !hasNote) {
    return <p className="mt-3 text-sm text-[#6d7b8a]">No shipping address yet.</p>;
  }

  return (
    <>
      {hasRecipient ? (
        <p className="mt-3 text-sm font-semibold">{recipient}</p>
      ) : (
        <p className="mt-3 text-sm text-[#6d7b8a]">No shipping address yet.</p>
      )}
      {hasNote ? <p className="mt-2 text-sm text-[#3c4a5c]">{note}</p> : null}
    </>
  );
}

function Items({program}: {program: Program}) {
  if (program.items.length === 0) {
    return <p className="text-sm text-[#6d7b8a]">No items until kickoff.</p>;
  }
  return (
    <div>
      <h2 className="text-sm font-extrabold tracking-[0.08em]">ITEMS</h2>
      <div className="table-scroll mt-3 -mx-5 overflow-x-auto px-5">
      <table className="w-full min-w-[520px] text-left text-sm">
        <thead className="text-xs text-[#7b8794]">
          <tr>
            <th className="pb-2 font-medium">Item</th>
            <th className="pb-2 font-medium">Qty</th>
            <th className="pb-2 font-medium">Proof</th>
            <th className="pb-2 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {program.items.map((item) => (
            <tr key={item.name} className="border-t border-[#f0ece4]">
              <td className="py-3">
                <span className="mr-3 inline-grid h-8 w-8 place-items-center rounded-lg bg-[#f3f0e8] text-[10px] text-[#7b8794]">
                  IMG
                </span>
                {item.name}
              </td>
              <td>{item.qty}</td>
              <td className="font-semibold text-[#1f8a4d]">
                {item.proof} ✓
              </td>
              <td>{item.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}

function Roster({program, canEdit}: {program: Program; canEdit: boolean}) {
  const router = useRouter();
  const sizedItems = program.sizedItems ?? [];
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [num, setNum] = useState("");
  const [name, setName] = useState("");
  const [back, setBack] = useState("");
  const [sizes, setSizes] = useState<Record<number, string>>({});

  async function addPlayer() {
    setPending(true);
    setError(null);
    const res = await fetch(`/api/programs/${program.slug}/roster`, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({num, name, back, sizes}),
    });
    setPending(false);
    if (!res.ok) {
      const payload = await res.json().catch(() => null);
      setError(payload?.error ?? "Could not add player");
      return;
    }
    setNum("");
    setName("");
    setBack("");
    setSizes({});
    setMessage("Player added.");
    router.refresh();
  }

  const missing = program.roster.filter((row) => !row.submitted).length;
  const minTableWidth = 520 + sizedItems.length * 96;
  if (program.roster.length === 0 && !canEdit) {
    return <p className="text-sm text-[#6d7b8a]">Roster opens after kickoff.</p>;
  }
  return (
    <div>
      <h2 className="text-sm font-extrabold tracking-[0.08em]">ROSTER & SIZES</h2>
      <p className="mt-2 text-sm text-[#6d7b8a]">
        {canEdit
          ? "Add players manually or paste CSV. Sizing links can fill jersey sizes later."
          : `Players fill these in from the sizing link. ${missing} still missing.`}
      </p>
      {canEdit ? (
        <div className="mt-4 flex flex-col gap-4">
          <RosterImportPanel programSlug={program.slug} sizedItems={sizedItems} />
          <div className="rounded-2xl bg-[#f7f4ee] p-4">
            <p className="text-xs font-bold tracking-wide text-[#6d7b8a]">ADD ONE PLAYER</p>
            <div className="mt-2 grid grid-cols-2 gap-2 lg:grid-cols-4">
              <input
                value={num}
                onChange={(e) => setNum(e.target.value)}
                placeholder="#"
                className="rounded-xl border px-3 py-2 text-sm"
              />
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Name"
                className="rounded-xl border px-3 py-2 text-sm lg:col-span-2"
              />
              <input
                value={back}
                onChange={(e) => setBack(e.target.value)}
                placeholder="Back name"
                className="rounded-xl border px-3 py-2 text-sm"
              />
              {sizedItems.map((item) => (
                <label key={item.id} className="text-xs font-semibold text-[#6d7b8a]">
                  {item.name}
                  <select
                    value={sizes[item.id] ?? ""}
                    onChange={(event) =>
                      setSizes((current) => ({...current, [item.id]: event.target.value}))
                    }
                    className="mt-1 w-full rounded-xl border px-3 py-2 text-sm font-normal text-[#122033]"
                  >
                    <option value="">—</option>
                    {item.sizeOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
              <button
                type="button"
                disabled={pending}
                onClick={() => void addPlayer()}
                className="rounded-full bg-[#122033] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 lg:col-span-4"
              >
                Add player
              </button>
            </div>
            {message ? <p className="mt-2 text-sm font-semibold text-[#187243]">{message}</p> : null}
            {error ? <p className="mt-2 text-sm font-semibold text-[#9a3b3b]">{error}</p> : null}
          </div>
        </div>
      ) : null}
      {program.roster.length === 0 ? (
        <p className="mt-4 text-sm text-[#6d7b8a]">No players yet.</p>
      ) : null}
      <div className="table-scroll mt-3 w-full overflow-x-auto">
      <table className="w-full text-left text-sm" style={{minWidth: minTableWidth}}>
        <thead className="text-xs text-[#7b8794]">
          <tr>
            <th className="px-2 pb-2 font-medium">#</th>
            <th className="px-2 pb-2 font-medium">Athlete</th>
            <th className="px-2 pb-2 font-medium">Back</th>
            {sizedItems.map((item) => (
              <th key={item.id} className="px-2 pb-2 font-medium whitespace-nowrap">
                {item.name}
              </th>
            ))}
            <th className="px-2 pb-2 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {program.roster.map((row, index) => (
            <tr key={row.id ?? `${row.num}-${index}`} className="border-t border-[#f0ece4]">
              <td className="px-2 py-2.5">{row.num}</td>
              <td className="px-2 whitespace-nowrap">{row.name}</td>
              <td className="px-2 font-semibold tracking-wide whitespace-nowrap">{row.back}</td>
              {sizedItems.map((item) => (
                <td key={item.id} className="px-2 whitespace-nowrap">
                  {row.sizesByItemId?.[item.id] ?? "—"}
                </td>
              ))}
              <td className="px-2">
                <span
                  className={`rounded-full px-2 py-1 text-xs font-semibold whitespace-nowrap ${
                    row.submitted ? "bg-[#e5f6ea] text-[#187243]" : "bg-[#f8efd0] text-[#8a6914]"
                  }`}
                >
                  {row.submitted ? "Sizes complete" : "Missing sizes"}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}

function Proofs({program}: {program: Program}) {
  if (program.proofs.length === 0) {
    return <p className="text-sm text-[#6d7b8a]">No proofs yet.</p>;
  }
  return (
    <div>
      <h2 className="text-sm font-extrabold tracking-[0.08em]">PROOFS</h2>
      <ul className="mt-3">
        {program.proofs.map((proof) => (
          <li key={proof.version} className="flex items-center justify-between border-t border-[#f0ece4] py-3 first:border-t-0">
            <span>
              <span className="font-semibold">{proof.version}</span>
              <span className="ml-2 text-sm text-[#6d7b8a]">
                {proof.date} · {proof.note}
              </span>
            </span>
            {program.slug === "womens-soccer" && proof.current ? (
              <Link href="/approvals/away-kit" className="text-sm font-semibold text-[#1f8a4d]">
                Review & approve
              </Link>
            ) : (
              <span className="text-xs text-[#7b8794]">{proof.current ? "Current" : "Archived"}</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Files({program}: {program: Program}) {
  if (program.files.length === 0) {
    return <p className="text-sm text-[#6d7b8a]">No files yet.</p>;
  }
  return (
    <ul>
      {program.files.map((file) => (
        <li key={file.name} className="flex items-center justify-between border-t border-[#f0ece4] py-3 first:border-t-0">
          <span className="font-semibold">{file.name}</span>
          <span className="text-sm text-[#6d7b8a]">{file.meta}</span>
        </li>
      ))}
    </ul>
  );
}
