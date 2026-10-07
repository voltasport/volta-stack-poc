"use client";

import {useState} from "react";
import {useRouter, useSearchParams} from "next/navigation";
import {signIn} from "@/lib/auth-client";

export function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const prefilledEmail = search.get("email") ?? "";
  const passwordJustSet = search.get("passwordSet") === "1";

  return (
    <form
      className="mt-8 flex flex-col gap-4"
      onSubmit={async (event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const email = String(data.get("email") ?? "");
        const password = String(data.get("password") ?? "");
        setPending(true);
        setError(null);
        const result = await signIn.email({email, password});
        setPending(false);
        if (result.error) {
          setError(result.error.message ?? "Could not sign in");
          return;
        }
        router.push(search.get("next") || "/");
        router.refresh();
      }}
    >
      {passwordJustSet ? (
        <p className="rounded-xl bg-[#e5f6ea] px-3 py-2 text-sm font-semibold text-[#187243]">
          Password set — sign in with your email and new password.
        </p>
      ) : null}
      <label className="flex flex-col gap-1 text-sm font-semibold">
        Email
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          defaultValue={prefilledEmail}
          className="rounded-xl border border-[#d9d3c8] px-3 py-2 font-normal"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm font-semibold">
        Password
        <input
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="current-password"
          className="rounded-xl border border-[#d9d3c8] px-3 py-2 font-normal"
        />
      </label>
      {error ? <p className="text-sm text-[#9a3b3b]">{error}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-[#122033] px-4 py-3 text-sm font-semibold text-white disabled:bg-[#c5ced6]"
      >
        {pending ? "Working…" : "Sign in"}
      </button>
      <p className="text-sm text-[#5d6b7a]">
        Need access? Ask a Volta admin to create your account and send an invite link.
      </p>
    </form>
  );
}
