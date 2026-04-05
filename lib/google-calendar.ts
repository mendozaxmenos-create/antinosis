import { google, calendar_v3 } from "googleapis";

function getRedirectUri(): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return `${base.replace(/\/$/, "")}/api/google-calendar/callback`;
}

export function getOAuthClient() {
  const id = process.env.GOOGLE_CLIENT_ID;
  const secret = process.env.GOOGLE_CLIENT_SECRET;
  if (!id || !secret) {
    throw new Error("Falta GOOGLE_CLIENT_ID o GOOGLE_CLIENT_SECRET en .env");
  }
  return new google.auth.OAuth2(id, secret, getRedirectUri());
}

export function getGoogleAuthUrl(state: string): string {
  const oauth2 = getOAuthClient();
  return oauth2.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    state,
    scope: [
      "https://www.googleapis.com/auth/calendar.events",
      "https://www.googleapis.com/auth/userinfo.email",
      "openid",
    ],
  });
}

export async function exchangeCodeForTokens(code: string) {
  const oauth2 = getOAuthClient();
  const { tokens } = await oauth2.getToken(code);
  oauth2.setCredentials(tokens);
  let email: string | undefined;
  if (tokens.access_token) {
    const oauth2Api = google.oauth2({ version: "v2", auth: oauth2 });
    try {
      const { data } = await oauth2Api.userinfo.get();
      email = data.email ?? undefined;
    } catch {
      /* ignore */
    }
  }
  return {
    refreshToken: tokens.refresh_token ?? null,
    email,
  };
}

export async function createPaymentDueCalendarEvent(input: {
  refreshToken: string;
  summary: string;
  description: string;
  /** Día del vencimiento (evento de día completo) */
  dueDate: Date;
  /** IANA, ej. America/Argentina/Buenos_Aires */
  timeZone?: string;
}): Promise<string | null> {
  const oauth2 = getOAuthClient();
  oauth2.setCredentials({ refresh_token: input.refreshToken });

  const cal = google.calendar({ version: "v3", auth: oauth2 });
  const tz = input.timeZone ?? "America/Argentina/Buenos_Aires";

  const start = new Date(input.dueDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  const requestBody: calendar_v3.Schema$Event = {
    summary: input.summary,
    description: input.description,
    start: {
      date: start.toISOString().slice(0, 10),
      timeZone: tz,
    },
    end: {
      date: end.toISOString().slice(0, 10),
      timeZone: tz,
    },
    reminders: {
      useDefault: false,
      overrides: [
        { method: "popup", minutes: 60 * 24 },
        { method: "popup", minutes: 60 * 3 },
      ],
    },
  };

  try {
    const res = await cal.events.insert({
      calendarId: "primary",
      requestBody,
    });
    return res.data.id ?? null;
  } catch (e) {
    console.error("[google-calendar] create event failed", e);
    return null;
  }
}

export async function deleteCalendarEvent(refreshToken: string, eventId: string): Promise<boolean> {
  const oauth2 = getOAuthClient();
  oauth2.setCredentials({ refresh_token: refreshToken });

  const cal = google.calendar({ version: "v3", auth: oauth2 });
  try {
    await cal.events.delete({ calendarId: "primary", eventId });
    return true;
  } catch (e) {
    console.error("[google-calendar] delete event failed", e);
    return false;
  }
}

export async function updatePaymentDueCalendarEvent(input: {
  refreshToken: string;
  eventId: string;
  /** Día del vencimiento (evento de día completo) */
  dueDate: Date;
  summary?: string;
  description?: string;
  /** IANA, ej. America/Argentina/Buenos_Aires */
  timeZone?: string;
}): Promise<boolean> {
  const oauth2 = getOAuthClient();
  oauth2.setCredentials({ refresh_token: input.refreshToken });

  const cal = google.calendar({ version: "v3", auth: oauth2 });
  const tz = input.timeZone ?? "America/Argentina/Buenos_Aires";

  const start = new Date(input.dueDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  const requestBody: calendar_v3.Schema$Event = {
    ...(input.summary != null ? { summary: input.summary } : {}),
    ...(input.description != null ? { description: input.description } : {}),
    start: {
      date: start.toISOString().slice(0, 10),
      timeZone: tz,
    },
    end: {
      date: end.toISOString().slice(0, 10),
      timeZone: tz,
    },
  };

  try {
    await cal.events.patch({
      calendarId: "primary",
      eventId: input.eventId,
      requestBody,
    });
    return true;
  } catch (e) {
    console.error("[google-calendar] patch event failed", e);
    return false;
  }
}
