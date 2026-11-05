import { NextResponse, type NextRequest } from "next/server";

/**
 * Optimistic gate only: sends signed-out visitors to the login page.
 * Real authorisation is enforced on the server in every admin page and action.
 */
export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname.startsWith("/admin") && !pathname.startsWith("/admin/login") && !req.cookies.has("dsk_staff")) {
    const url = req.nextUrl.clone();
    url.pathname = "/admin/login";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/admin/:path*"] };
