import express from "express";
import { resolve } from "node:path";
import { app } from "./app";

// Refuse a public deployment without its private authentication/database.
for (const name of ["APP_SECRET", "APP_URL"]) {
  if (!process.env[name]) throw new Error(`Missing required configuration: ${name}`);
}
if (process.env.STORAGE_MODE !== "fly") throw new Error("Production requires Fly persistent storage.");
if (!process.env.APP_URL!.startsWith("https://")) {
  throw new Error("Production APP_URL must use HTTPS.");
}
if (process.env.APP_SECRET!.length < 32) {
  throw new Error("APP_SECRET must contain at least 32 characters.");
}

// Serve only compiled public frontend files. Campaign data and original
// artwork remain behind the authenticated API in app.ts.
// Optional canonical host: with CANONICAL_REDIRECT=1, browser page loads on any other host (e.g. *.fly.dev)
// get a 308 to APP_URL. API calls are never redirected, so scripts and health checks keep working on both hosts.
const canonical = new URL(process.env.APP_URL!);
if (process.env.CANONICAL_REDIRECT === "1") app.use((req, res, next) => {
  const host = String(req.headers.host || "").toLowerCase().split(":")[0];
  if ((req.method === "GET" || req.method === "HEAD") && host && host !== canonical.hostname && !req.path.startsWith("/api/"))
    return res.redirect(308, canonical.origin + req.originalUrl);
  next();
});
const frontend = resolve(process.cwd(), "dist");
app.use(express.static(frontend, { dotfiles: "deny", index: false }));
app.get("/", (_req, res) => res.sendFile(resolve(frontend, "index.html")));
app.use((_req, res) => res.sendStatus(404));

const port = Number(process.env.PORT || 3100);
const server = app.listen(port, "0.0.0.0", () => {
  console.log(`PH Social Manager listening on ${port}; publishing disabled.`);
});
process.on("SIGTERM", () => server.close(() => process.exit(0)));
