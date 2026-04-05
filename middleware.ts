import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { APP_GATE_COOKIE, verifyAppGateToken } from "@/lib/app-gate";

export async function middleware(request: NextRequest) {
  const password = process.env.APP_PASSWORD;
  if (!password) {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;
  if (pathname.startsWith("/login")) {
    return NextResponse.next();
  }

  const token = request.cookies.get(APP_GATE_COOKIE)?.value;
  if (token && (await verifyAppGateToken(password, token))) {
    return NextResponse.next();
  }

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/login";
  const fullPath = pathname + (request.nextUrl.search || "");
  loginUrl.searchParams.set("redirect", fullPath || "/");
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    /*
     * Excluye estáticos de Next y favicon; el resto pasa por la puerta si APP_PASSWORD está definida.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|ico|webp)$).*)",
  ],
};
