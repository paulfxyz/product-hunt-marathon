import Database from "better-sqlite3";
import { mkdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { createHash, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import type { Request, Response } from "express";
import type { Campaign } from "../shared/schema";

export const FLY_LOCAL = process.env.STORAGE_MODE === "fly";
let database: Database.Database | undefined;
const hash = (value: string) => createHash("sha256").update(value).digest("hex");
const derive = promisify(scrypt);
export function db() {
  if (database) return database;
  const path = process.env.DB_PATH || "/data/data.db";
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  database = new Database(path);
  database.pragma("journal_mode = WAL");
  database.pragma("synchronous = FULL");
  database.exec(`CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY, value TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS sessions (hash TEXT PRIMARY KEY, expires INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS limits (key TEXT PRIMARY KEY, count INTEGER NOT NULL, until INTEGER NOT NULL);`);
  return database;
}
export function get(key: string): string | undefined {
  return (db().prepare("SELECT value FROM kv WHERE key=?").get(key) as any)?.value;
}
export function put(key: string, value: string) {
  db().prepare("INSERT INTO kv VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").run(key, value);
}
export function campaign(): Campaign {
  const current = get("campaign");
  if (current) return JSON.parse(current);
  const seed = readFileSync(resolve("data/campaign.json"), "utf8");
  put("campaign", seed);
  return JSON.parse(seed);
}
export function saveCampaign(value: Campaign, expectedRevision: number) {
  db().transaction(() => {
    if (campaign().revision !== expectedRevision) throw Object.assign(new Error("Draft changed; reload before saving."), {status:409});
    put("campaign", JSON.stringify(value));
  })();
}
function basic(req: Request) {
  const raw = req.headers.authorization || "";
  if (!raw.startsWith("Basic ")) return null;
  const value = Buffer.from(raw.slice(6), "base64").toString("utf8");
  const split = value.indexOf(":");
  if (split < 0) return null;
  return { email: value.slice(0, split), password: value.slice(split + 1) };
}
function equal(a: string, b: string) {
  return timingSafeEqual(Buffer.from(hash(a)), Buffer.from(hash(b)));
}
export function sessionToken(req: Request) {
  const bearer = req.headers.authorization?.match(/^Bearer (.+)$/)?.[1];
  return bearer || req.headers.cookie?.split(";").map(v=>v.trim()).find(v=>v.startsWith("__Host-ph_session="))?.slice(18) || "";
}
export function authenticated(req: Request) {
  const token = sessionToken(req);
  if (!token) return false;
  return !!db().prepare("SELECT hash FROM sessions WHERE hash=? AND expires>?").get(hash(token), Date.now());
}
// Canonical APP_URL plus optional APP_ALT_ORIGINS (comma-separated, exact https origins, e.g. the fly.dev fallback).
export function allowedOrigins() {
  return [process.env.APP_URL, ...(process.env.APP_ALT_ORIGINS || "").split(",")]
    .map(v => (v || "").trim().replace(/\/+$/, "")).filter(v => /^https:\/\/[a-z0-9.-]+$/.test(v) || v === process.env.APP_URL);
}
export function sameOrigin(req: Request) {
  return !req.headers.origin || allowedOrigins().includes(req.headers.origin);
}
function rateLimit(key: string, max: number) {
  const now = Date.now();
  const old = db().prepare("SELECT count, until FROM limits WHERE key=?").get(key) as any;
  const next = old && old.until > now ? {count:old.count+1, until:old.until} : {count:1, until:now+15*60_000};
  db().prepare("INSERT INTO limits VALUES (?,?,?) ON CONFLICT(key) DO UPDATE SET count=excluded.count, until=excluded.until").run(key,next.count,next.until);
  return next.count > max;
}
export async function bootstrap(req: Request, res: Response) {
  if (!sameOrigin(req)) return res.status(403).json({error:"Origin not allowed."});
  if (get("password")) return res.status(409).json({error:"Owner login is already initialized."});
  const expires = Number(process.env.BOOTSTRAP_EXPIRES || 0);
  if ((expires && Date.now() > expires) || !process.env.BOOTSTRAP_TOKEN
      || !equal(String(req.headers["x-bootstrap-token"] || req.body?.setupToken || ""),process.env.BOOTSTRAP_TOKEN))
    return res.status(403).json({error:"This setup link is invalid or expired."});
  const cred = basic(req) || {email:String(req.body?.email || ""),password:String(req.body?.password || "")};
  if (!cred || cred.email !== "owner@example.com" || cred.password.length < 16 || cred.password.length > 256)
    return res.status(400).json({error:"Use the owner email and a password of 16–256 characters."});
  const salt = randomBytes(24).toString("hex");
  const derived = (await derive(cred.password, salt, 64)) as Buffer;
  // Repeat the check after asynchronous hashing to prevent concurrent setup.
  if (get("password")) return res.status(409).json({error:"Owner login already initialized."});
  put("password", `${salt}:${derived.toString("hex")}`);
  campaign();
  return res.json({ok:true});
}
export async function login(req: Request, res: Response) {
  if (!sameOrigin(req)) return res.status(403).json({error:"Origin not allowed."});
  const ip = String(req.headers["fly-client-ip"] || req.ip || "unknown").slice(0,100);
  if (rateLimit(`login:${ip}`, 10) || rateLimit("login:global", 60))
    return res.status(429).json({error:"Too many attempts. Wait 15 minutes before trying again."});
  const credentials = basic(req) || {email:String(req.body.email||""),password:String(req.body.password||"")};
  const stored = get("password");
  if (!stored) return res.status(503).json({error:"Private sign-in is being initialized."});
  if (credentials.password.length > 256) return res.status(401).json({error:"Incorrect email or password."});
  const [salt, expected] = stored.split(":");
  const actual = await derive(credentials.password, salt, 64) as Buffer;
  if (credentials.email.toLowerCase() !== "owner@example.com" || !timingSafeEqual(actual,Buffer.from(expected,"hex")))
    return res.status(401).json({error:"Incorrect email or password."});
  db().prepare("DELETE FROM sessions WHERE expires<?").run(Date.now());
  const token = randomBytes(32).toString("hex");
  const age = 7*86400;
  db().prepare("INSERT INTO sessions VALUES (?,?)").run(hash(token),Date.now()+age*1000);
  res.setHeader("Set-Cookie",`__Host-ph_session=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${age}`);
  return res.json({token});
}
export function logout(req: Request, res: Response) {
  db().prepare("DELETE FROM sessions WHERE hash=?").run(hash(sessionToken(req)));
  res.setHeader("Set-Cookie","__Host-ph_session=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0");
  res.json({ok:true});
}
