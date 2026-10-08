"use client";

import Link from "next/link";
import {useRouter} from "next/navigation";
import {useState} from "react";
import {NewProgramButton} from "@/components/new-program-button";
import {RosterImportPanel} from "@/components/roster-import-panel";

export function OnboardingChecklist({
  firstName,
  hasProgram,
  hasRoster,
  programSlug,
  inviteColumnsReady,
  defaultOrganizationName,
}: {
  firstName: string;
  hasProgram: boolean;
  hasRoster: boolean;
  programSlug: string | null;
  inviteColumnsReady: boolean;
  defaultOrganizationName: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function dismiss() {
    setPending(true);
    setError(null);
    const res = await fetch("/api/onboarding/dismiss", {method: "POST"});
    setPending(false);
    if (!res.ok) {
      const payload = await res.json().catch(() => null);
      setError(payload?.error ?? "Could not dismiss checklist");
      return;
    }
    router.refresh();
  }

  return (
    <div className="max-w-2xl">
      <p className="text-sm text-[#6d7b8a]">Getting started</p>
      <h1 className="mt-1 text-3xl font-black tracking-[-0.04em] sm:text-4xl">Welcome, {firstName}</h1>
      <p className="mt-3 max-w-xl text-sm leading-6 text-[#3c4a5c]">
        Directors and managers build programs and rosters here — no waiting on a rep for the basics.
      </p>
      {!inviteColumnsReady ? (
        <p className="mt-4 rounded-2xl bg-[#f8efd0] px-4 py-3 text-sm text-[#6d5a14]">
          Invite tracking is not enabled on this environment yet. Your admin should run{" "}
          <code className="text-xs">npm run db:migrate</code> (migration 003) when ready.
        </p>
      ) : null}
      {error ? <p className="mt-4 text-sm font-semibold text-[#9a3b3b]">{error}</p> : null}

      <ol className="mt-6 flex flex-col gap-3">
        <li className="rounded-3xl bg-white px-5 py-4">
          <div className="flex items-start gap-3">
            <span
              className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-bold ${
                hasProgram ? "bg-[#3dcb7a] text-[#0c1726]" : "bg-[#eef1f4] text-[#3c4a5c]"
              }`}
            >
              {hasProgram ? "✓" : "1"}
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold">Create your first program</p>
              <p className="mt-1 text-sm text-[#3c4a5c]">
                Name, sport, level or season, and optional roster size. It appears under Programs and
                Rosters immediately.
              </p>
              {!hasProgram ? (
                <div className="mt-3">
                  <NewProgramButton defaultOrganizationName={defaultOrganizationName} />
                </div>
              ) : (
                <Link href="/programs" className="mt-3 inline-block text-sm font-semibold text-[#1f8a4d]">
                  View programs →
                </Link>
              )}
            </div>
          </div>
        </li>

        <li className="rounded-3xl bg-white px-5 py-4">
          <div className="flex items-start gap-3">
            <span
              className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-bold ${
                hasRoster ? "bg-[#3dcb7a] text-[#0c1726]" : "bg-[#eef1f4] text-[#3c4a5c]"
              }`}
            >
              {hasRoster ? "✓" : "2"}
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold">Add your roster</p>
              <p className="mt-1 text-sm text-[#3c4a5c]">
                Import a CSV with names, numbers, and sizes — or add one player on the roster tab.
              </p>
              {hasProgram && programSlug && !hasRoster ? (
                <div className="mt-3 flex flex-col gap-3">
                  <RosterImportPanel programSlug={programSlug} compact />
                  <Link
                    href={`/programs/${programSlug}?tab=roster`}
                    className="inline-flex w-fit rounded-full border px-4 py-2 text-sm font-semibold"
                  >
                    Add one player
                  </Link>
                </div>
              ) : null}
              {hasRoster && programSlug ? (
                <Link
                  href={`/programs/${programSlug}?tab=roster`}
                  className="mt-3 inline-block text-sm font-semibold text-[#1f8a4d]"
                >
                  Edit roster →
                </Link>
              ) : null}
            </div>
          </div>
        </li>
      </ol>

      {hasProgram && hasRoster ? (
        <button
          type="button"
          disabled={pending}
          onClick={() => void dismiss()}
          className="mt-6 text-sm font-semibold text-[#5f6e7d] underline-offset-2 hover:underline"
        >
          Dismiss checklist
        </button>
      ) : null}
    </div>
  );
}
