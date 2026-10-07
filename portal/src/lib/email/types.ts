export type OutboundEmail = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

export type EmailSender = {
  send(message: OutboundEmail): Promise<{id?: string}>;
};

export type EmailDeliveryResult =
  | {sent: true; provider: string; id?: string}
  | {sent: false; reason: "not_configured" | "failed"; detail?: string};
