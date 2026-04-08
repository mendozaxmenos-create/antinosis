export function parseAdminEmails(raw: string | undefined): string[] {
  return (raw ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Login obligatorio: AUTH_SECRET + al menos un proveedor (Google, Microsoft y/o magic link con Resend).
 */
export function isAppAuthEnabledFromEnv(env: NodeJS.ProcessEnv = process.env): boolean {
  const hasSecret = !!env.AUTH_SECRET?.trim();
  if (!hasSecret) return false;
  const hasGoogle = !!env.GOOGLE_CLIENT_ID && !!env.GOOGLE_CLIENT_SECRET;
  const hasMicrosoft = !!env.MICROSOFT_CLIENT_ID && !!env.MICROSOFT_CLIENT_SECRET;
  const hasMagicLink =
    !!env.RESEND_API_KEY?.trim() && !!(env.RESEND_FROM?.trim() || env.AUTH_EMAIL_FROM?.trim());
  return hasGoogle || hasMicrosoft || hasMagicLink;
}

/** @deprecated Usar `isAppAuthEnabledFromEnv` — antes exigía ADMIN_EMAILS; el login ya no depende de eso. */
export function isAdminAuthEnabledFromEnv(env: NodeJS.ProcessEnv = process.env): boolean {
  return isAppAuthEnabledFromEnv(env);
}

export function isAdminEmailFromEnv(
  email: string | null | undefined,
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  if (!email) return false;
  const allow = parseAdminEmails(env.ADMIN_EMAILS);
  return allow.includes(email.trim().toLowerCase());
}

