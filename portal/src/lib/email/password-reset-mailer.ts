import {deliverEmail} from "@/lib/email/sender";
import {resetPasswordEmailContent} from "@/lib/email/templates";

export async function sendResetPasswordEmail(input: {
  email: string;
  name: string;
  url: string;
}) {
  const content = resetPasswordEmailContent({
    recipientName: input.name,
    setPasswordUrl: input.url,
  });
  return deliverEmail({
    to: input.email,
    subject: content.subject,
    html: content.html,
    text: content.text,
  });
}
