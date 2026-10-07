"use client";

import {useRouter} from "next/navigation";
import {useState} from "react";
import {portalRoles, type PortalRole} from "@/lib/roles";

type UserRow = {id: string; name: string; email: string; role: string};
type ProgramRow = {slug: string; name: string; school_slug: string};

export function UsersAdmin({
  users,
  programs,
  assignments,
}: {
  users: UserRow[];
  programs: ProgramRow[];
  assignments: Record<string, string[]>;
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [link, setLink] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <div>
      <h1 className="text-4xl font-black tracking-[-0.04em]">USERS</h1>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-[#3c4a5c]">
        Create accounts, set roles, assign programs, and copy invite or password-reset links to send
        manually.
      </p>
      {message ? <p className="mt-4 text-sm font-semibold text-[#187243]">{message}</p> : null}
      {link ? (
        <p className="mt-2 break-all rounded-2xl bg-white px-4 py-3 text-sm text-[#122033]">{link}</p>
      ) : null}

      <form
        className="mt-6 grid max-w-xl gap-3 rounded-3xl bg-white p-5"
        onSubmit={async (event) => {
          event.preventDefault();
          setPending(true);
          setMessage(null);
          setLink(null);
          const data = new FormData(event.currentTarget);
          const response = await fetch("/api/admin/users", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({
              email: data.get("email"),
              name: data.get("name"),
              role: data.get("role"),
            }),
          });
          setPending(false);
          const payload = await response.json();
          if (!response.ok) {
            setMessage(payload.error ?? "Could not create user");
            return;
          }
          setMessage(
            `Created ${payload.user.email}. Use “Copy set-password link” below to invite them.`,
          );
          router.refresh();
        }}
      >
        <h2 className="text-sm font-extrabold tracking-[0.08em]">CREATE USER</h2>
        <input name="name" required placeholder="Name" className="rounded-xl border px-3 py-2 text-sm" />
        <input
          name="email"
          type="email"
          required
          placeholder="Email"
          className="rounded-xl border px-3 py-2 text-sm"
        />
        <select name="role" className="rounded-xl border px-3 py-2 text-sm" defaultValue="director">
          {portalRoles.map((role) => (
            <option key={role} value={role}>
              {role}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-[#122033] px-4 py-2 text-sm font-semibold text-white disabled:bg-[#c5ced6]"
        >
          Create user
        </button>
      </form>

      <ul className="mt-8 flex flex-col gap-4">
        {users.map((user) => (
          <li key={user.id} className="rounded-3xl bg-white p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold">{user.name}</p>
                <p className="text-sm text-[#6d7b8a]">{user.email}</p>
              </div>
              <select
                className="rounded-xl border px-3 py-1.5 text-sm capitalize"
                defaultValue={user.role}
                onChange={async (event) => {
                  await fetch(`/api/admin/users/${user.id}`, {
                    method: "PATCH",
                    headers: {"Content-Type": "application/json"},
                    body: JSON.stringify({role: event.target.value}),
                  });
                  router.refresh();
                }}
              >
                {portalRoles.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
            </div>
            {user.role !== "admin" ? (
              <div className="mt-4">
                <p className="text-xs font-extrabold tracking-[0.08em] text-[#6d7b8a]">PROGRAMS</p>
                <ul className="mt-2 flex flex-col gap-1 text-sm">
                  {programs.map((program) => {
                    const checked = assignments[user.id]?.includes(program.slug) ?? false;
                    return (
                      <li key={program.slug}>
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            defaultChecked={checked}
                            onChange={async (event) => {
                              const next = new Set(assignments[user.id] ?? []);
                              if (event.target.checked) next.add(program.slug);
                              else next.delete(program.slug);
                              await fetch(`/api/admin/users/${user.id}`, {
                                method: "PATCH",
                                headers: {"Content-Type": "application/json"},
                                body: JSON.stringify({programSlugs: [...next]}),
                              });
                              router.refresh();
                            }}
                          />
                          {program.name}{" "}
                          <span className="text-[#6d7b8a]">({program.school_slug})</span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : null}
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                className="rounded-full border border-[#e4dfd6] px-3 py-1.5 text-sm font-semibold"
                onClick={async () => {
                  setLink(null);
                  const response = await fetch(`/api/admin/users/${user.id}/invite`, {method: "POST"});
                  const payload = await response.json();
                  if (!response.ok) {
                    setMessage(payload.error ?? "Could not create invite link");
                    return;
                  }
                  setMessage(`Invite / reset link for ${user.email}`);
                  setLink(payload.url);
                }}
              >
                Copy set-password link
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
