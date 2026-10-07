import {headers} from "next/headers";
import {deliverEmail} from "@/lib/email/sender";
import {inviteEmailContent} from "@/lib/email/templates";
import {getAuth} from "@/lib/auth";
import {sql} from "@/lib/db";
import {isMissingColumn} from "@/lib/db-errors";
import {currentSession} from "@/lib/session";

import {inviteLifecycleStatus, type InviteLifecycleStatus} from "@/lib/portal-invite-status";

export type {InviteLifecycleStatus};
export {inviteLifecycleStatus};

export type PortalUserInviteRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  invited_at: string | null;
  last_invite_sent_at: string | null;
  first_login_at: string | null;
  onboarding_dismissed_at: string | null;
};

function baseUrl() {
  return process.env["BETTER_AUTH_URL"] ?? process.env["NEXT_PUBLIC_APP_URL"] ?? "http://localhost:3000";
}

export async function listPortalUsersWithInviteMeta(): Promise<{
  users: PortalUserInviteRow[];
  inviteColumnsReady: boolean;
}> {
  try {
    const rows = (await sql().query(
      `select id, name, email, role, invited_at, last_invite_sent_at, first_login_at, onboarding_dismissed_at
       from "user"
       order by email`,
    )) as PortalUserInviteRow[];
    return {users: rows, inviteColumnsReady: true};
  } catch (error) {
    if (isMissingColumn(error, "invited_at") || isMissingColumn(error, "last_invite_sent_at")) {
      const fallback = (await sql().query(
        `select id, name, email, role from "user" order by email`,
      )) as {id: string; name: string; email: string; role: string}[];
      return {
        inviteColumnsReady: false,
        users: fallback.map((row) => ({
          ...row,
          invited_at: null,
          last_invite_sent_at: null,
          first_login_at: null,
          onboarding_dismissed_at: null,
        })),
      };
    }
    throw error;
  }
}

export async function recordInviteSent(userId: string) {
  try {
    await sql().query(
      `update "user"
       set invited_at = coalesce(invited_at, now()),
           last_invite_sent_at = now(),
           "updatedAt" = now()
       where id = $1`,
      [userId],
    );
  } catch (error) {
    if (isMissingColumn(error, "last_invite_sent_at")) return;
    throw error;
  }
}

export async function touchFirstLogin(userId: string) {
  try {
    await sql().query(
      `update "user"
       set first_login_at = coalesce(first_login_at, now()),
           "updatedAt" = now()
       where id = $1`,
      [userId],
    );
  } catch (error) {
    if (isMissingColumn(error, "first_login_at")) return;
    throw error;
  }
}

export async function loadOnboardingDismissed(userId: string): Promise<boolean> {
  try {
    const rows = (await sql().query(
      `select onboarding_dismissed_at from "user" where id = $1`,
      [userId],
    )) as {onboarding_dismissed_at: string | null}[];
    return Boolean(rows[0]?.onboarding_dismissed_at);
  } catch (error) {
    if (isMissingColumn(error, "onboarding_dismissed_at")) return false;
    throw error;
  }
}

export async function dismissOnboardingChecklist(userId: string) {
  try {
    await sql().query(
      `update "user" set onboarding_dismissed_at = now(), "updatedAt" = now() where id = $1`,
      [userId],
    );
  } catch (error) {
    if (isMissingColumn(error, "onboarding_dismissed_at")) return;
    throw error;
  }
}

export async function createSetPasswordUrl(email: string) {
  const auth = getAuth();
  const redirectTo = `${baseUrl()}/reset-password`;
  await auth.api.requestPasswordReset({
    body: {email, redirectTo},
    headers: await headers(),
  });
  const rows = (await sql().query(
    `select identifier from verification
     where identifier like 'reset-password:%'
     order by "createdAt" desc
     limit 1`,
  )) as {identifier: string}[];
  const identifier = rows[0]?.identifier;
  if (!identifier) {
    throw new Error("Could not create reset link. Check that the user exists.");
  }
  const token = identifier.replace("reset-password:", "");
  const params = new URLSearchParams({callbackURL: "/", email});
  return `${baseUrl()}/reset-password/${token}?${params.toString()}`;
}

export async function sendInviteEmailToUser(input: {
  userId: string;
  email: string;
  name: string;
  inviterName: string;
}) {
  const url = await createSetPasswordUrl(input.email);
  const content = inviteEmailContent({
    recipientName: input.name,
    inviterName: input.inviterName,
    setPasswordUrl: url,
  });
  const delivery = await deliverEmail({
    to: input.email,
    subject: content.subject,
    html: content.html,
    text: content.text,
  });
  await recordInviteSent(input.userId);
  return {url, delivery};
}

export async function currentInviterName() {
  const session = await currentSession();
  return session?.user.name ?? session?.user.email ?? "A Volta admin";
}
