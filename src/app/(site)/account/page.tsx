import { redirect } from "next/navigation";

/** Accounts are for the business owner only: customers track orders from the link in their email */
export default function AccountPage() {
  redirect("/admin/login");
}
