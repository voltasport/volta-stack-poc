"use client";

import {useRouter} from "next/navigation";
import {useState} from "react";

export type AdminRequestRow = {
  id: string;
  type: string;
  status: string;
  payload: Record<string, unknown>;
  admin_notes: string | null;
  created_at: string;
  user_name: string;
  user_email: string;
};

function labelType(type: string) {
  if (type === "school") return "School & logo";
  if (type === "program") return "Program";
  if (type === "roster") return "Roster";
  if (type === "store") return "Team store";
  return type;
}

function summarizePayload(type: string, payload: Record<string, unknown>) {
  if (type === "school") {
    return String(payload.schoolName ?? payload.school_name ?? "—");
  }
  if (type === "program") {
    return [payload.sport, payload.level, payload.season].filter(Boolean).join(" · ");
  }
  if (type === "roster") {
    const text = String(payload.rosterText ?? "");
    return text.length > 120 ? `${text.slice(0, 120)}…` : text || "Roster upload";
  }
  if (type === "store") {
    return String(payload.notes ?? "—");
  }
  return JSON.stringify(payload);
}

export function RequestsAdmin({
  ready,
  requests,
}: {
  ready: boolean;
  requests: AdminRequestRow[];
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);

  if (!ready) {
    return (
      <p className="mt-6 rounded-2xl bg-[#f8efd0] px-4 py-3 text-sm text-[#6d5a14]">
        Run <code className="text-xs">npm run db:migrate</code> (migration 003) to enable the requests queue.
      </p>
    );
  }

  const pending = requests.filter((r) => r.status === "pending");
  const done = requests.filter((r) => r.status === "done");

  return (
    <div>
      {message ? <p className="mb-4 text-sm font-semibold text-[#187243]">{message}</p> : null}
      <section>
        <h2 className="text-sm font-extrabold tracking-[0.08em] text-[#6d7b8a]">PENDING</h2>
        {pending.length === 0 ? (
          <p className="mt-3 text-sm text-[#3c4a5c]">No open requests.</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-3">
            {pending.map((row) => (
              <li key={row.id} className="rounded-3xl bg-white p-5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-extrabold tracking-[0.08em] text-[#6d7b8a]">
                      {labelType(row.type).toUpperCase()}
                    </p>
                    <p className="mt-1 font-semibold">{summarizePayload(row.type, row.payload)}</p>
                    <p className="mt-1 text-sm text-[#6d7b8a]">
                      {row.user_name} · {row.user_email}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="rounded-full bg-[#122033] px-4 py-2 text-sm font-semibold text-white"
                    onClick={async () => {
                      const res = await fetch(`/api/admin/requests/${row.id}`, {
                        method: "PATCH",
                        headers: {"Content-Type": "application/json"},
                        body: JSON.stringify({}),
                      });
                      if (!res.ok) {
                        const payload = await res.json().catch(() => null);
                        setMessage(payload?.error ?? "Could not mark done");
                        return;
                      }
                      setMessage(`Marked ${labelType(row.type)} request done.`);
                      router.refresh();
                    }}
                  >
                    Mark done
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
      {done.length > 0 ? (
        <section className="mt-8">
          <h2 className="text-sm font-extrabold tracking-[0.08em] text-[#6d7b8a]">COMPLETED</h2>
          <ul className="mt-3 flex flex-col gap-2 text-sm text-[#6d7b8a]">
            {done.slice(0, 8).map((row) => (
              <li key={row.id}>
                {labelType(row.type)} — {row.user_email}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
