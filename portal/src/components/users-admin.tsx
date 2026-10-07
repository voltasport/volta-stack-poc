"use client";

import {useRouter} from "next/navigation";
import {useState} from "react";
import {portalRoles} from "@/lib/roles";
import {inviteLifecycleStatus} from "@/lib/portal-invite-status";

type PortalUserInviteRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  invited_at: string | null;
  last_invite_sent_at: string | null;
  first_login_at: string | null;
  onboarding_dismissed_at: string | null;
};

type ProgramRow = {slug: string; name: string; school_slug: string};

function statusLabel(status: ReturnType<typeof inviteLifecycleStatus>) {
  if (status === "active") return "Active";
  if (status === "invited") return "Invited";
  return "Never sent";
}

function statusClass(status: ReturnType<typeof inviteLifecycleStatus>) {
  if (status === "active") return "bg-[#e5f6ea] text-[#187243]";
  if (status === "invited") return "bg-[#e8eef6] text-[#3d5678]";
  return "bg-[#eef1f4] text-[#3c4a5c]";
}

export function UsersAdmin({
  users,
  programs,
  assignments,
  inviteColumnsReady,
  emailConfigured,
  currentAdminUserId,
}: {
  users: PortalUserInviteRow[];
  programs: ProgramRow[];
  assignments: Record<string, string[]>;
  inviteColumnsReady: boolean;
  emailConfigured: boolean;
  currentAdminUserId: string;
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [link, setLink] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <div>
      <h1 className="text-4xl font-black tracking-[-0.04em]">USERS</h1>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-[#3c4a5c]">
        Create accounts, assign programs, and send portal invites.{" "}
        {emailConfigured
          ? "Invite emails send automatically when you create a user or click Send invite."
          : "Email not configured — copy set-password links instead."}
      </p>
      {!inviteColumnsReady ? (
        <p className="mt-3 rounded-2xl bg-[#f8efd0] px-4 py-3 text-sm text-[#6d5a14]">
          Invite status requires migration 003. Run <code className="text-xs">npm run db:migrate</code>.
        </p>
      ) : null}
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
          const invite = payload.invite as {detail?: string; url?: string; emailSent?: boolean} | undefined;
          setMessage(
            invite?.emailSent
              ? `Created ${payload.user.email}. ${invite.detail ?? "Invite sent."}`
              : `Created ${payload.user.email}. ${invite?.detail ?? "Use Send invite or copy the link below."}`,
          );
          if (invite?.url && !invite.emailSent) setLink(invite.url);
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
        {users.map((user) => {
          const lifecycle = inviteLifecycleStatus(user);
          return (
            <li key={user.id} className="rounded-3xl bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{user.name}</p>
                  <p className="text-sm text-[#6d7b8a]">{user.email}</p>
                  {inviteColumnsReady ? (
                    <span
                      className={`mt-2 inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusClass(lifecycle)}`}
                    >
                      {statusLabel(lifecycle)}
                    </span>
                  ) : null}
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
                  className="rounded-full bg-[#122033] px-3 py-1.5 text-sm font-semibold text-white"
                  onClick={async () => {
                    setLink(null);
                    const response = await fetch(`/api/admin/users/${user.id}/invite`, {
                      method: "POST",
                      headers: {"Content-Type": "application/json"},
                      body: JSON.stringify({sendEmail: true}),
                    });
                    const payload = await response.json();
                    if (!response.ok) {
                      setMessage(payload.error ?? "Could not send invite");
                      return;
                    }
                    setMessage(`${user.email}: ${payload.detail ?? "Invite sent."}`);
                    if (payload.url && !payload.emailSent) setLink(payload.url);
                    router.refresh();
                  }}
                >
                  {lifecycle === "never_sent" ? "Send invite" : "Resend invite"}
                </button>
                <button
                  type="button"
                  className="rounded-full border border-[#e4dfd6] px-3 py-1.5 text-sm font-semibold"
                  onClick={async () => {
                    setLink(null);
                    const response = await fetch(`/api/admin/users/${user.id}/invite`, {
                      method: "POST",
                      headers: {"Content-Type": "application/json"},
                      body: JSON.stringify({sendEmail: false}),
                    });
                    const payload = await response.json();
                    if (!response.ok) {
                      setMessage(payload.error ?? "Could not create invite link");
                      return;
                    }
                    setMessage(`Set-password link for ${user.email}`);
                    setLink(payload.url);
                    router.refresh();
                  }}
                >
                  Copy set-password link
                </button>
                <button
                  type="button"
                  className="rounded-full border border-[#e8c4c4] px-3 py-1.5 text-sm font-semibold text-[#9a3b3b]"
                  disabled={user.id === currentAdminUserId}
                  onClick={async () => {
                    const ok = window.confirm(
                      `Delete ${user.email}? This removes their account, sessions, assignments, and any programs only they own.`,
                    );
                    if (!ok) return;
                    setLink(null);
                    const response = await fetch(`/api/admin/users/${user.id}`, {method: "DELETE"});
                    const payload = await response.json();
                    if (!response.ok) {
                      setMessage(payload.error ?? "Could not delete user");
                      return;
                    }
                    setMessage(`Deleted ${payload.email ?? user.email}.`);
                    router.refresh();
                  }}
                >
                  Delete user
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
