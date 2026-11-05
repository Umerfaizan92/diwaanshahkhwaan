import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import { getStaff } from "@/lib/server/auth";
import Link from "next/link";
import { LoginForm } from "./LoginForm";
import { OwnerSetup } from "./OwnerAccessForms";
import { ownerExists } from "@/lib/server/owner-access";

export const metadata: Metadata = { title: "Owner sign in", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function StaffLoginPage() {
  if (await getStaff()) redirect("/admin");
  const hasOwner = await ownerExists();
  return (
    <main id="main" className="grid min-h-dvh place-items-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <Image src="/images/brand/emblem.png" alt="" width={72} height={72} className="rounded-full ring-1 ring-gold/40" priority />
          <h1 className="mt-4 font-display text-2xl">Owner dashboard</h1>
          <p className="text-sm text-muted">For the business owner only. Customers: your order link is in your confirmation email.</p>
        </div>
        {hasOwner ? (
          <>
            <LoginForm />
            <p className="mt-5 text-center text-sm">
              <Link href="/admin/login/forgot" className="font-semibold text-gold underline">
                Forgot password?
              </Link>
            </p>
          </>
        ) : (
          <OwnerSetup />
        )}
      </div>
    </main>
  );
}
