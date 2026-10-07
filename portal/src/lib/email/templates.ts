const supportEmail = () =>
  process.env.PORTAL_SUPPORT_EMAIL?.trim() || "support@voltasport.co";

const expiryNote = () =>
  process.env.INVITE_LINK_EXPIRY_HOURS?.trim()
    ? `This link expires in ${process.env.INVITE_LINK_EXPIRY_HOURS} hours.`
    : "This link expires in 24 hours.";

function layout(body: string) {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;background:#f3f0e8;font-family:system-ui,-apple-system,Segoe UI,sans-serif;color:#122033">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px">
    <tr><td align="center">
      <table width="100%" style="max-width:520px;background:#fff;border-radius:24px;padding:32px">
        <tr><td>
          <p style="margin:0 0 8px;font-size:11px;font-weight:800;letter-spacing:0.14em">VOLTA PORTAL</p>
          ${body}
          <p style="margin:24px 0 0;font-size:12px;line-height:1.5;color:#6d7b8a">
            Questions? Reply to this email or contact <a href="mailto:${supportEmail()}" style="color:#147a45">${supportEmail()}</a>.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

export function inviteEmailContent(input: {
  recipientName: string;
  inviterName: string;
  setPasswordUrl: string;
}) {
  const subject = "You're invited to the Volta portal";
  const text = [
    `Hi ${input.recipientName},`,
    "",
    `${input.inviterName} invited you to the Volta portal.`,
    "Set your password to get started:",
    input.setPasswordUrl,
    "",
    expiryNote(),
    "",
    `Support: ${supportEmail()}`,
  ].join("\n");

  const html = layout(`
    <h1 style="margin:0 0 12px;font-size:26px;font-weight:900;letter-spacing:-0.03em">You're invited</h1>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.55;color:#3c4a5c">
      Hi ${escapeHtml(input.recipientName)},<br/><br/>
      <strong>${escapeHtml(input.inviterName)}</strong> invited you to the Volta portal to track programs, rosters, proofs, and team stores.
    </p>
    <p style="margin:0 0 20px">
      <a href="${escapeAttr(input.setPasswordUrl)}" style="display:inline-block;background:#122033;color:#fff;text-decoration:none;font-weight:600;font-size:14px;padding:14px 22px;border-radius:999px">Set your password</a>
    </p>
    <p style="margin:0 0 8px;font-size:13px;line-height:1.5;color:#6d7b8a">${escapeHtml(expiryNote())}</p>
    <p style="margin:0;font-size:12px;line-height:1.5;color:#98a2b0;word-break:break-all">${escapeHtml(input.setPasswordUrl)}</p>
  `);

  return {subject, html, text};
}

export function resetPasswordEmailContent(input: {
  recipientName: string;
  setPasswordUrl: string;
}) {
  const subject = "Reset your Volta portal password";
  const text = [
    `Hi ${input.recipientName},`,
    "",
    "Use the link below to set a new password for your Volta portal account:",
    input.setPasswordUrl,
    "",
    expiryNote(),
    "",
    `Support: ${supportEmail()}`,
  ].join("\n");

  const html = layout(`
    <h1 style="margin:0 0 12px;font-size:26px;font-weight:900;letter-spacing:-0.03em">Reset your password</h1>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.55;color:#3c4a5c">
      Hi ${escapeHtml(input.recipientName)},<br/><br/>
      We received a request to reset your Volta portal password.
    </p>
    <p style="margin:0 0 20px">
      <a href="${escapeAttr(input.setPasswordUrl)}" style="display:inline-block;background:#122033;color:#fff;text-decoration:none;font-weight:600;font-size:14px;padding:14px 22px;border-radius:999px">Set your password</a>
    </p>
    <p style="margin:0 0 8px;font-size:13px;line-height:1.5;color:#6d7b8a">${escapeHtml(expiryNote())}</p>
    <p style="margin:0;font-size:12px;line-height:1.5;color:#98a2b0;word-break:break-all">${escapeHtml(input.setPasswordUrl)}</p>
  `);

  return {subject, html, text};
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(value: string) {
  return escapeHtml(value).replace(/'/g, "&#39;");
}
