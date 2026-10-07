import {deliverEmail} from "../src/lib/email/sender.ts";
import {inviteEmailContent} from "../src/lib/email/templates.ts";

const content = inviteEmailContent({
  recipientName: "Ben",
  inviterName: "Volta Admin",
  setPasswordUrl: "http://localhost:3001/reset-password/demo?email=ben@andcollar.com",
});
await deliverEmail({
  to: "ben@andcollar.com",
  subject: content.subject,
  html: content.html,
  text: content.text,
});
console.log("preview written");
