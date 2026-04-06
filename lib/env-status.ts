export type EnvCheck = {
  key: string;
  label: string;
  requiredInProduction: boolean;
  configured: boolean;
  notes?: string;
};

export function getEnvChecks(): EnvCheck[] {
  const has = (k: string) => !!process.env[k] && String(process.env[k]).trim().length > 0;

  return [
    {
      key: "DATABASE_URL",
      label: "Base de datos (PostgreSQL)",
      requiredInProduction: true,
      configured: has("DATABASE_URL"),
      notes: "Necesaria para Prisma y para el build en Vercel (db push).",
    },
    {
      key: "NEXT_PUBLIC_APP_URL",
      label: "URL pública",
      requiredInProduction: true,
      configured: has("NEXT_PUBLIC_APP_URL"),
      notes: "Se usa en links y en OAuth (Google Calendar).",
    },
    {
      key: "AUTH_SECRET",
      label: "Auth admin (secret)",
      requiredInProduction: false,
      configured: has("AUTH_SECRET"),
      notes: "Habilita login OAuth admin (NextAuth/Auth.js).",
    },
    {
      key: "ADMIN_EMAILS",
      label: "Auth admin (allowlist emails)",
      requiredInProduction: false,
      configured: has("ADMIN_EMAILS"),
      notes: "Emails separados por coma que pueden entrar como admin.",
    },
    {
      key: "APP_PASSWORD",
      label: "Puerta de acceso (opcional)",
      requiredInProduction: false,
      configured: has("APP_PASSWORD"),
      notes: "Modo legacy. Si Auth admin está configurado, se ignora.",
    },
    {
      key: "NEXT_PUBLIC_LOCALE",
      label: "Locale UI (opcional)",
      requiredInProduction: false,
      configured: has("NEXT_PUBLIC_LOCALE"),
      notes: "Default: es-AR.",
    },
    {
      key: "NEXT_PUBLIC_CURRENCY",
      label: "Moneda UI (opcional)",
      requiredInProduction: false,
      configured: has("NEXT_PUBLIC_CURRENCY"),
      notes: "Default: ARS.",
    },
    {
      key: "GOOGLE_CLIENT_ID",
      label: "Google OAuth (Calendar + login)",
      requiredInProduction: false,
      configured: has("GOOGLE_CLIENT_ID"),
    },
    {
      key: "GOOGLE_CLIENT_SECRET",
      label: "Google OAuth (Calendar + login)",
      requiredInProduction: false,
      configured: has("GOOGLE_CLIENT_SECRET"),
    },
    {
      key: "MICROSOFT_CLIENT_ID",
      label: "Microsoft OAuth (login)",
      requiredInProduction: false,
      configured: has("MICROSOFT_CLIENT_ID"),
    },
    {
      key: "MICROSOFT_CLIENT_SECRET",
      label: "Microsoft OAuth (login)",
      requiredInProduction: false,
      configured: has("MICROSOFT_CLIENT_SECRET"),
    },
    {
      key: "TELEGRAM_BOT_TOKEN",
      label: "Telegram (bot token)",
      requiredInProduction: false,
      configured: has("TELEGRAM_BOT_TOKEN"),
    },
    {
      key: "RESEND_API_KEY",
      label: "Email (Resend API key)",
      requiredInProduction: false,
      configured: has("RESEND_API_KEY"),
    },
    {
      key: "RESEND_FROM",
      label: "Email (Resend FROM)",
      requiredInProduction: false,
      configured: has("RESEND_FROM"),
    },
  ];
}

