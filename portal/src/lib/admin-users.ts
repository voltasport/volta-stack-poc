import {headers} from "next/headers";
import {getAuth} from "@/lib/auth";
import {sql} from "@/lib/db";
import {currentSession} from "@/lib/session";
import {
  createSetPasswordUrl,
  currentInviterName,
  recordInviteSent,
  sendInviteEmailToUser,
} from "@/lib/portal-invites";

async function requireAdminSession() {
  const session = await currentSession();
  if (session?.user.role !== "admin") {
    throw new Error("Forbidden");
  }
  return session;
}

export async function createPortalUser(input: {
  email: string;
  name: string;
  role: string;
  password?: string;
}) {
  await requireAdminSession();
  const auth = getAuth();
  const tempPassword = input.password ?? crypto.randomUUID().replace(/-/g, "").slice(0, 16);
  const result = await auth.api.createUser({
    body: {
      email: input.email,
      name: input.name,
      password: tempPassword,
    },
    headers: await headers(),
  });
  await sql().query(`update "user" set role = $2, "updatedAt" = now() where id = $1`, [
    result.user.id,
    input.role,
  ]);
  return {user: {...result.user, role: input.role}};
}

export async function generatePasswordResetLink(email: string) {
  await requireAdminSession();
  return createSetPasswordUrl(email);
}

export async function deliverUserInvite(input: {
  userId: string;
  email: string;
  name: string;
  sendEmail: boolean;
}) {
  await requireAdminSession();
  const inviterName = await currentInviterName();
  if (input.sendEmail) {
    const result = await sendInviteEmailToUser({
      userId: input.userId,
      email: input.email,
      name: input.name,
      inviterName,
    });
    return {
      url: result.url,
      emailSent: result.delivery.sent,
      emailConfigured: result.delivery.sent || result.delivery.reason !== "not_configured",
      detail:
        result.delivery.sent
          ? "Invite email sent."
          : result.delivery.reason === "not_configured"
            ? "Email not configured, copy the link instead."
            : (result.delivery.detail ?? "Email failed; copy the link instead."),
    };
  }
  const url = await createSetPasswordUrl(input.email);
  await recordInviteSent(input.userId);
  return {
    url,
    emailSent: false,
    emailConfigured: false,
    detail: "Set-password link ready to copy.",
  };
}
