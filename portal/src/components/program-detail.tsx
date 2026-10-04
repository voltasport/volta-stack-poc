"use client";

import Link from "next/link";
import {useState} from "react";
import type {Program, TabId} from "@/lib/data";

const tabs: {id: TabId; label: string}[] = [
  {id: "items", label: "Items"},
  {id: "roster", label: "Roster"},
  {id: "proofs", label: "Proofs"},
  {id: "files", label: "Files"},
];

export function ProgramDetail({
  program,
  initialTab = "items",
}: {
  program: Program;
  initialTab?: string;
}) {
  const start = tabs.some((tab) => tab.id === initialTab) ? (initialTab as TabId) : "items";
  const [tab, setTab] = useState<TabId>(start);
  const doneCount = program.milestones.filter((item) => item.state === "done").length;
  const progress = Math.round((doneCount / program.milestones.length) * 100);

  return (
    <div>
      <Link href="/" className="text-sm font-semibold text-[#1f8a4d]">
        ← All programs
      </Link>
      <p className="mt-3 text-sm text-[#6d7b8a]">{program.eyebrow}</p>
      <div className="mt-1 flex items-start justify-between gap-4">
        <h1 className="text-5xl font-black tracking-[-0.045em]">{program.title}</h1>
        <div className="flex gap-2 pt-2">
          <Link
            href="/store"
            className="rounded-full border border-[#e4dfd6] bg-white px-4 py-2 text-sm font-semibold"
          >
            Share status link
          </Link>
          <a
            href="https://volta-storefront.vercel.app/portal"
            className="rounded-full bg-[#122033] px-4 py-2 text-sm font-semibold text-white"
          >
            Message Volta
          </a>
        </div>
      </div>

      <section className="mt-5 rounded-3xl bg-[#0e1c30] px-6 py-5 text-white">
        <div className="flex items-start justify-between gap-6">
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
        <ol className="mt-3 grid grid-cols-6 gap-2 text-xs">
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

      <div className="mt-4 flex w-fit gap-1 rounded-full bg-white p-1">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold ${
              tab === item.id ? "bg-[#122033] text-white" : "text-[#3c4a5c]"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-[minmax(0,1.6fr)_280px] gap-4">
        <section className="rounded-3xl bg-white p-5">
          {tab === "items" ? <Items program={program} /> : null}
          {tab === "roster" ? <Roster program={program} /> : null}
          {tab === "proofs" ? <Proofs program={program} /> : null}
          {tab === "files" ? <Files program={program} /> : null}
        </section>
        <div className="flex flex-col gap-4">
          <section className="rounded-3xl bg-white p-5">
            <h2 className="text-sm font-extrabold tracking-[0.08em]">THIS WEEK</h2>
            <p className="mt-3 text-sm leading-6 text-[#3c4a5c]">{program.weekNote}</p>
            <p className="mt-4 text-xs text-[#6d7b8a]">{program.weekAuthor}</p>
          </section>
          <section className="rounded-3xl bg-white p-5">
            <h2 className="text-sm font-extrabold tracking-[0.08em]">SHIP TO</h2>
            <p className="mt-3 text-sm font-semibold">{program.shipTo}</p>
            <p className="text-sm text-[#6d7b8a]">[Address]</p>
            <p className="mt-2 text-sm text-[#3c4a5c]">{program.shipNote}</p>
          </section>
        </div>
      </div>
    </div>
  );
}

function Items({program}: {program: Program}) {
  if (program.items.length === 0) {
    return <p className="text-sm text-[#6d7b8a]">No items until kickoff.</p>;
  }
  return (
    <div>
      <h2 className="text-sm font-extrabold tracking-[0.08em]">ITEMS</h2>
      <table className="mt-3 w-full text-left text-sm">
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
  );
}

function Roster({program}: {program: Program}) {
  const missing = program.roster.filter((row) => !row.submitted).length;
  if (program.roster.length === 0) {
    return <p className="text-sm text-[#6d7b8a]">Roster opens after kickoff.</p>;
  }
  return (
    <div>
      <h2 className="text-sm font-extrabold tracking-[0.08em]">ROSTER & SIZES</h2>
      <p className="mt-2 text-sm text-[#6d7b8a]">
        Players fill these in from the sizing link. {missing} still missing.
      </p>
      <table className="mt-3 w-full text-left text-sm">
        <thead className="text-xs text-[#7b8794]">
          <tr>
            <th className="pb-2 font-medium">#</th>
            <th className="pb-2 font-medium">Athlete</th>
            <th className="pb-2 font-medium">Pos</th>
            <th className="pb-2 font-medium">Jersey</th>
            <th className="pb-2 font-medium">Short</th>
            <th className="pb-2 font-medium">Name</th>
            <th className="pb-2 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {program.roster.map((row) => (
            <tr key={row.num} className="border-t border-[#f0ece4]">
              <td className="py-2.5">{row.num}</td>
              <td>{row.name}</td>
              <td>{row.pos}</td>
              <td>{row.jersey}</td>
              <td>{row.short}</td>
              <td className="font-semibold tracking-wide">{row.back}</td>
              <td>
                <span
                  className={`rounded-full px-2 py-1 text-xs font-semibold ${
                    row.submitted ? "bg-[#e5f6ea] text-[#187243]" : "bg-[#f8efd0] text-[#8a6914]"
                  }`}
                >
                  {row.submitted ? "Submitted" : "Missing"}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
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
