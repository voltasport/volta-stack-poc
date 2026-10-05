import type {ReactNode} from "react";
import {redirect} from "next/navigation";
import {currentSession} from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function AppLayout({children}: {children: ReactNode}) {
  const session = await currentSession();
  if (!session) redirect("/login");
  return children;
}
