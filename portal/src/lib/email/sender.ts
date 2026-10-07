import {mkdirSync, writeFileSync} from "node:fs";
import {join} from "node:path";
import {Resend} from "resend";
import type {EmailDeliveryResult, EmailSender, OutboundEmail} from "@/lib/email/types";

class ResendEmailSender implements EmailSender {
  constructor(
    private client: Resend,
    private from: string,
  ) {}

  async send(message: OutboundEmail) {
    const result = await this.client.emails.send({
      from: this.from,
      to: message.to,
      subject: message.subject,
      html: message.html,
      text: message.text,
    });
    if (result.error) {
      throw new Error(result.error.message);
    }
    return {id: result.data?.id};
  }
}

class LogEmailSender implements EmailSender {
  async send(message: OutboundEmail) {
    const dir = join(process.cwd(), ".data", "email-previews");
    mkdirSync(dir, {recursive: true});
    const stamp = Date.now();
    const safe = message.to.replace(/[^a-z0-9]+/gi, "-").slice(0, 40);
    writeFileSync(join(dir, `${stamp}-${safe}.html`), message.html, "utf8");
    writeFileSync(join(dir, `${stamp}-${safe}.txt`), message.text, "utf8");
    console.info(`[portal-email] logged preview for ${message.to}: ${message.subject}`);
    return {id: `log-${stamp}`};
  }
}

export function isInviteEmailConfigured() {
  return Boolean(process.env.RESEND_API_KEY?.trim() && process.env.INVITE_FROM_EMAIL?.trim());
}

export function createConfiguredSender(): EmailSender | null {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.INVITE_FROM_EMAIL?.trim();
  if (apiKey && from) {
    return new ResendEmailSender(new Resend(apiKey), from);
  }
  return null;
}

/** Resend when configured; otherwise log previews locally (never throws for missing config). */
export async function deliverEmail(message: OutboundEmail): Promise<EmailDeliveryResult> {
  const configured = createConfiguredSender();
  if (configured) {
    try {
      const result = await configured.send(message);
      return {sent: true, provider: "resend", id: result.id};
    } catch (error) {
      return {
        sent: false,
        reason: "failed",
        detail: error instanceof Error ? error.message : "Send failed",
      };
    }
  }
  try {
    await new LogEmailSender().send(message);
    return {sent: false, reason: "not_configured"};
  } catch (error) {
    return {
      sent: false,
      reason: "failed",
      detail: error instanceof Error ? error.message : "Log failed",
    };
  }
}
