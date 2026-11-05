import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import { getStaff } from "@/lib/server/auth";
import { ownerExists } from "@/lib/server/owner-access";
import { ForgotPassword } from "../OwnerAccessForms";

export const metadata: Metadata = { title: "Reset owner password", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function ForgotPasswordPage() {
  if (await getStaff()) redirect("/admin");
  if (!(await ownerExists())) redirect("/admin/login");
  return (
    <main id="main" className="grid min-h-dvh place-items-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <Image src="/images/brand/emblem.png" alt="" width={72} height={72} className="rounded-full ring-1 ring-gold/40" priority />
          <h1 className="mt-4 font-display text-2xl">Reset owner password</h1>
          <p className="text-sm text-muted">Verified by a code sent to the owner&apos;s email and mobile.</p>
        </div>
        <ForgotPassword />
      </div>
    </main>
  );
}
