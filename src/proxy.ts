import { NextRequest, NextResponse } from "next/server";
import { checkBasicAuth, AUTH_REALM } from "@/lib/auth";

export const config = {
  matcher: ["/upload", "/admin", "/api/blob-upload", "/api/process", "/api/admin/:path*"],
};

export function proxy(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (checkBasicAuth(auth)) {
    return NextResponse.next();
  }
  // Only send the WWW-Authenticate challenge for genuine top-level navigations.
  // For Next.js prefetch/RSC background requests, omit it so the browser's
  // Basic Auth dialog never pops on public pages that merely link here.
  const isBackground =
    req.headers.get("next-router-prefetch") != null ||
    req.headers.get("rsc") != null ||
    /prefetch/i.test(req.headers.get("sec-purpose") ?? "") ||
    /prefetch/i.test(req.headers.get("purpose") ?? "");
  const headers: Record<string, string> = {};
  if (!isBackground) headers["WWW-Authenticate"] = AUTH_REALM;
  return new NextResponse("Authentication required", { status: 401, headers });
}
