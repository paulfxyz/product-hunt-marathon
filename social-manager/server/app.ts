import express from "express";
import { createClient } from "@supabase/supabase-js";
import {
  randomBytes,
  createCipheriv,
  createDecipheriv,
  createHash,
} from "node:crypto";
import { readFile, writeFile, mkdir, rename, stat } from "node:fs/promises";
import { resolve } from "node:path";
import { patchSchema, draftIssueMessage, previewProfileSchema, defaultProfile, type Campaign, type Post } from "../shared/schema";
import { utcTime, warnings, validPublicationUrl, publicationFromBlotato, queued, BLOTATO_MAX_THREAD } from "../shared/rules";
import * as fly from "./fly-store";
import { assetDelivery } from "../shared/media";

export const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "750kb" }));
app.use((_req, res, next) => {
  res.setHeader("Cache-Control", "private, no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("X-Robots-Tag", "noindex, nofollow");
  next();
});
const PREVIEW = process.env.DEV_PREVIEW === "true"
  && !process.env.VERCEL
  && !process.env.FLY_APP_NAME
  && process.env.NODE_ENV !== "production";
// Private preview is mounted behind Computer's authenticated preview proxy.
// Production uses same-origin requests and has no preview-token endpoint.
if (PREVIEW) app.use((req,res,next)=>{
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Headers','Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods','GET, POST, PUT, PATCH, OPTIONS');
  if(req.method==='OPTIONS'){res.sendStatus(204);return}
  next();
});
const previewToken = randomBytes(32).toString("hex");
const root = process.cwd();
const graphicsRevisions: Record<string,string> = JSON.parse(
  await readFile(resolve(root,"data/graphics-revisions.json"),"utf8").catch(()=>"{}"),
);
const allowedEmail = "owner@example.com";
const supabase = () => {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY)
    throw new Error(
      "Private sign-in is not configured yet. The workspace is locked.",
    );
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
};
function authedClient(token: string) {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
}
app.get("/api/session", (req, res) =>
  res.json(
    PREVIEW ? { previewToken, mode: "private-preview" } : fly.FLY_LOCAL
      ? {mode:"password", authenticated:fly.authenticated(req)}
      : { mode: "private" },
  ),
);
app.get("/api/health", (_req, res) =>
  res.json({ ok: true, publishingEnabled: true }),
);
const attempts = new Map<string, { count: number; at: number }>();
if (fly.FLY_LOCAL) {
  app.post("/api/bootstrap", fly.bootstrap);
  app.post("/api/auth/password", fly.login);
}
app.post("/api/auth/start", async (req, res) => {
  try {
    const email = String(req.body.email || "")
      .trim()
      .toLowerCase();
    if (email !== allowedEmail) {
      res
        .status(403)
        .json({ error: "This workspace is restricted to the owner’s email." });
      return;
    }
    const k = email,
      prev = attempts.get(k);
    if (prev && Date.now() - prev.at < 60000) {
      res
        .status(429)
        .json({
          error: "Please wait a minute before requesting another email.",
        });
      return;
    }
    attempts.set(k, { count: 1, at: Date.now() });
    // A configured deployment URL, never a user-controlled redirect.
    const redirect =
      process.env.APP_URL ||
      (process.env.VERCEL_PROJECT_PRODUCTION_URL
        ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
        : "http://localhost:3100");
    const { error } = await supabase().auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true, emailRedirectTo: redirect },
    });
    if (error) throw error;
    res.json({ ok: true });
  } catch (e: any) {
    res
      .status(503)
      .json({
        error: e.message.includes("configured")
          ? e.message
          : "Sign-in email could not be sent. Check the authentication provider’s email setup.",
      });
  }
});
app.post("/api/auth/verify", async (req, res) => {
  try {
    const email = String(req.body.email || "")
      .toLowerCase()
      .trim();
    if (email !== allowedEmail) throw new Error("Not allowed");
    const { data, error } = await supabase().auth.verifyOtp({
      email,
      token: String(req.body.code || ""),
      type: "email",
    });
    if (error || !data.session) throw new Error("Invalid code");
    res.json({ token: data.session.access_token });
  } catch {
    res
      .status(401)
      .json({
        error:
          "That code is invalid or expired. Request a fresh sign-in email.",
      });
  }
});
app.use("/api", async (req, res, next) => {
  if (fly.FLY_LOCAL) {
    if (!fly.authenticated(req)) {res.status(401).json({error:"Sign in to open this private workspace."});return;}
    if (!["GET","HEAD","OPTIONS"].includes(req.method) && !fly.sameOrigin(req)) {
      res.status(403).json({error:"Origin not allowed."});return;
    }
    res.locals.token = fly.sessionToken(req);
    next();return;
  }
  const token = req.headers.authorization?.replace(/^Bearer /, "") || "";
  if (PREVIEW && token === previewToken) {
    res.locals.token = token;
    next();
    return;
  }
  if (!token) {
    res.status(401).json({ error: "Sign in to open this private workspace." });
    return;
  }
  try {
    const { data, error } = await supabase().auth.getUser(token);
    if (
      error ||
      data.user?.email?.toLowerCase() !== allowedEmail ||
      !data.user.email_confirmed_at
    )
      throw new Error();
    res.locals.token = token;
    next();
  } catch {
    res
      .status(401)
      .json({ error: "Your session has expired. Sign in again to continue." });
  }
});
if (fly.FLY_LOCAL) app.post("/api/auth/logout", fly.logout);
async function localData(): Promise<Campaign> {
  try {
    return JSON.parse(
      await readFile(resolve(root, "runtime/campaign.json"), "utf8"),
    );
  } catch {
    return JSON.parse(
      await readFile(resolve(root, "data/campaign.json"), "utf8"),
    );
  }
}
async function getData(token: string): Promise<Campaign> {
  if (fly.FLY_LOCAL) return fly.campaign();
  if (PREVIEW) return localData();
  const { data, error } = await authedClient(token)
    .from("campaigns")
    .select("data,revision")
    .eq("id", "weekathon")
    .single();
  if (error)
    throw new Error(
      "The campaign database is not available. Your draft has not been changed.",
    );
  return { ...data.data, revision: data.revision };
}
let lock = Promise.resolve();
async function savePost(token: string, id: string, input: any): Promise<Post> {
  // The local preview is serialized. Production uses an atomic database RPC.
  const parsed = patchSchema.parse(input);
  const campaign = await getData(token);
  const old = campaign.posts.find((p) => p.id === id);
  if (!old) throw Object.assign(new Error("Post not found."), { status: 404 });
  if (old.version !== parsed.version)
    throw Object.assign(
      new Error(
        "This draft changed in another tab. Close and reload before editing again; your unsaved text is still here.",
      ),
      { status: 409 },
    );
  if (parsed.media.some((id) => !campaign.assets.some((a) => a.id === id)))
    throw new Error("Unknown artwork selected.");
  if (
    parsed.status === "published-manually" &&
    old.status !== "published-manually"
  )
    throw new Error("Use the explicit publication confirmation action.");
  const scheduledAt = utcTime(parsed.date, parsed.time);
  const now = new Date().toISOString();
  const changed =
    JSON.stringify([old.content, old.date, old.time, old.media]) !==
    JSON.stringify([parsed.content, parsed.date, parsed.time, parsed.media]);
  if (queued(old) && (changed || parsed.status !== old.status))
    throw Object.assign(new Error("This post was queued in Blotato, which is retired. Choose Needs changes first to clear the old queue entry (nothing is sent to Blotato), then you can edit."), { status: 409 });
  if (["twitter","linkedin"].includes(old.platform) && parsed.status === "ready" && old.status !== "ready")
    throw new Error("Use Validate as ready to mark an X or LinkedIn post ready.");
  const next: Post = {
    ...old,
    ...parsed,
    scheduledAt,
    updatedAt: now,
    validatedAt: changed ? undefined : old.validatedAt,
    version: old.version + 1,
    status:
      changed && ["ready", "copy-approved"].includes(parsed.status)
        ? "revision"
        : parsed.status,
    history: [
      ...old.history,
      {
        at: old.updatedAt,
        content: old.content,
        notes: old.notes,
        date: old.date,
        time: old.time,
        status: old.status,
        media: old.media,
        validatedAt:old.validatedAt,
        publication:old.publication,
      },
    ].slice(-30),
  };
  if(next.status!=="ready")next.validatedAt=undefined;
  if(next.status==="ready" && old.status!=="ready" && !changed) next.validatedAt=now;
  if (next.status === "ready" && warnings(next).length)
    throw new Error(
      "Resolve the copy warnings before marking this ready for review.",
    );
  if (fly.FLY_LOCAL) {
    const revision = campaign.revision;
    campaign.posts = campaign.posts.map((p) => (p.id === id ? next : p));
    campaign.revision++;
    campaign.updatedAt = now;
    fly.saveCampaign(campaign, revision);
  } else if (PREVIEW) {
    campaign.posts = campaign.posts.map((p) => (p.id === id ? next : p));
    campaign.revision++;
    campaign.updatedAt = now;
    await mkdir(resolve(root, "runtime"), { recursive: true });
    await writeFile(
      resolve(root, "runtime/campaign.tmp"),
      JSON.stringify(campaign),
    );
    await rename(
      resolve(root, "runtime/campaign.tmp"),
      resolve(root, "runtime/campaign.json"),
    );
  } else {
    const { data, error } = await authedClient(token).rpc(
      "update_campaign_post",
      { post_id: id, expected_version: old.version, new_post: next },
    );
    if (error || !data)
      throw Object.assign(
        new Error(
          "Save conflicted or failed. Keep your edits and reload the latest draft before trying again.",
        ),
        { status: 409 },
      );
  }
  return next;
}
app.post("/api/blotato/sync", (_req, res) => { res.json({ posts: [], checked: 0, errors: [] }); });
app.all(["/api/blotato", "/api/blotato/published", "/api/blotato/key", "/api/posts/:id/blotato", "/api/posts/:id/published-blotato"], (_req, res) => { res.status(410).json({ error: "Blotato is retired. Posts are published manually." }); });
app.get("/api/campaign", async (_req, res) => {
  try {
    const campaign=await getData(res.locals.token);
    // Deployed artwork metadata is separate from owner-edited copy and notes.
    res.json({...campaign,assets:campaign.assets.map(asset=>({
      ...asset,revision:graphicsRevisions[asset.id],
    }))});
  } catch (e: any) {
    res.status(503).json({ error: e.message });
  }
});
app.patch("/api/posts/:id", async (req, res) => {
  const task = lock.then(() =>
    savePost(res.locals.token, String(req.params.id), req.body),
  );
  lock = task.then(
    () => {},
    () => {},
  );
  try {
    res.json(await task);
  } catch (e: any) {
    res
      .status(e.status || 400)
      .json({
        error: e.issues
          ? draftIssueMessage(e.issues, req.body)
          : e.message,
      });
  }
});
async function writeCampaign(token:string, campaign:Campaign, previousRevision:number) {
  if(fly.FLY_LOCAL) {fly.saveCampaign(campaign,previousRevision);return;}
  if(PREVIEW) {
    await mkdir(resolve(root,"runtime"),{recursive:true});
    await writeFile(resolve(root,"runtime/campaign.tmp"),JSON.stringify(campaign));
    await rename(resolve(root,"runtime/campaign.tmp"),resolve(root,"runtime/campaign.json"));
    return;
  }
  throw new Error("This workflow requires the Fly deployment.");
}
async function editMetadata(token:string,id:string,version:number|undefined,edit:(p:Post)=>Post) {
  const task=lock.then(async()=>{
    const c=await getData(token),old=c.posts.find(p=>p.id===id);
    if(!old) throw Object.assign(new Error("Post not found."),{status:404});
    if(version!==undefined && old.version!==version) throw Object.assign(new Error("This draft changed. Reload before confirming its status."),{status:409});
    const updated=edit(structuredClone(old));
    updated.version=old.version+1;updated.updatedAt=new Date().toISOString();
    updated.history=[...old.history,{at:old.updatedAt,content:old.content,notes:old.notes,date:old.date,time:old.time,
      status:old.status,media:old.media,validatedAt:old.validatedAt,publication:old.publication}].slice(-30);
    c.posts=c.posts.map(p=>p.id===id?updated:p);
    const previous=c.revision;c.revision++;c.updatedAt=updated.updatedAt;
    await writeCampaign(token,c,previous);return updated;
  });
  lock=task.then(()=>{},()=>{});
  return task;
}
app.post("/api/posts/:id/workflow",async(req,res)=>{
  try {
    const {version,action,url=""}=req.body;
    if(!Number.isInteger(version) || !["validate","revise","confirm-published","undo-manual"].includes(action))
      throw new Error("Invalid workflow action.");
    const id=String(req.params.id),cur=(await getData(res.locals.token)).posts.find(p=>p.id===id);
    if(!cur)throw Object.assign(new Error("Post not found."),{status:404});
    if(cur.version!==version)throw Object.assign(new Error("This draft changed. Reload before confirming its status."),{status:409});
    const social=["twitter","linkedin"].includes(cur.platform);
    const post=await editMetadata(res.locals.token,id,version,p=>{
      if(social&&["validate","revise"].includes(action)&&p.publication?.state==="published")throw new Error("This post is already published.");
      if(action==="validate") {
        const issues=warnings(p);if(issues.length) throw new Error("Resolve the copy warnings before validating: "+issues.join(" "));
        p.status="ready";p.validatedAt=new Date().toISOString();
      } else if(action==="revise") {p.status="revision";p.validatedAt=undefined;if(queued(p))p.publication=undefined;}
      else if(action==="confirm-published") {
        if(typeof url!=="string" || url.length>2000 || !validPublicationUrl(p.platform,url)) throw new Error("Enter the real HTTPS publication URL for this platform.");
        p.publication={source:"manual",state:"published",url,confirmedAt:new Date().toISOString()};
      } else {
        if(p.publication?.source!=="manual" && p.status!=="published-manually") throw new Error("Only a manual publication confirmation can be undone.");
        p.publication=undefined;if(p.status==="published-manually")p.status="revision";
      }
      return p;
    });
    res.json(post);
  } catch(e:any){res.status(e.status||400).json({error:e.message});}
});
app.get("/api/profile",async(_req,res)=>{
  try {
    const raw=fly.FLY_LOCAL?fly.get("preview-profile"):PREVIEW?await readFile(resolve(root,"runtime/profile.json"),"utf8").catch(()=>""):undefined;
    res.json(raw?previewProfileSchema.parse(JSON.parse(raw)):defaultProfile);
  }catch{res.json(defaultProfile);}
});
app.put("/api/profile",async(req,res)=>{
  try {
    const p=previewProfileSchema.parse(req.body);
    if(p.avatarDataUrl) {
      const match=p.avatarDataUrl.match(/^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/);
      if(!match)throw new Error("Choose a PNG, JPEG or WebP portrait.");
      const bytes=Buffer.from(match[2],"base64");
      const valid=(match[1]==="png"&&bytes.subarray(0,8).toString("hex")==="89504e470d0a1a0a")||
        (match[1]==="jpeg"&&bytes.subarray(0,3).toString("hex")==="ffd8ff")||
        (match[1]==="webp"&&bytes.subarray(0,4).toString()==="RIFF"&&bytes.subarray(8,12).toString()==="WEBP");
      if(!valid||bytes.length>300000)throw new Error("Use a valid portrait under 300 KB.");
    }
    if(fly.FLY_LOCAL)fly.put("preview-profile",JSON.stringify(p));
    else if(PREVIEW){await mkdir(resolve(root,"runtime"),{recursive:true});await writeFile(resolve(root,"runtime/profile.json"),JSON.stringify(p));}
    else throw new Error("Profile settings require the Fly deployment.");
    res.json(p);
  }catch(e:any){res.status(400).json({error:e.issues?"Check the profile fields.":e.message});}
});
// data/campaign.json is ~10 MB. Parsing it on every artwork request ran the 512 MB machine out of heap
// (exit 134) as soon as a Product Hunt kit fetched several files at once. Parse once, reload only when the file changes.
let manifestCache:{mtime:number;assets:Map<string,Campaign["assets"][number]>}|undefined,manifestLoading:Promise<any>|undefined;
async function assetManifest(){
  const file=resolve(root,"data/campaign.json"),mtime=(await stat(file)).mtimeMs;
  if(manifestCache?.mtime===mtime)return manifestCache.assets;
  manifestLoading??=readFile(file,"utf8").then(t=>{const assets=new Map((JSON.parse(t) as Campaign).assets.map(a=>[a.id,a]));manifestCache={mtime,assets};return assets;}).finally(()=>{manifestLoading=undefined;});
  return manifestLoading;
}
app.get("/api/assets/:id", async (req, res) => {
  try {
    const asset = (await assetManifest()).get(req.params.id);
    if (!asset) {
      res.status(404).json({ error: "Asset not found." });
      return;
    }
    // Only manifest paths, never user-supplied paths.
    const delivery=assetDelivery(asset.file,req.query.download==="1",req.query.poster==="1");
    const selectedFile=delivery.file;
    const file = resolve(root, "private-assets", selectedFile);
    if (!file.startsWith(resolve(root, "private-assets") + "/"))
      throw new Error();
    if (delivery.type === "video/mp4") {
      // sendFile gives <video> what it needs: Content-Length, Accept-Ranges and 206 partial responses.
      await new Promise<void>((ok, fail) => res.type("video/mp4").sendFile(file, { acceptRanges: true }, (err) => err ? fail(err) : ok()));
      return;
    }
    res
      .type(delivery.type)
      .send(await readFile(file));
  } catch {
    if (res.headersSent) return;
    res.status(404).json({ error: "Artwork unavailable." });
  }
});
function encryptionKey() {
  if (!process.env.APP_SECRET)
    throw new Error("Server encryption is not configured.");
  return createHash("sha256").update(process.env.APP_SECRET).digest();
}
function encrypt(value: string) {
  const iv = randomBytes(12),
    c = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const body = Buffer.concat([c.update(value, "utf8"), c.final()]);
  return [iv, c.getAuthTag(), body].map((x) => x.toString("base64")).join(".");
}
function decrypt(value: string) {
  const [iv, tag, body] = value.split(".").map((x) => Buffer.from(x, "base64"));
  const c = createDecipheriv("aes-256-gcm", encryptionKey(), iv);
  c.setAuthTag(tag);
  return Buffer.concat([c.update(body), c.final()]).toString("utf8");
}
async function apiKey(token: string) {
  if (process.env.BLOTATO_API_KEY) return process.env.BLOTATO_API_KEY;
  if (fly.FLY_LOCAL) {
    const stored = fly.get("blotato");
    return stored ? decrypt(stored) : "";
  }
  if (PREVIEW) return "";
  const { data, error } = await authedClient(token)
    .from("integrations")
    .select("encrypted_key")
    .eq("id", "blotato")
    .maybeSingle();
  if (error) throw new Error("Could not read the connection configuration.");
  return data ? decrypt(data.encrypted_key) : "";
}
// Weekathon posts go to exactly two accounts: X @paulfxyz and Paul's personal LinkedIn.
// Selected by handle/name, not hard-coded IDs, so a key from another Blotato account works.
const BLOTATO_X_USERNAME = (process.env.BLOTATO_X_USERNAME || "paulfxyz").toLowerCase();
const BLOTATO_LINKEDIN_NAME = (process.env.BLOTATO_LINKEDIN_NAME || "Paul Fleury").toLowerCase();
export function selectBlotatoAccounts(items: any[]) {
  const list = Array.isArray(items) ? items : [];
  const x = list.filter((a: any) => a.platform === "twitter" && String(a.username || "").replace(/^@/, "").toLowerCase() === BLOTATO_X_USERNAME);
  const linkedin = list.filter((a: any) => a.platform === "linkedin");
  const named = linkedin.filter((a: any) => String(a.fullname || "").trim().toLowerCase() === BLOTATO_LINKEDIN_NAME);
  const li = named.length ? named : linkedin.length === 1 ? linkedin : [];
  return { twitter: x.length === 1 ? x[0] : undefined, linkedin: li.length === 1 ? li[0] : undefined };
}
async function blotato(path: string, key: string) {
  // Private Computer preview uses the configured credential proxy. Never inspect its key.
  const proxyUrl = process.env.CUSTOM_CRED_BACKEND_BLOTATO_COM_URL;
  const proxyAuth = process.env.CUSTOM_CRED_BACKEND_BLOTATO_COM_PROXY_AUTH_KEY;
  if (PREVIEW && !key && proxyUrl && proxyAuth) {
    const r = await fetch(`${proxyUrl.replace(/\/$/, "")}/v2${path}`, {
      headers: { "x-api-key": proxyAuth },
      signal: AbortSignal.timeout(20000),
    });
    if (!r.ok) throw new Error(`Blotato connection returned ${r.status}.`);
    return r.json();
  }
  if (!key) throw new Error("Blotato is not configured on this host yet.");
  const r = await fetch(`https://backend.blotato.com/v2${path}`, {
    headers: { "blotato-api-key": key },
    signal: AbortSignal.timeout(20000),
  });
  if (!r.ok)
    throw new Error(
      `Blotato returned ${r.status}. Check the key and account connection.`,
    );
  return r.json();
}
async function blotatoSend(path:string,key:string,method:string,body?:unknown) {
  if (!key) throw new Error("Blotato is not configured on this host yet.");
  const r=await fetch(`https://backend.blotato.com/v2${path}`,{method,headers:{"blotato-api-key":key,"Content-Type":"application/json"},
    body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(40000)});
  const text=await r.text();
  if(!r.ok){let msg=text.slice(0,300);try{const j=JSON.parse(text);msg=j.message||j.error||msg;}catch{}
    throw new Error(`Blotato returned ${r.status}: ${msg}`);}
  return text?JSON.parse(text):{};
}
async function uploadToBlotato(key:string,file:string) {
  const type=file.endsWith(".gif")?"image/gif":file.endsWith(".png")?"image/png":file.endsWith(".mp4")?"video/mp4":"";
  if(!type)throw new Error("Unsupported artwork format for Blotato.");
  const path=resolve(root,"private-assets",file);
  if(!path.startsWith(resolve(root,"private-assets")+"/"))throw new Error("Invalid artwork path.");
  const u=await blotatoSend("/media/uploads",key,"POST",{filename:file.split("/").pop()});
  const r=await fetch(u.presignedUrl,{method:"PUT",headers:{"Content-Type":type},body:await readFile(path),signal:AbortSignal.timeout(60000)});
  if(!r.ok)throw new Error(`Artwork upload to Blotato failed (${r.status}).`);
  return String(u.publicUrl);
}
/** Find the Blotato schedule (queue entry) for a draft: same account, time and first-post text. */
async function findSchedule(key:string,accountId:string,scheduledAt:string,text:string) {
  let cursor="";
  for(let page=0;page<6;page++){
    const r=await blotatoSend(`/schedules?limit=50${cursor?`&cursor=${encodeURIComponent(cursor)}`:""}`,key,"GET");
    const hit=(r.items||[]).find((i:any)=>String(i.account?.id??i.draft?.accountId??"")===accountId
      &&Date.parse(i.scheduledAt)===Date.parse(scheduledAt)&&i.draft?.content?.text===text);
    if(hit)return String(hit.id);
    if(!r.cursor)return undefined;cursor=r.cursor;
  }
  return undefined;
}
async function blotatoAccount(key:string,platform:string) {
  const chosen=selectBlotatoAccounts((await blotato("/users/me/accounts",key)).items) as any;
  const a=chosen[platform];if(!a)throw new Error(platform==="twitter"?"X account @paulfxyz is not connected in Blotato.":"Paul Fleury's LinkedIn is not connected in Blotato.");
  return String(a.id);
}
/** Confirm = queue in Blotato at the post's saved time. Never publishes immediately. */
async function queueInBlotato(token:string,p:Post):Promise<NonNullable<Post["publication"]>> {
  if(p.publication?.state==="published")throw new Error("This post is already published.");
  if(queued(p))throw new Error("This post is already queued in Blotato.");
  const issues=warnings(p);if(issues.length)throw new Error("Resolve the copy warnings before confirming: "+issues.join(" "));
  if(p.platform==="twitter"&&p.content.length>BLOTATO_MAX_THREAD)throw new Error(`Blotato accepts at most ${BLOTATO_MAX_THREAD} X posts per thread; this one has ${p.content.length}.`);
  if(Date.parse(p.scheduledAt)<Date.now()+5*60000)throw new Error("The saved time is less than 5 minutes away or already past. Change the date or time first; Confirm never publishes immediately.");
  const key=await apiKey(token),accountId=await blotatoAccount(key,p.platform);
  const manifest={assets:[...(await assetManifest()).values()]};
  const mediaUrls:string[]=[];
  for(const id of p.media){const a=manifest.assets.find(a=>a.id===id);if(!a)throw new Error("Unknown artwork selected.");mediaUrls.push(await uploadToBlotato(key,a.file));}
  const content:any={text:p.content[0],mediaUrls,platform:p.platform};
  if(p.platform==="twitter"&&p.content.length>1)content.additionalPosts=p.content.slice(1).map(text=>({text,mediaUrls:[]}));
  const scheduledTime=new Date(p.scheduledAt).toISOString();
  const r=await blotatoSend("/posts",key,"POST",{post:{accountId,content,target:{targetType:p.platform}},scheduledTime});
  if(!r.postSubmissionId)throw new Error("Blotato did not return a submission ID.");
  const scheduleId=await findSchedule(key,accountId,scheduledTime,p.content[0]).catch(()=>undefined);
  return {source:"blotato",state:"scheduled",submissionId:String(r.postSubmissionId),scheduleId,
    scheduledTime:r.scheduledTime||scheduledTime,checkedAt:new Date().toISOString()};
}
async function unqueueInBlotato(token:string,p:Post) {
  const key=await apiKey(token),sid=p.publication?.submissionId;
  let id=p.publication?.scheduleId;
  if(!id){const accountId=await blotatoAccount(key,p.platform);id=await findSchedule(key,accountId,p.publication?.scheduledTime||p.scheduledAt,p.content[0]);}
  if(!id){
    const s=sid?await blotato(`/posts/${encodeURIComponent(sid)}`,key).catch(()=>null):null;
    if(s?.status==="published")throw new Error("Blotato has already published this post.");
    throw new Error("Couldn't find this post in the Blotato queue, so nothing was changed. Check Blotato directly.");
  }
  await blotatoSend(`/schedules/${encodeURIComponent(id)}`,key,"DELETE");
}
const lastPublicationCheck=new Map<string,number>();
async function recentPublished(token:string,platform:string) {
  if(!["twitter","linkedin"].includes(platform))throw new Error("Choose X or LinkedIn.");
  const key=await apiKey(token);
  const params=new URLSearchParams({status:"published",platform,limit:"50",
    since:new Date(Date.now()-90*86400000).toISOString(),until:new Date().toISOString()});
  const data=await blotato(`/posts?${params}`,key);
  return {items:(data.items||[]).filter((p:any)=>p.platform===platform&&p.state?.type==="published").map((p:any)=>({
    id:String(p.id),platform,text:String(p.text||"").slice(0,4000),postTime:p.postTime,
    url:p.state.postUrl&&validPublicationUrl(platform,p.state.postUrl)?p.state.postUrl:undefined,
  })),hasMore:!!data.cursor};
}
app.get("/api/blotato/published",async(req,res)=>{
  try {res.json(await recentPublished(res.locals.token,String(req.query.platform)));}
  catch(e:any){res.status(400).json({error:e.message});}
});
app.post("/api/posts/:id/published-blotato",async(req,res)=>{
  try {
    const {version,publishedPostId}=req.body;
    if(!Number.isInteger(version)||typeof publishedPostId!=="string"||!/^[A-Za-z0-9_-]{1,128}$/.test(publishedPostId))throw new Error("Select a published Blotato post.");
    const c=await getData(res.locals.token),p=c.posts.find(p=>p.id===String(req.params.id));
    if(!p)throw new Error("Post not found.");
    if(p.publication?.state==="published")throw new Error("This post already has a confirmed publication.");
    const result=await recentPublished(res.locals.token,p.platform);
    const match=result.items.find((p:any)=>p.id===publishedPostId);
    if(!match)throw new Error("Blotato did not confirm that published post. Refresh the list.");
    const post=await editMetadata(res.locals.token,p.id,version,current=>({
      ...current,publication:{source:"blotato",state:"published",publishedPostId:match.id,url:match.url,
        checkedAt:new Date().toISOString(),confirmedAt:new Date().toISOString()}
    }));
    res.json(post);
  }catch(e:any){res.status(e.status||400).json({error:e.message});}
});
app.post("/api/posts/:id/blotato",async(req,res)=>{
  try {
    const {version,submissionId}=req.body;
    if(!Number.isInteger(version)||typeof submissionId!=="string"||!/^[A-Za-z0-9_-]{8,128}$/.test(submissionId))
      throw new Error("Paste the original Blotato postSubmissionId, not a schedule ID or a post URL.");
    const c=await getData(res.locals.token),p=c.posts.find(p=>p.id===String(req.params.id));
    if(!p||!["twitter","linkedin"].includes(p.platform))throw new Error("Blotato tracking is for X and LinkedIn posts.");
    if(p.publication?.state==="published")throw new Error("This post already has a confirmed publication.");
    const key=await apiKey(res.locals.token);
    const remote=await blotato(`/posts/${encodeURIComponent(submissionId)}`,key);
    const publication={...publicationFromBlotato(p,submissionId,remote),scheduleId:p.publication?.submissionId===submissionId?p.publication.scheduleId:undefined};
    const updated=await editMetadata(res.locals.token,p.id,version,p=>({...p,publication}));
    lastPublicationCheck.set(submissionId,Date.now());
    res.json(updated);
  }catch(e:any){res.status(e.status||400).json({error:e.message});}
});
app.post("/api/blotato/sync",async(req,res)=>{
  try {
    const c=await getData(res.locals.token);
    const pending=c.posts.filter(p=>p.publication?.source==="blotato"&&p.publication.submissionId&&
      !["published","failed"].includes(p.publication.state)&&(!req.body.postId||p.id===req.body.postId))
      .sort((a,b)=>(lastPublicationCheck.get(a.publication!.submissionId!)||0)-(lastPublicationCheck.get(b.publication!.submissionId!)||0)).slice(0,10);
    if(!pending.length){res.json({posts:[],checked:0,errors:[]});return;}
    const key=await apiKey(res.locals.token),posts:Post[]=[],errors:string[]=[];
    let checked=0;
    for(const p of pending) {
      const id=p.publication!.submissionId!;
      if(Date.now()-(lastPublicationCheck.get(id)||0)<30000)continue;
      lastPublicationCheck.set(id,Date.now());
      try {
        const result=await blotato(`/posts/${encodeURIComponent(id)}`,key);
        const publication={...publicationFromBlotato(p,id,result),scheduleId:p.publication!.scheduleId};checked++;
        if(["state","url","error","scheduledTime"].every(k=>(publication as any)[k]===(p.publication as any)[k]))continue;
        const updated=await editMetadata(res.locals.token,p.id,undefined,current=>{
          if(current.publication?.submissionId!==id)throw new Error("The linked submission changed; refresh before checking again.");
          current.publication=publication;return current;
        });
        posts.push(updated);
      }catch(e:any){errors.push(`${p.project}: ${e.message}`);}
    }
    res.json({posts,checked,errors});
  }catch(e:any){res.status(400).json({error:e.message});}
});
app.get("/api/blotato", async (_req, res) => {
  try {
    const key = await apiKey(res.locals.token);
    if (!key && !PREVIEW) {
      res.json({ connected: false, publishingEnabled: false });
      return;
    }
    const accounts = await blotato("/users/me/accounts", key);
    let count: number | null = null,
      queueError = "";
    try {
      const queue = await blotato("/schedules", key);
      count = queue.count ?? queue.items?.length ?? 0;
    } catch {
      queueError = "Accounts connected; queue could not be read.";
    }
    const chosen = selectBlotatoAccounts(accounts.items);
    res.json({
      connected: true,
      accounts: [chosen.twitter, chosen.linkedin]
        .filter(Boolean)
        .map((a: any) => ({
          id: a.id,
          platform: a.platform,
          username: a.username,
          fullname: a.fullname,
        })),
      count,
      queueError,
      checkedAt: new Date().toISOString(),
      publishingEnabled: false,
    });
  } catch (e: any) {
    res
      .status(502)
      .json({
        error: PREVIEW
          ? "Blotato connection could not be checked. No publishing actions were attempted."
          : e.message,
        connected: false,
      });
  }
});
app.post("/api/blotato/key", async (req, res) => {
  try {
    if (PREVIEW)
      throw new Error(
        "Use the deployed private workspace to save a permanent connection.",
      );
    const key = String(req.body.key || "").trim();
    if (key.length < 12 || key.length > 500)
      throw new Error("Enter a valid API key.");
    const accounts = await blotato("/users/me/accounts", key);
    const chosen = selectBlotatoAccounts(accounts.items);
    if (!chosen.twitter || !chosen.linkedin)
      throw new Error(
        `This key does not return both X @${BLOTATO_X_USERNAME} and a single personal LinkedIn account. Connect them in Blotato, then try again.`,
      );
    if (fly.FLY_LOCAL) {
      fly.put("blotato", encrypt(key));
      res.json({ok:true});return;
    }
    const { error } = await authedClient(res.locals.token)
      .from("integrations")
      .upsert({
        id: "blotato",
        encrypted_key: encrypt(key),
        updated_at: new Date().toISOString(),
      });
    if (error) throw new Error("The connection could not be saved.");
    res.json({ ok: true });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});
app.all("/api/publish", (_req, res) =>
  res
    .status(403)
    .json({ error: "Publishing is locked during the revision phase." }),
);
app.use("/api", (_req, res) =>
  res.status(404).json({ error: "Unknown endpoint." }),
);
app.use((error: any, _req: any, res: any, _next: any) =>
  res.status(400).json({ error: "Invalid request. No changes were saved." }),
);
