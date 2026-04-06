export function parseAdminEmails(raw: string | undefined): string[] {
  return (raw ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminAuthEnabledFromEnv(env: NodeJS.ProcessEnv = process.env): boolean {
  const adminEmails = parseAdminEmails(env.ADMIN_EMAILS);
  const hasSecret = !!env.AUTH_SECRET && env.AUTH_SECRET.trim().length > 0;
  const hasGoogle = !!env.GOOGLE_CLIENT_ID && !!env.GOOGLE_CLIENT_SECRET;
  const hasMicrosoft = !!env.MICROSOFT_CLIENT_ID && !!env.MICROSOFT_CLIENT_SECRET;
  return adminEmails.length > 0 && hasSecret && (hasGoogle || hasMicrosoft);
}

export function isAdminEmailFromEnv(
  email: string | null | undefined,
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  if (!email) return false;
  const allow = parseAdminEmails(env.ADMIN_EMAILS);
  return allow.includes(email.trim().toLowerCase());
}

