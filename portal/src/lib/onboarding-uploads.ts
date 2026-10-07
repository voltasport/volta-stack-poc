import {mkdirSync, writeFileSync} from "node:fs";
import {join} from "node:path";
import {randomBytes} from "node:crypto";

const MAX_LOGO_BYTES = 2 * 1024 * 1024;

export function saveOnboardingLogo(userId: string, bytes: Buffer, mime: string) {
  if (bytes.length > MAX_LOGO_BYTES) {
    throw new Error("Logo must be 2 MB or smaller.");
  }
  const ext =
    mime === "image/png" ? "png" : mime === "image/jpeg" ? "jpg" : mime === "image/webp" ? "webp" : null;
  if (!ext) {
    throw new Error("Logo must be PNG, JPEG, or WebP.");
  }
  const dir = join(process.cwd(), ".data", "onboarding-logos");
  mkdirSync(dir, {recursive: true});
  const file = `${userId}-${randomBytes(6).toString("hex")}.${ext}`;
  const path = join(dir, file);
  writeFileSync(path, bytes);
  return file;
}

export function logoAbsolutePath(fileName: string) {
  return join(process.cwd(), ".data", "onboarding-logos", fileName);
}
