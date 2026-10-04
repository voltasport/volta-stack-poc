"use client";

import Link from "next/link";
import {useState} from "react";

const checks = [
  {id: "colors", label: "Colors match our palette"},
  {id: "logo", label: "Logo size & placement"},
  {id: "names", label: "Names & numbers spelled right"},
];

const versions = [
  {id: "v1", label: "v1", date: "Sep 22"},
  {id: "v2", label: "v2", date: "Sep 29"},
  {id: "v3", label: "v3", date: "Today"},
];

export function ProofApproval() {
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [name, setName] = useState("Marli Berg");
  const [signed, setSigned] = useState(false);
  const [changes, setChanges] = useState(false);
  const [face, setFace] = useState<"Front" | "Back">("Front");
  const [version, setVersion] = useState("v3");

  const ready = checks.every((item) => checked[item.id]) && name.trim().length > 1 && version === "v3";

  return (
    <div className="min-h-screen bg-[#0c1b2e] text-white">
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-3 text-xs text-[#c5d2df]">
        <p>
          <span className="font-semibold text-white">Next.js + Vercel.</span> This approval is app
          state. Nothing is written to Shopify.
        </p>
        <a href="https://volta-storefront.vercel.app/portal/approvals/away-kit" className="font-semibold text-[#8ee8b4]">
          Open the Hydrogen proof
        </a>
      </div>
      <header className="flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-3">
          <Link
            href="/programs/womens-soccer?tab=proofs"
            className="grid h-9 w-9 place-items-center rounded-full bg-white/10"
          >
            ←
          </Link>
          <div>
            <p className="text-xs text-[#9eb0c2]">SLCC Women’s Soccer · Fall 2026</p>
            <h1 className="text-2xl font-black tracking-tight">AWAY KIT · V3</h1>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setFace("Front")}
            className={`rounded-full px-4 py-2 text-sm font-semibold ${face === "Front" ? "bg-white text-[#0c1b2e]" : "bg-white/10"}`}
          >
            Front
          </button>
          <button
            type="button"
            onClick={() => setFace("Back")}
            className={`rounded-full px-4 py-2 text-sm font-semibold ${face === "Back" ? "bg-white text-[#0c1b2e]" : "bg-white/10"}`}
          >
            Back
          </button>
        </div>
      </header>

      <div className="grid min-h-[calc(100vh-118px)] grid-cols-[minmax(0,1fr)_380px]">
        <div className="relative m-4 overflow-hidden rounded-3xl border border-white/10 bg-[repeating-linear-gradient(135deg,#13283f_0px,#13283f_12px,#102338_12px,#102338_24px)]">
          <span className="absolute left-[28%] top-[22%] grid h-8 w-8 place-items-center rounded-full bg-[#3dcb7a] text-sm font-bold text-[#0c1726]">
            1
          </span>
          <span className="absolute bottom-[38%] right-[22%] grid h-8 w-8 place-items-center rounded-full bg-[#3dcb7a] text-sm font-bold text-[#0c1726]">
            2
          </span>
          <p className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-sm tracking-wide text-[#9eb0c2]">
            [PROOF ARTWORK — {face.toUpperCase()}]
            {version !== "v3" ? ` · viewing ${version}` : ""}
          </p>
          <div className="absolute bottom-4 left-4 flex gap-2">
            {versions.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setVersion(item.id);
                  setSigned(false);
                }}
                className={`rounded-xl px-3 py-2 text-left ${
                  version === item.id ? "bg-[#123f32] ring-1 ring-[#3dcb7a]" : "bg-[#13283f]"
                }`}
              >
                <span className="block text-xs font-bold">{item.label}</span>
                <span className={`block text-[11px] ${version === item.id ? "text-[#8ee8b4]" : "text-[#9eb0c2]"}`}>
                  {item.date}
                </span>
              </button>
            ))}
          </div>
        </div>

        <aside className="bg-[#f4f1ea] px-5 py-6 text-[#122033]">
          <h2 className="text-sm font-extrabold tracking-[0.08em]">WHAT CHANGED</h2>
          <ol className="mt-3 flex flex-col gap-2">
            <Change n="1" text={'Sleeve stripe moved up 1" per Marli’s note.'} />
            <Change n="2" text={'Number font switched to block, 8" back.'} />
          </ol>

          <h2 className="mt-6 text-sm font-extrabold tracking-[0.08em]">CHECK BEFORE YOU APPROVE</h2>
          <ul className="mt-3 flex flex-col gap-2">
            {checks.map((item) => (
              <li key={item.id}>
                <label className="flex items-center gap-3 text-sm">
                  <input
                    type="checkbox"
                    checked={Boolean(checked[item.id])}
                    onChange={(event) =>
                      setChecked((current) => ({...current, [item.id]: event.target.checked}))
                    }
                    className="h-4 w-4 accent-[#1f8a4d]"
                  />
                  {item.label}
                </label>
              </li>
            ))}
          </ul>

          <label className="mt-5 block text-sm">
            Type your name to sign
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="mt-2 w-full rounded-xl border border-[#e4dfd6] bg-white px-3 py-2"
            />
          </label>

          {signed ? (
            <p className="mt-4 rounded-2xl bg-[#e5f6ea] px-4 py-3 text-sm font-semibold text-[#187243]">
              Signed by {name.trim()} on v3. Melanie gets this in the program thread.
            </p>
          ) : (
            <button
              type="button"
              disabled={!ready}
              onClick={() => {
                setSigned(true);
                setChanges(false);
              }}
              className="mt-4 w-full rounded-full bg-[#e7d7b4] px-4 py-3 text-sm font-semibold text-[#6d5a32] disabled:cursor-not-allowed disabled:opacity-70 enabled:bg-[#122033] enabled:text-white"
            >
              {version === "v3" ? "Check all three & sign" : "Switch to v3 to sign"}
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              setChanges(true);
              setSigned(false);
            }}
            className="mt-2 w-full rounded-full border border-[#d9d3c8] bg-white px-4 py-3 text-sm font-semibold"
          >
            Request changes
          </button>
          {changes ? (
            <p className="mt-3 text-sm text-[#3c4a5c]">
              Change request queued for Melanie. v3 stays unsigned.
            </p>
          ) : null}
        </aside>
      </div>
    </div>
  );
}

function Change({n, text}: {n: string; text: string}) {
  return (
    <li className="flex items-start gap-3 rounded-2xl bg-white px-3 py-3 text-sm">
      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#3dcb7a] text-xs font-bold text-[#0c1726]">
        {n}
      </span>
      {text}
    </li>
  );
}
