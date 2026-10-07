"use client";

import {useParams, useRouter, useSearchParams} from "next/navigation";
import {useState} from "react";

export default function ResetPasswordPage() {
  const params = useParams<{token: string}>();
  const search = useSearchParams();
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <main className="grid min-h-screen place-items-center bg-[#f3f0e8] px-6 text-[#122033]">
      <div className="w-full max-w-md rounded-3xl bg-white p-8">
        <p className="text-xs font-extrabold tracking-[0.14em]">VOLTA PORTAL</p>
        <h1 className="mt-2 text-3xl font-black tracking-[-0.04em]">Set your password</h1>
        <form
          className="mt-6 flex flex-col gap-4"
          onSubmit={async (event) => {
            event.preventDefault();
            setPending(true);
            setError(null);
            const response = await fetch("/api/auth/reset-password", {
              method: "POST",
              headers: {"Content-Type": "application/json"},
              body: JSON.stringify({newPassword: password, token: params.token}),
            });
            setPending(false);
            if (!response.ok) {
              const payload = (await response.json().catch(() => null)) as {message?: string} | null;
              setError(payload?.message ?? "Could not reset password");
              return;
            }
            router.push(search.get("callbackURL") || "/");
            router.refresh();
          }}
        >
          <label className="flex flex-col gap-1 text-sm font-semibold">
            New password
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="rounded-xl border border-[#d9d3c8] px-3 py-2 font-normal"
            />
          </label>
          {error ? <p className="text-sm text-[#9a3b3b]">{error}</p> : null}
          <button
            type="submit"
            disabled={pending}
            className="rounded-full bg-[#122033] px-4 py-3 text-sm font-semibold text-white disabled:bg-[#c5ced6]"
          >
            {pending ? "Saving…" : "Save password"}
          </button>
        </form>
      </div>
    </main>
  );
}
