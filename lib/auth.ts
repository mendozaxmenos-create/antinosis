import NextAuth, { type NextAuthOptions } from "next-auth";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import Google from "next-auth/providers/google";
import AzureAD from "next-auth/providers/azure-ad";
import EmailProvider from "next-auth/providers/email";
import { prisma } from "@/lib/prisma";
import { isAdminEmailFromEnv } from "@/lib/admin-auth-config";

const providers: NextAuthOptions["providers"] = [];

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      allowDangerousEmailAccountLinking: true,
    }),
  );
}

if (process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET) {
  providers.push(
    AzureAD({
      clientId: process.env.MICROSOFT_CLIENT_ID,
      clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
    }),
  );
}

const resendKey = process.env.RESEND_API_KEY?.trim();
const emailFrom = process.env.RESEND_FROM?.trim() || process.env.AUTH_EMAIL_FROM?.trim();
if (resendKey && emailFrom) {
  providers.push(
    EmailProvider({
      from: emailFrom,
      maxAge: 15 * 60,
      sendVerificationRequest: async ({ identifier: to, url }) => {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: emailFrom,
            to,
            subject: "Tu enlace para entrar a CardSpend",
            html: `<p>Hacé clic para iniciar sesión (el enlace vence en unos minutos):</p>
<p><a href="${url}">Entrar a CardSpend</a></p>
<p>Si no pediste este correo, podés ignorarlo.</p>`,
          }),
        });
        if (!res.ok) {
          const errText = await res.text();
          throw new Error(`Resend: ${res.status} ${errText}`);
        }
      },
    }),
  );
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  secret: process.env.AUTH_SECRET,
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  providers,
  pages: { signIn: "/login" },
  callbacks: {
    async signIn({ user }) {
      if (!user.email?.trim()) {
        return false;
      }
      return true;
    },
    async jwt({ token, user, trigger }) {
      if (user?.id) {
        token.id = user.id;
        token.sub = user.id;
        const row = await prisma.user.findUnique({
          where: { id: user.id },
          select: { role: true },
        });
        token.role = row?.role ?? "user";
      }
      if (trigger === "update" && token.sub) {
        const row = await prisma.user.findUnique({
          where: { id: token.sub },
          select: { role: true },
        });
        if (row) token.role = row.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        const uid = (token.id as string) || (token.sub as string) || "";
        session.user.id = uid;
        session.user.role = (token.role as string) ?? "user";
      }
      return session;
    },
  },
  events: {
    async createUser({ user }) {
      const email = user.email?.trim().toLowerCase();
      if (!email || !user.id) return;
      const asAdmin = isAdminEmailFromEnv(email, process.env);
      await prisma.user.update({
        where: { id: user.id },
        data: {
          role: asAdmin ? "admin" : "user",
          name: user.name ?? email.split("@")[0],
        },
      });
    },
  },
};

export const authHandler = NextAuth(authOptions);

export async function auth() {
  const { getServerSession } = await import("next-auth");
  return getServerSession(authOptions);
}
