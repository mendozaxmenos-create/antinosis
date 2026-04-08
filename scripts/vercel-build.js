/**
 * Build de producción en Vercel: aplica el esquema Prisma a Neon antes de generar el cliente y compilar Next.
 * En local (`npm run build`) no corre `db push` — usá `npm run db:push` cuando cambies el modelo.
 */
const { execSync } = require("child_process");

function run(cmd) {
  execSync(cmd, { stdio: "inherit", env: process.env });
}

function sleepSync(seconds) {
  try {
    if (process.platform === "win32") {
      execSync(`powershell -NoProfile -Command "Start-Sleep -Seconds ${seconds}"`, { stdio: "ignore" });
    } else {
      execSync(`sleep ${seconds}`, { stdio: "ignore" });
    }
  } catch {
    /* ignore */
  }
}

/** En Windows a veces falla EPERM al renombrar el query engine (AV u otro proceso con el .dll). Reintentar ayuda. */
function runPrismaGenerate() {
  const max = 5;
  let lastErr;
  for (let attempt = 1; attempt <= max; attempt++) {
    try {
      run("npx prisma generate");
      return;
    } catch (e) {
      lastErr = e;
      if (attempt < max) {
        console.warn(
          `[build] prisma generate falló (intento ${attempt}/${max}). Si estás en Windows: cerrá \`npm run dev\`, Prisma Studio y probá de nuevo. Reintentando en 2s…`,
        );
        sleepSync(2);
      }
    }
  }
  throw lastErr;
}

if (process.env.VERCEL === "1") {
  if (!process.env.DATABASE_URL) {
    console.error("[build] Vercel: falta DATABASE_URL; configurá la variable en el proyecto.");
    process.exit(1);
  }
  console.log("[build] prisma db push (esquema automático en deploy)…");
  run("npx prisma db push");
}

runPrismaGenerate();
run("npx next build");
