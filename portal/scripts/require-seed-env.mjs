import {randomBytes} from "node:crypto";

export const LOCAL_TEST_ADMIN_EMAIL = "admin@test.local";
export const LOCAL_TEST_DIRECTOR_EMAIL = "director@test.local";
export const LOCAL_TEST_MANAGER_EMAIL = "manager@test.local";

/** @param {string} name */
export function requireEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(
      `Missing ${name}. Set it in the environment (e.g. portal/.env.local, gitignored). Passwords must not be committed to the public repo.`,
    );
  }
  return value;
}

export function seedPasswords() {
  return {
    admin: requireEnv("SEED_ADMIN_PASSWORD"),
    director: requireEnv("SEED_DIRECTOR_PASSWORD"),
    manager: requireEnv("SEED_MANAGER_PASSWORD"),
  };
}

/** One-off password for sign-up rejection probes (not stored in repo). */
export function randomProbePassword() {
  return randomBytes(24).toString("base64url");
}

/** Password for invite-flow validation (set on user during test). */
export function inviteTestPassword() {
  return randomBytes(24).toString("base64url");
}
