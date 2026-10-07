export type InviteLifecycleStatus = "never_sent" | "invited" | "active";

export type PortalUserInviteFields = {
  last_invite_sent_at: string | null;
  first_login_at: string | null;
};

export function inviteLifecycleStatus(row: PortalUserInviteFields): InviteLifecycleStatus {
  if (row.first_login_at) return "active";
  if (row.last_invite_sent_at) return "invited";
  return "never_sent";
}
