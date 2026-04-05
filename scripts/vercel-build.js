/**
 * Build de producción en Vercel: aplica el esquema Prisma a Neon antes de generar el cliente y compilar Next.
 * En local (`npm run build`) no corre `db push` — usá `npm run db:push` cuando cambies el modelo.
 */
const { execSync } = require("child_process");

function run(cmd) {
  execSync(cmd, { stdio: "inherit", env: process.env });
}

if (process.env.VERCEL === "1") {
  if (!process.env.DATABASE_URL) {
    console.error("[build] Vercel: falta DATABASE_URL; configurá la variable en el proyecto.");
    process.exit(1);
  }
  console.log("[build] prisma db push (esquema automático en deploy)…");
  run("npx prisma db push");
}

run("npx prisma generate");
run("npx next build");
