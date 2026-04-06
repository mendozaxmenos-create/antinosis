import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { APP_GATE_COOKIE, verifyAppGateToken } from "@/lib/app-gate";
import { isAdminAuthEnabledFromEnv } from "@/lib/admin-auth-config";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isLogin = pathname.startsWith("/login");

  // Auth por OAuth (admin) se valida en server components/actions (no Edge).
  if (isAdminAuthEnabledFromEnv(process.env)) return NextResponse.next();

  // Fallback: puerta global APP_PASSWORD (modo legacy).
  const password = process.env.APP_PASSWORD;
  if (!password) return NextResponse.next();
  if (isLogin) return NextResponse.next();

  const gateToken = request.cookies.get(APP_GATE_COOKIE)?.value;
  if (gateToken && (await verifyAppGateToken(password, gateToken))) {
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
