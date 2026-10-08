"use client";

import {useRouter} from "next/navigation";
import {useState} from "react";

export function NewProgramButton({
  className = "",
  defaultOrganizationName = "My organization",
}: {
  className?: string;
  defaultOrganizationName?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(form: HTMLFormElement) {
    setPending(true);
    setError(null);
    const data = new FormData(form);
    const res = await fetch("/api/programs", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({
        name: data.get("name"),
        sport: data.get("sport"),
        levelOrSeason: data.get("levelOrSeason"),
        rosterSize: data.get("rosterSize"),
        organizationName: data.get("organizationName"),
      }),
    });
    setPending(false);
    const payload = await res.json().catch(() => null);
    if (!res.ok) {
      setError(payload?.error ?? "Could not create program");
      return;
    }
    setOpen(false);
    router.push(`/programs/${payload.slug}`);
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        className={`rounded-full bg-[#122033] px-4 py-2 text-sm font-semibold text-white ${className}`}
        onClick={() => setOpen(true)}
      >
        + New program
      </button>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-6 shadow-xl">
            <h2 className="text-xl font-black tracking-tight">New program</h2>
            <p className="mt-1 text-sm text-[#3c4a5c]">
              Creates a real program in the portal and assigns it to you.
            </p>
            <form
              className="mt-4 flex flex-col gap-3"
              onSubmit={(event) => {
                event.preventDefault();
                void submit(event.currentTarget);
              }}
            >
              <label className="text-sm font-semibold">
                Organization or school name
                <input
                  name="organizationName"
                  required
                  defaultValue={defaultOrganizationName}
                  className="mt-1 w-full rounded-xl border px-3 py-2 font-normal"
                  placeholder="And Collar"
                />
              </label>
              <label className="text-sm font-semibold">
                Program name
                <input
                  name="name"
                  required
                  className="mt-1 w-full rounded-xl border px-3 py-2 font-normal"
                  placeholder="Varsity Soccer"
                />
              </label>
              <label className="text-sm font-semibold">
                Sport <span className="text-[#9a3b3b]">*</span>
                <input
                  name="sport"
                  required
                  defaultValue="Soccer"
                  className="mt-1 w-full rounded-xl border px-3 py-2 font-normal"
                />
              </label>
              <label className="text-sm font-semibold">
                Level or season <span className="text-[#9a3b3b]">*</span>
                <input
                  name="levelOrSeason"
                  required
                  className="mt-1 w-full rounded-xl border px-3 py-2 font-normal"
                  placeholder="Varsity · Fall 2026"
                />
              </label>
              <label className="text-sm font-semibold">
                Expected roster size (optional)
                <input
                  name="rosterSize"
                  type="number"
                  min={1}
                  className="mt-1 w-full rounded-xl border px-3 py-2 font-normal"
                />
              </label>
              {error ? <p className="text-sm font-semibold text-[#9a3b3b]">{error}</p> : null}
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="submit"
                  disabled={pending}
                  className="rounded-full bg-[#122033] px-5 py-2 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {pending ? "Creating…" : "Create program"}
                </button>
                <button
                  type="button"
                  className="rounded-full border px-5 py-2 text-sm font-semibold"
                  onClick={() => setOpen(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
