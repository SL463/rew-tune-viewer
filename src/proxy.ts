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
  return new NextResponse("Authentication required", {
    status: 401,
    headers: { "WWW-Authenticate": AUTH_REALM },
  });
}
