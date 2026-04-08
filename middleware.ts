import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { APP_GATE_COOKIE, verifyAppGateToken } from "@/lib/app-gate";
import { isAppAuthEnabledFromEnv } from "@/lib/admin-auth-config";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isLogin = pathname.startsWith("/login");

  if (isAppAuthEnabledFromEnv(process.env)) {
    if (pathname.startsWith("/api/auth") || isLogin) {
      return NextResponse.next();
    }
    const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
    const token = await getToken({
      req: request,
      secret,
    });
    if (!token) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/login";
      const fullPath = pathname + (request.nextUrl.search || "");
      loginUrl.searchParams.set("redirect", fullPath || "/");
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

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
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|ico|webp)$).*)",
  ],
};
