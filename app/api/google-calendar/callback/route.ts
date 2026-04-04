import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { exchangeCodeForTokens } from "@/lib/google-calendar";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const oauthError = searchParams.get("error");

  if (oauthError) {
    return redirect(`/imports?calendar=${encodeURIComponent(oauthError)}`);
  }

  const cookieStore = await cookies();
  const expectedState = cookieStore.get("gcal_oauth_state")?.value;
  const userId = cookieStore.get("gcal_oauth_uid")?.value;
  cookieStore.delete("gcal_oauth_state");
  cookieStore.delete("gcal_oauth_uid");

  if (!code || !state || !expectedState || state !== expectedState || !userId) {
    return redirect("/imports?calendar=invalid");
  }

  let refreshToken: string | null = null;
  let email: string | undefined;
  try {
    const tokens = await exchangeCodeForTokens(code);
    refreshToken = tokens.refreshToken;
    email = tokens.email;
  } catch (e) {
    console.error("[google-calendar] token exchange", e);
    return redirect("/imports?calendar=token_error");
  }

  if (!refreshToken) {
    return redirect("/imports?calendar=no_refresh");
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      googleRefreshToken: refreshToken,
      googleCalendarEmail: email ?? null,
    },
  });

  return redirect("/imports?calendar=connected");
}
