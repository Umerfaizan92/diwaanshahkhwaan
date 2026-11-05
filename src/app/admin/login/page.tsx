import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import { getStaff } from "@/lib/server/auth";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Staff sign in", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function StaffLoginPage() {
  if (await getStaff()) redirect("/admin");
  return (
    <main id="main" className="grid min-h-dvh place-items-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <Image src="/images/brand/emblem.png" alt="" width={72} height={72} className="rounded-full ring-1 ring-gold/40" priority />
          <h1 className="mt-4 font-display text-2xl">Kitchen dashboard</h1>
          <p className="text-sm text-muted">Diwaan Shah Khwaan staff only</p>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
