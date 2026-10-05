"use client";

import {useState} from "react";
import {useRouter, useSearchParams} from "next/navigation";
import {signIn, signUp} from "@/lib/auth-client";

export function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <form
      className="mt-8 flex flex-col gap-4"
      onSubmit={async (event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const email = String(data.get("email") ?? "");
        const password = String(data.get("password") ?? "");
        const name = String(data.get("name") ?? "Director");
        setPending(true);
        setError(null);
        const result =
          mode === "in"
            ? await signIn.email({email, password})
            : await signUp.email({email, password, name});
        setPending(false);
        if (result.error) {
          setError(result.error.message ?? "Could not sign in");
          return;
        }
        router.push(search.get("next") || "/");
        router.refresh();
      }}
    >
      {mode === "up" ? (
        <label className="flex flex-col gap-1 text-sm font-semibold">
          Name
          <input name="name" required className="rounded-xl border border-[#d9d3c8] px-3 py-2 font-normal" />
        </label>
      ) : null}
      <label className="flex flex-col gap-1 text-sm font-semibold">
        Email
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
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
          autoComplete={mode === "in" ? "current-password" : "new-password"}
          className="rounded-xl border border-[#d9d3c8] px-3 py-2 font-normal"
        />
      </label>
      {error ? <p className="text-sm text-[#9a3b3b]">{error}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-[#122033] px-4 py-3 text-sm font-semibold text-white disabled:bg-[#c5ced6]"
      >
        {pending ? "Working…" : mode === "in" ? "Sign in" : "Create account"}
      </button>
      <button
        type="button"
        className="text-sm font-semibold text-[#147a45]"
        onClick={() => {
          setMode(mode === "in" ? "up" : "in");
          setError(null);
        }}
      >
        {mode === "in" ? "Need an account? Create one" : "Already have an account? Sign in"}
      </button>
    </form>
  );
}
