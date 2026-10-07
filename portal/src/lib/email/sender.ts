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

class ConsoleEmailSender implements EmailSender {
  async send(message: OutboundEmail) {
    console.info(
      `[portal-email] not configured — would send to ${message.to}: "${message.subject}" (use copy-link on Users page)`,
    );
    return {id: "console"};
  }
}

class DevFileEmailSender implements EmailSender {
  async send(message: OutboundEmail) {
    const dir = join(process.cwd(), ".data", "email-previews");
    const stamp = Date.now();
    const safe = message.to.replace(/[^a-z0-9]+/gi, "-").slice(0, 40);
    try {
      mkdirSync(dir, {recursive: true});
      writeFileSync(join(dir, `${stamp}-${safe}.html`), message.html, "utf8");
      writeFileSync(join(dir, `${stamp}-${safe}.txt`), message.text, "utf8");
      console.info(`[portal-email] dev preview written for ${message.to}: ${message.subject}`);
    } catch (error) {
      console.info(
        `[portal-email] not configured — preview write failed (${error instanceof Error ? error.message : "error"}); subject "${message.subject}" to ${message.to}`,
      );
    }
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

function fallbackSender(): EmailSender {
  if (process.env.NODE_ENV === "production") {
    return new ConsoleEmailSender();
  }
  return new DevFileEmailSender();
}

/** Resend when configured; otherwise console (prod) or dev file preview (non-prod). Never throws for missing config. */
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
    await fallbackSender().send(message);
    return {sent: false, reason: "not_configured"};
  } catch (error) {
    return {
      sent: false,
      reason: "failed",
      detail: error instanceof Error ? error.message : "Fallback failed",
    };
  }
}
