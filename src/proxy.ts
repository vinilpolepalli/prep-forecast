import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Issues the httpOnly owner cookie on first visit. The id is also forwarded as a request header so the very
// first server render can read it before the browser has stored the cookie.
export function proxy(req: NextRequest) {
  const existing = req.cookies.get("pf_uid")?.value;
  const id = existing && /^[0-9a-f-]{36}$/.test(existing) ? existing : crypto.randomUUID();
  const headers = new Headers(req.headers);
  headers.set("x-pf-uid", id);
  const res = NextResponse.next({ request: { headers } });
  if (id !== existing) res.cookies.set("pf_uid", id, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 365, secure: process.env.NODE_ENV === "production" && process.env.PF_INSECURE_COOKIE !== "1" });
  return res;
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
