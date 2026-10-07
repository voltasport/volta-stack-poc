"use client";

import {useRouter} from "next/navigation";
import {useMemo, useState} from "react";

type RequestSummary = {type: string; status: string};

const steps = [
  {key: "school", title: "Add your school name and logo", type: "school"},
  {key: "program", title: "Request your first program", type: "program"},
  {key: "roster", title: "Upload a roster", type: "roster"},
  {key: "store", title: "Request your team store", type: "store"},
] as const;

export function OnboardingChecklist({
  firstName,
  requestsReady,
  requests,
}: {
  firstName: string;
  requestsReady: boolean;
  requests: RequestSummary[];
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<(typeof steps)[number]["key"]>("school");
  const [pending, setPending] = useState(false);

  const doneTypes = useMemo(
    () => new Set(requests.filter((r) => r.status === "pending" || r.status === "done").map((r) => r.type)),
    [requests],
  );

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
        Complete these steps so your Volta rep can stand up programs, rosters, and your team store.
        You can submit requests now — we&apos;ll follow up on each one.
      </p>
      {!requestsReady ? (
        <p className="mt-4 rounded-2xl bg-[#f8efd0] px-4 py-3 text-sm text-[#6d5a14]">
          Request tracking is not enabled on this environment yet. Your admin should run{" "}
          <code className="text-xs">npm run db:migrate</code> (migration 003).
        </p>
      ) : null}
      {message ? <p className="mt-4 text-sm font-semibold text-[#187243]">{message}</p> : null}
      {error ? <p className="mt-4 text-sm font-semibold text-[#9a3b3b]">{error}</p> : null}

      <ol className="mt-6 flex flex-col gap-3">
        {steps.map((step, index) => {
          const done = doneTypes.has(step.type);
          const isOpen = open === step.key;
          return (
            <li key={step.key} className="overflow-hidden rounded-3xl bg-white">
              <button
                type="button"
                className="flex w-full items-center gap-3 px-5 py-4 text-left"
                onClick={() => setOpen(step.key)}
              >
                <span
                  className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-bold ${
                    done ? "bg-[#3dcb7a] text-[#0c1726]" : "bg-[#eef1f4] text-[#3c4a5c]"
                  }`}
                >
                  {done ? "✓" : index + 1}
                </span>
                <span className="font-semibold">{step.title}</span>
              </button>
              {isOpen ? (
                <div className="border-t border-[#f0ece4] px-5 py-4">
                  {step.key === "school" ? (
                    <SchoolStep
                      disabled={!requestsReady || pending}
                      onDone={(text) => {
                        setMessage(text);
                        setError(null);
                        router.refresh();
                      }}
                      onError={setError}
                      setPending={setPending}
                    />
                  ) : null}
                  {step.key === "program" ? (
                    <ProgramStep
                      disabled={!requestsReady || pending}
                      onDone={(text) => {
                        setMessage(text);
                        setError(null);
                        router.refresh();
                      }}
                      onError={setError}
                      setPending={setPending}
                    />
                  ) : null}
                  {step.key === "roster" ? (
                    <RosterStep
                      disabled={!requestsReady || pending}
                      onDone={(text) => {
                        setMessage(text);
                        setError(null);
                        router.refresh();
                      }}
                      onError={setError}
                      setPending={setPending}
                    />
                  ) : null}
                  {step.key === "store" ? (
                    <StoreStep
                      disabled={!requestsReady || pending}
                      onDone={(text) => {
                        setMessage(text);
                        setError(null);
                        router.refresh();
                      }}
                      onError={setError}
                      setPending={setPending}
                    />
                  ) : null}
                </div>
              ) : null}
            </li>
          );
        })}
      </ol>

      <button
        type="button"
        disabled={pending}
        onClick={dismiss}
        className="mt-6 text-sm font-semibold text-[#5f6e7d] underline-offset-2 hover:underline disabled:opacity-50"
      >
        Dismiss checklist
      </button>
    </div>
  );
}

function SchoolStep({
  disabled,
  onDone,
  onError,
  setPending,
}: {
  disabled: boolean;
  onDone: (msg: string) => void;
  onError: (msg: string) => void;
  setPending: (v: boolean) => void;
}) {
  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={async (event) => {
        event.preventDefault();
        onError("");
        setPending(true);
        const data = new FormData(event.currentTarget);
        const res = await fetch("/api/onboarding/school", {method: "POST", body: data});
        setPending(false);
        const payload = await res.json().catch(() => null);
        if (!res.ok) {
          onError(payload?.error ?? "Could not submit");
          return;
        }
        onDone("School request submitted.");
        event.currentTarget.reset();
      }}
    >
      <label className="text-sm font-semibold">
        School or organization name
        <input
          name="schoolName"
          required
          disabled={disabled}
          className="mt-1 w-full rounded-xl border px-3 py-2 font-normal"
          placeholder="e.g. And Collar Academy"
        />
      </label>
      <label className="text-sm font-semibold">
        Logo (optional)
        <input name="logo" type="file" accept="image/png,image/jpeg,image/webp" disabled={disabled} className="mt-1 block w-full text-sm" />
      </label>
      <button
        type="submit"
        disabled={disabled}
        className="self-start rounded-full bg-[#122033] px-4 py-2 text-sm font-semibold text-white disabled:bg-[#c5ced6]"
      >
        Submit school request
      </button>
    </form>
  );
}

function ProgramStep({
  disabled,
  onDone,
  onError,
  setPending,
}: {
  disabled: boolean;
  onDone: (msg: string) => void;
  onError: (msg: string) => void;
  setPending: (v: boolean) => void;
}) {
  return (
    <form
      className="grid gap-3 sm:grid-cols-2"
      onSubmit={async (event) => {
        event.preventDefault();
        onError("");
        setPending(true);
        const data = new FormData(event.currentTarget);
        const res = await fetch("/api/onboarding/program", {
          method: "POST",
          headers: {"Content-Type": "application/json"},
          body: JSON.stringify({
            sport: data.get("sport"),
            level: data.get("level"),
            season: data.get("season"),
            rosterSize: data.get("rosterSize"),
          }),
        });
        setPending(false);
        const payload = await res.json().catch(() => null);
        if (!res.ok) {
          onError(payload?.error ?? "Could not submit");
          return;
        }
        onDone("Program request submitted.");
        event.currentTarget.reset();
      }}
    >
      <label className="text-sm font-semibold sm:col-span-2">
        Sport
        <input name="sport" required disabled={disabled} className="mt-1 w-full rounded-xl border px-3 py-2 font-normal" />
      </label>
      <label className="text-sm font-semibold">
        Level
        <input name="level" required disabled={disabled} placeholder="Varsity" className="mt-1 w-full rounded-xl border px-3 py-2 font-normal" />
      </label>
      <label className="text-sm font-semibold">
        Season
        <input name="season" required disabled={disabled} placeholder="Fall 2026" className="mt-1 w-full rounded-xl border px-3 py-2 font-normal" />
      </label>
      <label className="text-sm font-semibold sm:col-span-2">
        Expected roster size (optional)
        <input name="rosterSize" disabled={disabled} className="mt-1 w-full rounded-xl border px-3 py-2 font-normal" />
      </label>
      <button
        type="submit"
        disabled={disabled}
        className="sm:col-span-2 self-start rounded-full bg-[#122033] px-4 py-2 text-sm font-semibold text-white disabled:bg-[#c5ced6]"
      >
        Submit program request
      </button>
    </form>
  );
}

function RosterStep({
  disabled,
  onDone,
  onError,
  setPending,
}: {
  disabled: boolean;
  onDone: (msg: string) => void;
  onError: (msg: string) => void;
  setPending: (v: boolean) => void;
}) {
  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={async (event) => {
        event.preventDefault();
        onError("");
        setPending(true);
        const data = new FormData(event.currentTarget);
        const res = await fetch("/api/onboarding/roster", {method: "POST", body: data});
        setPending(false);
        const payload = await res.json().catch(() => null);
        if (!res.ok) {
          onError(payload?.error ?? "Could not submit");
          return;
        }
        onDone("Roster submitted.");
        event.currentTarget.reset();
      }}
    >
      <label className="text-sm font-semibold">
        Paste roster (CSV or plain text)
        <textarea
          name="paste"
          rows={4}
          disabled={disabled}
          className="mt-1 w-full rounded-xl border px-3 py-2 font-normal"
          placeholder="Name, size, number…"
        />
      </label>
      <label className="text-sm font-semibold">
        Or upload CSV
        <input name="file" type="file" accept=".csv,text/csv,text/plain" disabled={disabled} className="mt-1 block w-full text-sm" />
      </label>
      <button
        type="submit"
        disabled={disabled}
        className="self-start rounded-full bg-[#122033] px-4 py-2 text-sm font-semibold text-white disabled:bg-[#c5ced6]"
      >
        Submit roster
      </button>
    </form>
  );
}

function StoreStep({
  disabled,
  onDone,
  onError,
  setPending,
}: {
  disabled: boolean;
  onDone: (msg: string) => void;
  onError: (msg: string) => void;
  setPending: (v: boolean) => void;
}) {
  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={async (event) => {
        event.preventDefault();
        onError("");
        setPending(true);
        const data = new FormData(event.currentTarget);
        const res = await fetch("/api/onboarding/store", {
          method: "POST",
          headers: {"Content-Type": "application/json"},
          body: JSON.stringify({
            notes: data.get("notes"),
            targetDate: data.get("targetDate"),
          }),
        });
        setPending(false);
        const payload = await res.json().catch(() => null);
        if (!res.ok) {
          onError(payload?.error ?? "Could not submit");
          return;
        }
        onDone("Team store request submitted.");
        event.currentTarget.reset();
      }}
    >
      <label className="text-sm font-semibold">
        What do you need for your team store?
        <textarea
          name="notes"
          required
          rows={3}
          disabled={disabled}
          className="mt-1 w-full rounded-xl border px-3 py-2 font-normal"
          placeholder="Sports, products, launch timing…"
        />
      </label>
      <label className="text-sm font-semibold">
        Target launch (optional)
        <input name="targetDate" disabled={disabled} placeholder="e.g. August 2026" className="mt-1 w-full rounded-xl border px-3 py-2 font-normal" />
      </label>
      <button
        type="submit"
        disabled={disabled}
        className="self-start rounded-full bg-[#122033] px-4 py-2 text-sm font-semibold text-white disabled:bg-[#c5ced6]"
      >
        Submit store request
      </button>
    </form>
  );
}
