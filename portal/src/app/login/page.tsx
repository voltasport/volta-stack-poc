import {Suspense} from "react";
import {LoginForm} from "./login-form";

export default function LoginPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#f3f0e8] px-6 text-[#122033]">
      <div className="w-full max-w-md rounded-3xl bg-white p-8">
        <p className="text-xs font-extrabold tracking-[0.14em]">VOLTA PORTAL</p>
        <h1 className="mt-2 text-4xl font-black tracking-[-0.04em]">Sign in</h1>
        <p className="mt-2 text-sm leading-6 text-[#5d6b7a]">
          Sign in to track programs, approve proofs, and manage rosters. Team gear is available
          under Team stores.
        </p>
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}
