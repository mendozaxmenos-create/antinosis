import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getGoogleAuthUrl } from "@/lib/google-calendar";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  if (!userId) {
    return new Response("Falta userId", { status: 400 });
  }

  const state = crypto.randomUUID();
  const cookieStore = await cookies();
  const secure = process.env.NODE_ENV === "production";
  cookieStore.set("gcal_oauth_state", state, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });
  cookieStore.set("gcal_oauth_uid", userId, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });

  redirect(getGoogleAuthUrl(state));
}
