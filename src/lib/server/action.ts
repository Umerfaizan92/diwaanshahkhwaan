import "server-only";
import { AuthError, requireStaff, type StaffUser } from "./auth";
import type { Permission } from "@/lib/domain/permissions";

export type ActionResult<T = undefined> = { ok: true; data?: T; message?: string } | { ok: false; error: string; fieldErrors?: Record<string, string> };

/** Runs a staff-only server action: checks the session and permission on the server every time, and never leaks internal errors */
export async function staffAction<T>(permission: Permission, fn: (user: StaffUser) => Promise<ActionResult<T>>): Promise<ActionResult<T>> {
  let user: StaffUser;
  try {
    user = await requireStaff(permission);
  } catch (e) {
    if (e instanceof AuthError) return { ok: false, error: e.message };
    throw e;
  }
  try {
    return await fn(user);
  } catch (e) {
    console.error(`[action:${permission}]`, e);
    return { ok: false, error: "Something went wrong saving that. Please try again." };
  }
}
