import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  CalendarDays,
  ListChecks,
  Images,
  Plug,
  ChevronLeft,
  ChevronRight,
  Search,
  Moon,
  Sun,
  ArrowUpRight,
  X,
  Save,
  MessageSquare,
  Download,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  Check,
  LogOut,
  Heart,
  Clock,
  Send,
  FileText,
  Eye,
  Plus,
  Trash2,
  Copy,
  History,
  LockKeyhole,
  CheckCircle2,
  CheckCheck,
  ExternalLink,
  UserRound,
  Pause,
  Play,
} from "lucide-react";
import { DateTime } from "luxon";
import {defaultProfile,type PreviewProfile,type Post,type Asset,type Campaign,type Platform} from "../shared/schema";
import { warnings, platformNames, countX,isPosted } from "../shared/rules";
import {PostPreview} from "./PostPreview";
import type {KitFile} from "./phKit";
import "./style.css";

const API = import.meta.env.VITE_API_BASE || "";
const BRAND = import.meta.env.BASE_URL + "brand/";
const MotionContext = createContext({motion:true,toggle:()=>{}});
let authToken = "";
async function api(path: string, opts: RequestInit = {}) {
  const res = await fetch(`${API}/api${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      ...opts.headers,
    },
  });
  const data = await res.json();
  if (!res.ok)
    throw new Error(data.error || "The request could not be completed.");
  return data;
}
const qc = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});
const names: Record<string, string> = {
  megamesh: "Megamesh",
  junk: "Junk",
  ase: "ASE",
  mang: "Mang",
  hollr: "Hollr",
  clippy: "Clippy",
  mercury: "Mercury",
  "cup-of-news": "Cup of News",
  xnftables: "xnftables",
  "ai-credit-checker": "AI Credit Checker",
  timescreen: "Timescreen",
  mars: "Mars",
  openline: "Openline",
  enki: "Enki",
  "pre-launch": "Pre-launch",
  "weekathon-follow-up": "Weekathon follow-up",
  "weekathon-followup": "Weekathon conclusion",
};
const fmtDate = (d: string) => DateTime.fromISO(d).toFormat("d LLL");
function Mark({ platform }: { platform: Platform }) {
  return (
    <span
      className={`platform-mark ${platform}`}
      aria-label={platformNames[platform]}
    >
      {platform === "linkedin" ? (
        "in"
      ) : platform === "twitter" ? (
        "𝕏"
      ) : platform === "producthunt" ? (
        "P"
      ) : (
        <FileText size={14} />
      )}
    </span>
  );
}
/** Blotato won't publish these: Product Hunt, announcements, and X threads over Blotato's 11-post limit. Computer publishes them. */
function viaComputer(p:Post){return !isPosted(p)&&(["producthunt","announcement"].includes(p.platform)||(p.platform==="twitter"&&p.content.length>11));}
const ViaTag=()=><span className="via-computer-tag" title="Blotato won't publish this one; Computer publishes it">Via Computer</span>;
function isQueued(p?:Post["publication"]){return p?.source==="blotato"&&["scheduled","in-progress"].includes(p.state);}
function Status({ status,publication }: { status: string;publication?:Post["publication"] }) {
  const posted=publication?.state==="published"||status==="published-manually";
  return (
    <span className={`status ${posted?"posted":status}`} title={posted?`Publication confirmed${publication?.source?` by ${publication.source}`:""}`:status==="ready"&&isQueued(publication)?"Confirmed and queued in Blotato; it publishes at the scheduled time":status==="ready"?"Validated and ready; not scheduled or published":undefined}>
      {posted?<CheckCheck size={14}/>:status==="ready"?<CheckCircle2 size={14}/>:null}
      {posted?"Posted":(
        {
          draft: "Draft",
          revision: "Needs revision",
          "copy-approved": "Copy approved",
          ready: isQueued(publication)?"Queued":"Ready",
          skipped: "Skipped",
          "published-manually": "Marked published",
        } as Record<string, string>
      )[status] || status}
    </span>
  );
}
// Shared artwork cache: object URLs live for the session, so remounts and carousels never show a revoked or half-loaded image.
const assetCache=new Map<string,Promise<string>>();
function loadAsset(url:string,attempt=0):Promise<string>{
  const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),20000);
  return fetch(url,{headers:{Authorization:`Bearer ${authToken}`},signal:ctrl.signal,cache:"no-store"})
    .then(r=>{if(r.status===401||r.status===404){const e:any=new Error(String(r.status));e.final=true;throw e;}if(!r.ok)throw new Error(String(r.status));return r.blob();})
    .then(b=>{if(!b.size)throw new Error("empty");return URL.createObjectURL(b);})
    .catch((e:any)=>{
      // A stopped Fly machine can stall or 502 the first request while it wakes; back off and retry.
      if(e?.final||attempt>=4)throw e;
      return new Promise<string>(res=>setTimeout(res,[800,2000,4000,8000][attempt])).then(()=>loadAsset(url,attempt+1));
    })
    .finally(()=>clearTimeout(timer));
}
function cachedAsset(url:string){
  let p=assetCache.get(url);
  if(!p){p=loadAsset(url);assetCache.set(url,p);p.catch(()=>assetCache.delete(url));}
  return p;
}
function AssetImage({
  asset,
  className = "",
  onClick,
  full=false,
}: {
  asset: Asset | undefined;
  className?: string;
  onClick?: () => void;
  full?:boolean;
}) {
  const [src, setSrc] = useState(""),
    [failed, setFailed] = useState(false),
    [nonce,setNonce]=useState(0);
  const {motion} = useContext(MotionContext);
  const url=asset?`${API}/api/assets/${asset.id}?v=${asset.revision||"original"}${full?"&download=1":""}${!motion&&/\.(gif|mp4)$/.test(asset.file)?"&poster=1":""}`:"";
  const isVideo=!!asset&&asset.file.endsWith(".mp4")&&motion;
  useEffect(() => {
    let active = true;
    setFailed(false);
    if (!asset) {setSrc("");return;}
    cachedAsset(url).then(u=>{if(active)setSrc(u);}).catch(()=>{if(active){setSrc("");setFailed(true);}});
    return () => {active = false;};
  }, [url,nonce]);
  useEffect(()=>{
    // After idling (tab hidden, laptop asleep, network drop), retry anything that did not load.
    if(src)return;
    const retry=()=>{if(document.visibilityState==="visible")setNonce(n=>n+1);};
    document.addEventListener("visibilitychange",retry);window.addEventListener("online",retry);window.addEventListener("focus",retry);
    const t=setInterval(retry,30000);
    return()=>{document.removeEventListener("visibilitychange",retry);window.removeEventListener("online",retry);window.removeEventListener("focus",retry);clearInterval(t);};
  },[src]);
  if (!asset) return null;
  return src&&isVideo ? (
    <video
      className={className}
      src={src}
      width={asset.width}
      height={asset.height}
      aria-label={asset.alt}
      onClick={onClick}
      controls={full}
      autoPlay={!full}
      muted
      loop
      playsInline
      preload="metadata"
      onError={()=>{assetCache.delete(url);setSrc("");setNonce(n=>n+1);}}
    />
  ) : src ? (
    <img
      className={className}
      src={src}
      alt={asset.alt}
      width={asset.width}
      height={asset.height}
      onClick={onClick}
      decoding="async"
      onError={()=>{assetCache.delete(url);setSrc("");setNonce(n=>n+1);}}
    />
  ) : (
    <div className={`image-placeholder ${className}`} style={{aspectRatio:`${asset.width} / ${asset.height}`}}>
      {failed ? <button type="button" className="image-retry" onClick={()=>setNonce(n=>n+1)}>Artwork unavailable · Retry</button> : <Images size={24} />}
    </div>
  );
}
async function kitBlob(f:KitFile):Promise<Blob>{
  let r:Response|undefined;
  for(let i=0;i<3;i++){try{r=await fetch(`${API}/api/assets/${f.asset.id}?download=1`,{headers:{Authorization:`Bearer ${authToken}`}});if(r.ok)break;}catch{}await new Promise(ok=>setTimeout(ok,1500*(i+1)));}
  if(!r?.ok)throw new Error(`${f.name} could not be downloaded. Please retry.`);
  const b=await r.blob();if(!f.resize)return b;
  const img=await createImageBitmap(b),c=document.createElement("canvas");c.width=c.height=f.resize;
  const g=c.getContext("2d")!;g.imageSmoothingQuality="high";g.drawImage(img,0,0,f.resize,f.resize);
  return await new Promise<Blob>((ok,no)=>c.toBlob(x=>x?ok(x):no(new Error("Resize failed.")),"image/png"));
}
function saveBlob(name:string,b:Blob){const u=URL.createObjectURL(b),a=document.createElement("a");a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);}
async function downloadKit(files:KitFile[],zipName?:string){
  if(files.length===1&&!zipName){saveBlob(files[0].name,await kitBlob(files[0]));return;}
  const {default:JSZip}=await import("jszip"),zip=new JSZip();
  for(const f of files)zip.file(f.name,await kitBlob(f));
  saveBlob(zipName||"product-hunt-kit.zip",await zip.generateAsync({type:"blob",compression:"STORE"}));
}
function download(name: string, text: string, type = "text/markdown") {
  const u = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = u;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(u), 1000);
}
import {followupComment,followupComments,withFollowupComment,renumberComments,joinComments} from "../shared/followup";
function exportMD(posts: Post[]) {
  return (
    "# Weekathon · Revision handoff\n\nExported from PH Social Manager. Review and publication records only; this file does not authorize publication.\n\n" +
    posts
      .map(
        (p) =>
          `## ${p.project} · ${platformNames[p.platform]} · ${p.title}\n\n- Date: ${p.date} ${p.time} Europe/Lisbon (${p.scheduledAt})\n- Status: ${p.status}\n- Validated: ${p.validatedAt || "Not validated"}\n- Publication: ${p.publication ? `${p.publication.state} (${p.publication.source})` : "Not confirmed"}\n- Published URL: ${p.publication?.url || "None recorded"}\n- Publication confirmed: ${p.publication?.confirmedAt || "Not confirmed"}\n- Version: ${p.version}\n- Source: ${p.source}\n- Artwork: ${p.media.join(", ") || "None"}\n\n### Copy\n\n${p.content.map((t, i) => `#### ${p.platform === "twitter" ? "Post" : "Block"} ${i + 1}\n\n${t}`).join("\n\n")}\n\n### Paul’s notes\n\n${p.notes || "No notes yet."}\n\n### Checks\n\n${warnings(p).join("\n") || "No automatic copy warnings. Human review still required."}\n`,
      )
      .join("\n---\n\n")
  );
}
function App() {
  const [motion,setMotion]=useState(()=>!matchMedia("(prefers-reduced-motion: reduce)").matches);
  const [session, setSession] = useState(false),
    [view, setView] = useState("calendar");
  const [previewMode,setPreviewMode]=useState(false);
  const [authMode,setAuthMode]=useState("password");
  const [setupToken,setSetupToken]=useState("");
  const [theme, setTheme] = useState(() =>
    matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light",
  );
  const [selected, setSelected] = useState<string | null>(null),
    [platform, setPlatform] = useState("all"),
    [project, setProject] = useState("all"),
    [search, setSearch] = useState("");
  const [week, setWeek] = useState("2026-10-26"),
    [range, setRange] = useState("week"),
    [err, setErr] = useState("");
  const query = useQuery({
    queryKey: ["campaign"],
    queryFn: () => api("/campaign") as Promise<Campaign>,
    enabled: session,
  });
  const campaign = query.data;
  const launchWeek = campaign?.posts.filter(p=>p.platform==="producthunt").map(p=>p.date).sort()[0];
  // Open on today: once the launch anchor is known, show the launch-aligned week containing today (Europe/Lisbon) and bring today's column into view.
  useEffect(()=>{if(!launchWeek)return;setRange("week");setWeek(weekOf(todayIso()));const t=setTimeout(()=>document.querySelector(".day.is-today")?.scrollIntoView({block:"nearest",inline:"center",behavior:"smooth"}),300);return()=>clearTimeout(t)},[launchWeek]);
  // Today in the campaign timezone; weeks stay aligned to the launch anchor (Sun-Sat) so Prev/Next/Launch week stay consistent.
  const todayIso=()=>DateTime.now().setZone("Europe/Lisbon").toISODate()!;
  const [today,setToday]=useState(todayIso);
  useEffect(()=>{const t=setInterval(()=>setToday(todayIso()),60_000);return()=>clearInterval(t)},[]);
  const weekOf=(date:string)=>{const a=DateTime.fromISO(launchWeek||week),d=Math.floor(DateTime.fromISO(date).diff(a,"days").days/7)*7;return a.plus({days:d}).toISODate()!};
  const goToday=()=>{const t=todayIso();setToday(t);setRange("week");setWeek(weekOf(t))};
  const onTodayWeek=range==="week"&&weekOf(today)===week;
  const profileQuery=useQuery({queryKey:["profile"],queryFn:()=>api("/profile") as Promise<PreviewProfile>,enabled:session});
  const [workflowFocus,setWorkflowFocus]=useState(false),[syncing,setSyncing]=useState(false);
  function acceptPost(updated:Post) {
    qc.setQueryData<Campaign>(["campaign"],old=>old?{...old,posts:old.posts.map(p=>p.id===updated.id?updated:p)}:old);
  }
  async function validatePost(p:Post) {
    try {setErr("");acceptPost(await api(`/posts/${p.id}/workflow`,{method:"POST",body:JSON.stringify({version:p.version,action:"validate"})}));}
    catch(e:any){setErr(e.message);}
  }
  async function syncPublicationStatuses(silent=false) {
    if(syncing)return;setSyncing(true);
    try {
      const result=await api("/blotato/sync",{method:"POST",body:"{}"});
      result.posts.forEach(acceptPost);
      if(!silent)setErr(result.errors?.join(" ")||"Publication statuses checked. No posts were sent.");
    }catch(e:any){if(!silent)setErr(e.message);}finally{setSyncing(false);}
  }
  const trackedPending=campaign?.posts.some(p=>p.publication?.submissionId&&!["published","failed"].includes(p.publication.state));
  useEffect(()=>{
    if(!session||true)return;
    const timer=setInterval(()=>{void syncPublicationStatuses(true)},60000);
    return ()=>clearInterval(timer);
  },[session,trackedPending,syncing]);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);
  useEffect(() => {
    const hash = new URLSearchParams(location.hash.slice(1));
    const setup = hash.get("setup");
    if (setup) {
      setSetupToken(setup);
      setAuthMode("setup");
      history.replaceState(null,"",location.pathname + location.search);
      return;
    }
    const token = hash.get("access_token");
    if (token) {
      authToken = token;
      history.replaceState(null, "", location.pathname + location.search);
      setSession(true);
      return;
    }
    api("/session")
      .then((r) => {
        setAuthMode(r.mode);
        if(r.authenticated) setSession(true);
        if (r.previewToken) {
          authToken = r.previewToken;
          setPreviewMode(true);
          setSession(true);
        }
      })
      .catch(() => {});
  }, []);
  const posts = useMemo(
    () =>
      campaign?.posts.filter(
        (p) =>
          (platform === "all" || p.platform === platform) &&
          (project === "all" || p.projectSlug === project) &&
          `${p.project} ${p.title} ${p.content.join(" ")} ${p.notes}`
            .toLowerCase()
            .includes(search.toLowerCase()),
      ) || [],
    [campaign, platform, project, search],
  );
  const days = Array.from({ length: 7 }, (_, i) =>
    DateTime.fromISO(week).plus({ days: i }).toISODate()!,
  );
  if (!session)
    return (
      <Login
        mode={authMode}
        setupToken={setupToken}
        onLogin={(t) => {
          authToken = t;
          setSetupToken("");
          setAuthMode("password");
          setSession(true);
        }}
        theme={theme}
        toggle={() => setTheme(theme === "light" ? "dark" : "light")}
      />
    );
  const picked = campaign?.posts.find((p) => p.id === selected);
  const needsRevision =
    campaign?.posts.filter((p) => p.status === "revision" || p.notes.trim())
      .length || 0;
  return (
    <MotionContext.Provider value={{motion,toggle:()=>setMotion(!motion)}}><div className="app">
      <a href="#main" className="skip">
        Skip to workspace
      </a>
      <aside className="sidebar">
        <a
          className="identity"
          href="https://ph.paulfleury.com/"
          target="_blank"
          rel="noreferrer"
        >
          <img src={BRAND+"kitty-head.webp"} alt="Weekathon kitty" />
          <span>
            PF <Heart className="heart" size={19} fill="currentColor" /> PH
          </span>
        </a>
        <div className="workspace-label">THE SOCIAL WORKSPACE</div>
        <nav aria-label="Workspace">
          {[
            ["calendar", "Schedule", CalendarDays],
            ["drafts", "Drafts & notes", ListChecks],
            ["assets", "Creative library", Images],
          ].map(([key, label, Icon]: any) => (
            <button
              key={key}
              className={view === key ? "nav active" : "nav"}
              onClick={() => setView(key)}
            >
              <Icon size={19} />
              {label}
              {key === "drafts" && needsRevision > 0 && (
                <span className="count">{needsRevision}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="campaign-note">
          <span className="mini-title">WEEKATHON 2026</span>
          <strong>
            Seven days.
            <br />
            Room to improve.
          </strong>
          <p>
            Draft. Discuss. Refine.
            <br />
            Publish only when ready.
          </p>
          <img
            src={BRAND+"kitty.webp"}
            alt="The original Weekathon coding kitty"
          />
        </div>
        <div className="sidebar-foot">
          <ShieldCheck size={15} />
          <span>Private review workspace</span>
        </div>
        <a
          className="attribution"
          href="https://www.perplexity.ai/computer"
          target="_blank"
          rel="noreferrer"
        >
          Built with Perplexity Computer
        </a>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div className="breadcrumb">
            Weekathon <span>/</span>{" "}
            {view === "calendar"
              ? "Schedule"
              : view === "drafts"
                ? "Drafts & notes"
                : "Creative library"}
          </div>
          <div className="top-actions">
            <button className="icon-btn" aria-label={motion?"Pause animated artwork":"Play animated artwork"}
              title={motion?"Pause animated artwork":"Play animated artwork"} onClick={()=>setMotion(!motion)}>
              {motion?<Pause size={18}/>:<Play size={18}/>}
            </button>
            <span className="review-only">
              <span /> Review mode
            </span>
            <button
              className="icon-btn"
              aria-label="Toggle light and dark mode"
              onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            >
              {theme === "light" ? <Moon size={19} /> : <Sun size={19} />}
            </button>
            <button
              className="icon-btn"
              aria-label="Sign out"
              onClick={async () => {
                if(authMode === "password") {
                  try {await api("/auth/logout",{method:"POST"});}
                  catch {setErr("Sign-out failed. Please retry.");return;}
                }
                authToken = "";
                qc.clear();
                setSession(false);
              }}
            >
              <LogOut size={18} />
            </button>
            <span className="avatar">PF</span>
          </div>
        </header>
      <main id="main">
        {previewMode&&<p className="preview-notice">Private preview: edits are saved on this preview server. Export a handoff to keep your revisions beyond this session; production sync is awaiting hosting access.</p>}
          <div className="page-heading">
            <div>
              <div className="eyebrow">YOUR LAUNCH ROOM</div>
              <h1>
                {view === "calendar"
                  ? "A little more ready, every day."
                  : view === "drafts"
                    ? "Make the next version better."
                    : view === "assets"
                      ? "The same story. The right frame."
                      : "Connected, not on autopilot."}
              </h1>
              <p>
                {view === "calendar"
                  ? "Every post, every project. One place to get the details right."
                  : view === "drafts"
                    ? "Edit the words, leave direction, and keep a clear handoff."
                    : "Product-specific artwork. The original kitty. Nothing approved by default."}
              </p>
            </div>
            {campaign && (
              <button
                className="btn"
                onClick={() =>
                  download(
                    "weekathon-revision-handoff.md",
                    exportMD(campaign.posts),
                  )
                }
              >
                <Download size={17} /> Export handoff
              </button>
            )}
          </div>
          {query.isLoading && (
            <div className="skeleton-grid">
              {Array.from({ length: 7 }, (_, i) => (
                <div className="skeleton" key={i} />
              ))}
            </div>
          )}
          {query.error && (
            <div className="empty">
              <AlertTriangle />
              <h2>We couldn’t load the workspace.</h2>
              <p>{query.error.message}</p>
              <button className="btn" onClick={() => query.refetch()}>
                Try again
              </button>
            </div>
          )}
          {campaign && (
            <>
              {view !== "connections" && (
                <div className="overview">
                  <div>
                    <strong>{campaign.posts.length}</strong>
                    <span>planned sessions</span>
                  </div>
                  <div>
                    <strong>
                      {
                        campaign.posts.filter(
                          (p) => p.platform === "producthunt",
                        ).length
                      }
                    </strong>
                    <span>manual PH launches</span>
                  </div>
                  <div>
                    <strong>{needsRevision}</strong>
                    <span>with notes / revisions</span>
                  </div>
                  <div><strong>{campaign.posts.filter(p=>p.status==="ready"&&!isPosted(p)).length}</strong><span>validated / ready</span></div>
                  <div><strong>{campaign.posts.filter(isPosted).length}</strong><span>posted</span></div>
                  <div className="safety-line">
                    <LockKeyhole size={18} />
                    <span>
                      Nothing is sent when you save.
                      <br />
                      <b>All posts are published manually.</b> Mark a post as posted once it is live.
                    </span>
                  </div>
                </div>
              )}
              {["calendar", "drafts", "assets"].includes(view) && (
                <div className="filterbar">
                  <label className="search">
                    <Search size={17} />
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder={
                        view === "assets"
                          ? "Find artwork…"
                          : "Find a project or post…"
                      }
                      aria-label="Search workspace"
                    />
                  </label>
                  <select
                    value={project}
                    onChange={(e) => setProject(e.target.value)}
                    aria-label="Project"
                  >
                    <option value="all">All projects</option>
                    {Object.entries(names).map(([id, n]) => (
                      <option key={id} value={id}>
                        {n}
                      </option>
                    ))}
                  </select>
                  <div className="platform-filters">
                    {["all", "producthunt", "linkedin", "twitter"].map((p) => (
                      <button
                        aria-pressed={platform === p}
                        onClick={() => setPlatform(p)}
                        key={p}
                        className={platform === p ? "selected" : ""}
                      >
                        {p === "all" ? (
                          "All channels"
                        ) : (
                          <>
                            <Mark platform={p as Platform} />
                            <span>{platformNames[p as Platform]}</span>
                          </>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {view === "calendar" && (
                <>
                  <div className="calendar-toolbar">
                    <div className="week-title">
                      <button
                        className="icon-btn"
                        aria-label="Previous week"
                        onClick={() =>
                          setWeek(
                            DateTime.fromISO(week)
                              .minus({ weeks: 1 })
                              .toISODate()!,
                          )
                        }
                      >
                        <ChevronLeft size={19} />
                      </button>
                      <strong>
                        {DateTime.fromISO(week).toFormat("d LLL")} –{" "}
                        {DateTime.fromISO(week)
                          .plus({ days: 6 })
                          .toFormat("d LLL yyyy")}
                      </strong>
                      <button
                        className="icon-btn"
                        aria-label="Next week"
                        onClick={() =>
                          setWeek(
                            DateTime.fromISO(week)
                              .plus({ weeks: 1 })
                              .toISODate()!,
                          )
                        }
                      >
                        <ChevronRight size={19} />
                      </button>
                      <button
                        className={`text-btn today-btn${onTodayWeek?" is-current":""}`}
                        onClick={goToday}
                        aria-pressed={onTodayWeek}
                        title={`Jump to this week (${DateTime.fromISO(today).toFormat("ccc d LLL")})`}
                      >
                        Today
                      </button>
                      <button
                        className="text-btn"
                        onClick={() => setWeek(launchWeek || week)}
                      >
                        Launch week
                      </button>
                    </div>
                    <div className="calendar-meta">
                      
                      <span>
                        <Clock size={14} /> Europe/Lisbon
                      </span>
                      <div className="segmented">
                        <button
                          className={range === "week" ? "selected" : ""}
                          onClick={() => setRange("week")}
                        >
                          Week
                        </button>
                        <button
                          className={range === "agenda" ? "selected" : ""}
                          onClick={() => setRange("agenda")}
                        >
                          All dates
                        </button>
                      </div>
                    </div>
                  </div>
                  {range === "week" ? (
                    <div className="calendar-grid">
                      {days.map((date) => (
                        <section className={`day${date===today?" is-today":""}`} key={date} aria-current={date===today?"date":undefined}>
                          <div className="day-head">
                            <span>
                              {DateTime.fromISO(date).toFormat("ccc")}
                            </span>
                            <strong>
                              {DateTime.fromISO(date).toFormat("dd")}
                            </strong>
                            <small>
                              {posts.filter((p) => p.date === date).length}{" "}
                              sessions
                            </small>
                          </div>
                          <div className="day-posts">
                            {posts
                              .filter((p) => p.date === date)
                              .sort((a, b) => a.time.localeCompare(b.time))
                              .map((p) => (
                                <article className={`post-card-wrap ${isPosted(p)?"is-posted":p.status==="ready"?"is-ready":""}${viaComputer(p)?" is-via-computer":""}`} key={p.id}><button
                                  key={p.id}
                                  className="post-card"
                                  onClick={() => {setWorkflowFocus(false);setSelected(p.id)}}
                                >
                                  <div>
                                    <Mark platform={p.platform} />
                                    <time>{p.time}</time>
                                    {warnings(p).length > 0 && (
                                      <AlertTriangle
                                        className="warning-dot"
                                        size={13}
                                      />
                                    )}
                                  </div>
                                  <strong>{p.project}</strong>
                                  <span>{p.title}</span>
                                  <div className="card-bottom">
                                    <Status status={p.status} publication={p.publication}/>
                                    {viaComputer(p)&&<ViaTag/>}
                                    {p.notes && <MessageSquare size={13} />}
                                  </div>
                                </button><QuickActions post={p} validate={()=>validatePost(p)} review={()=>{setWorkflowFocus(true);setSelected(p.id)}}/></article>
                              ))}
                            {!posts.some((p) => p.date === date) && (
                              <p className="quiet">Room to breathe.</p>
                            )}
                          </div>
                        </section>
                      ))}
                    </div>
                  ) : (
                    <Agenda posts={posts} onSelect={id=>{setWorkflowFocus(false);setSelected(id)}} onValidate={validatePost} onWorkflow={id=>{setWorkflowFocus(true);setSelected(id)}} />
                  )}
                  <div className="below-calendar">
                    <span>
                      <span className="legend-dot" /> Proposed slots, not
                      scheduled posts.
                    </span>
                    <span>
                      PH launches are manual. Social posts need your approval.
                    </span>
                  </div>
                </>
              )}
              {view === "drafts" && (
                <Drafts posts={posts} onSelect={id=>{setWorkflowFocus(false);setSelected(id)}} onValidate={validatePost} onWorkflow={id=>{setWorkflowFocus(true);setSelected(id)}} />
              )}
              {view === "assets" && (
                <AssetLibrary
                  assets={campaign.assets.filter(
                    (a) =>
                      (project === "all" || a.project === project) &&
                      (platform === "all" || a.channel === platform) &&
                      `${a.name} ${a.project}`
                        .toLowerCase()
                        .includes(search.toLowerCase()),
                  )}
                />
              )}
              {view === "drafts" && <div className="connections"><ProfileSettings/></div>}
            </>
          )}
          {err && <p role="alert">{err}</p>}
        </main>
      </div>
      {picked && campaign && (
        <Editor
          key={picked.id}
          post={picked}
          assets={campaign.assets}
          profile={profileQuery.data||defaultProfile}
          workflowFocus={workflowFocus}
          onClose={() => setSelected(null)}
        />
      )}
    </div></MotionContext.Provider>
  );
}
function QuickActions({post,validate,review}:{post:Post;validate:()=>void;review:()=>void}) {
  return <div className="post-quick-actions">
    <button aria-label={`Validate ${post.project} ${platformNames[post.platform]}`} title={warnings(post).length?"Resolve the copy warnings before validating":"Mark this saved draft ready"}
      disabled={post.status==="ready"||isPosted(post)||warnings(post).length>0} onClick={validate}>
      <CheckCircle2 size={14}/>{post.status==="ready"?"Validated":"Validate"}
    </button>
    <button onClick={review} aria-label={`Publication status for ${post.project} ${platformNames[post.platform]}`}><CheckCheck size={14}/>{isPosted(post)?"Posted":"Publication"}</button>
  </div>;
}
function Agenda({
  posts,
  onSelect,
  onValidate,onWorkflow,
}: {
  posts: Post[];
  onSelect: (id: string) => void;
  onValidate:(p:Post)=>void;onWorkflow:(id:string)=>void;
}) {
  if (!posts.length)
    return (
      <div className="empty">
        <Search />
        <h2>No posts match these filters.</h2>
        <p>Try another project or clear the search.</p>
      </div>
    );
  return (
    <div className="agenda">
      {[...posts]
        .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt))
        .map((p) => (
          <article className={`agenda-item${isPosted(p)?" is-posted":""}${viaComputer(p)?" is-via-computer":""}`} key={p.id}><button
            className="agenda-row"
            key={p.id}
            onClick={() => onSelect(p.id)}
          >
            <div className="agenda-date">
              <b>{fmtDate(p.date)}</b>
              <span>{p.time} Lisbon</span>
            </div>
            <Mark platform={p.platform} />
            <div className="agenda-title">
              <b>
                {p.project} <span>· {p.title}</span>{viaComputer(p)&&<> <ViaTag/></>}
              </b>
              <small>
                {p.optional ? "Optional · " : ""}
                {p.content[0].slice(0, 100)}
              </small>
            </div>
            <Status status={p.status} publication={p.publication} />
            {warnings(p).length > 0 ? (
              <AlertTriangle size={17} className="warning-dot" />
            ) : (
              <ChevronRight size={18} />
            )}
          </button><QuickActions post={p} validate={()=>onValidate(p)} review={()=>onWorkflow(p.id)}/></article>
        ))}
    </div>
  );
}
function Drafts({
  posts,
  onSelect,
  onValidate,onWorkflow,
}: {
  posts: Post[];
  onSelect: (id: string) => void;
  onValidate:(p:Post)=>void;onWorkflow:(id:string)=>void;
}) {
  const [filter, setFilter] = useState("all");
  const filtered = posts.filter(
    (p) =>
      filter === "all" ||
      (filter === "notes" && !!p.notes.trim()) ||
      (filter === "warnings" && warnings(p).length > 0) ||
      (filter==="posted" && isPosted(p)) ||
      (filter==="ready" && p.status==="ready"&&!isPosted(p)) ||
      (filter!=="ready" && filter === p.status),
  );
  return (
    <>
      <div className="draft-tabs">
        {[
          ["all", "All drafts"],
          ["revision", "Needs revision"],
          ["ready","Ready"],
          ["posted","Posted"],
          ["notes", "With notes"],
          ["warnings", "Copy warnings"],
        ].map(([k, n]) => (
          <button
            key={k}
            className={filter === k ? "selected" : ""}
            onClick={() => setFilter(k)}
          >
            {n}
          </button>
        ))}
      </div>
      <Agenda posts={filtered} onSelect={onSelect} onValidate={onValidate} onWorkflow={onWorkflow}/>
    </>
  );
}
function AssetLibrary({ assets }: { assets: Asset[] }) {
  const [selected, setSelected] = useState<Asset | null>(null);
  const [downloading,setDownloading]=useState(false);
  const [downloadError,setDownloadError]=useState('');
  const [downloadProgress,setDownloadProgress]=useState('');
  async function downloadPack(){
    setDownloading(true);setDownloadError('');
    try{
      const {default:JSZip}=await import('jszip');
      const all:Campaign=await api('/campaign'),zip=new JSZip();let done=0;
      for(let i=0;i<all.assets.length;i+=4){
        await Promise.all(all.assets.slice(i,i+4).map(async asset=>{
          const r=await fetch(`${API}/api/assets/${asset.id}?download=1`,{headers:{Authorization:`Bearer ${authToken}`}});
          if(!r.ok)throw new Error('An image could not be downloaded. Please retry the pack.');
          zip.file(asset.file,await r.arrayBuffer());done++;setDownloadProgress(`${done} / ${all.assets.length}`);
        }));
      }
      zip.file('MANIFEST.json',JSON.stringify(all.assets,null,2));
      const calendar=all.posts.slice().sort((a,b)=>a.scheduledAt.localeCompare(b.scheduledAt)).map(p=>`- ${p.date} ${p.time} ${p.timezone} | ${p.project} | ${p.platform} | ${p.title}`).join('\n');
      zip.file('README.md',`# Weekathon graphics review\n\n${all.assets.length} original graphics. The exact approved kitty and product identities are preserved. These are original PNGs, not compressed previews. Review only, not publication approval. The app is the source of saved copy and notes.\n\n## Current schedule\n\n${calendar}\n`);
      setDownloadProgress('Creating ZIP…');
      const u=URL.createObjectURL(await zip.generateAsync({type:'blob',compression:'DEFLATE',compressionOptions:{level:3}})),a=document.createElement('a');a.href=u;a.download='Weekathon-graphics-review.zip';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);
    }catch(e:any){setDownloadError(e.message)}finally{setDownloading(false)}
  }
  return (
    <>
      <button className="btn" disabled={downloading} onClick={downloadPack}><Download size={17}/>{downloading?`Preparing ${downloadProgress}`:'Download all graphics ZIP'}</button>
      {downloadError&&<p className="error" role="alert">{downloadError}</p>}
      <p className="small-note">
        {assets.length} assets · CHO voice refresh · Open a tile to inspect
        or download. Use each draft’s Notes for your feedback. Revised artwork is for review, not publication approval.
      </p>
      <div className="asset-grid">
        {assets.map((a) => (
          <button
            className="asset-card"
            key={a.id}
            onClick={() => setSelected(a)}
          >
            <AssetImage asset={a} />
            <div>
              <strong>{names[a.project] || a.project}</strong>
              <span>{a.name}</span>
              <small>
                {a.width} × {a.height} · {a.channel}
              </small>
            </div>
          </button>
        ))}
      </div>
      {!assets.length && (
        <div className="empty">
          <Images />
          <h2>No artwork in this view.</h2>
          <p>Choose another project or channel.</p>
        </div>
      )}
      {selected && (
        <Modal title={selected.name} close={() => setSelected(null)}>
          <AssetImage className="full-art" asset={selected} full />
          <p>{selected.alt}</p>
          <button
            className="btn"
            onClick={async () => {
              const r = await fetch(`${API}/api/assets/${selected.id}?download=1`, {
                headers: { Authorization: `Bearer ${authToken}` },
              });
              if (!r.ok) return;
              const u = URL.createObjectURL(await r.blob());
              const a = document.createElement("a");
              a.href = u;
              a.download = selected.file.split("/").pop()!;
              a.click();
              setTimeout(() => URL.revokeObjectURL(u), 1000);
            }}
          >
            <Download size={16} /> Download image
          </button>
        </Modal>
      )}
    </>
  );
}
function Modal({
  title,
  close,
  children,
}: {
  title: string;
  close: () => void;
  children: React.ReactNode;
}) {
  const {motion,toggle}=useContext(MotionContext);
  const ref = React.useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
    return () => ref.current?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
      onClick={(e) => {
        if (e.target === ref.current) close();
      }}
      className="modal"
    >
      <header>
        <h2>{title}</h2>
        <button className="icon-btn" aria-label={motion?"Pause animated artwork":"Play animated artwork"} title={motion?"Pause animated artwork":"Play animated artwork"} onClick={toggle}>
          {motion?<Pause size={18}/>:<Play size={18}/>}
        </button>
        <button className="icon-btn" aria-label="Close dialog" onClick={close}>
          <X size={21} />
        </button>
      </header>
      {children}
    </dialog>
  );
}
function Editor({
  post,
  assets,
  onClose,
  profile,workflowFocus,
}: {
  post: Post;
  assets: Asset[];
  onClose: () => void;
  profile:PreviewProfile;workflowFocus:boolean;
}) {
  const client = useQueryClient();
  const [draft, setDraft] = useState<Post>(structuredClone(post)),
    [tab, setTab] = useState("copy"),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [error, setError] = useState(""),
    [expanded, setExpanded] = useState(false),
    [liComments, setLiComments] = useState<string[]>(() => followupComments(post.notes));
  // Keep the per-comment editor in step when the draft notes change elsewhere (history restore, Notes tab, save).
  useEffect(() => {
    if (joinComments(liComments) !== joinComments(followupComments(draft.notes)))
      setLiComments(followupComments(draft.notes));
  }, [draft.notes]);
  const setComments = (list: string[]) => {
    setLiComments(list);
    const joined = joinComments(list);
    if (!joined && !followupComment(draft.notes) && !draft.notes.includes("LINKEDIN_FOLLOWUP_START")) return;
    setDraft({ ...draft, notes: withFollowupComment(draft.notes, joined), status: "revision" });
  };
  const dirty =
    JSON.stringify([
      draft.content,
      draft.notes,
      draft.status,
      draft.date,
      draft.time,
      draft.media,
    ]) !==
    JSON.stringify([
      post.content,
      post.notes,
      post.status,
      post.date,
      post.time,
      post.media,
    ]);
  const check = warnings(draft);
  useEffect(()=>{if(!dirty && post.version!==draft.version)setDraft(structuredClone(post));},[post.version]);
  const relevant = assets.filter(
    (a) =>
      a.project === draft.projectSlug &&
      (a.channel === draft.platform || draft.projectSlug === "pre-launch"),
  );
  const close = () => {
    if (!dirty || confirm("Discard your unsaved edits?")) onClose();
  };
  async function save() {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const updated = await api(`/posts/${post.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          version: draft.version,
          content: draft.content,
          notes: draft.notes,
          status: draft.status,
          date: draft.date,
          time: draft.time,
          media: draft.media,
        }),
      });
      setDraft(updated);
      client.setQueryData<Campaign>(["campaign"], (old) =>
        old
          ? {
              ...old,
              posts: old.posts.map((p) => (p.id === updated.id ? updated : p)),
            }
          : old,
      );
      setMessage("Saved to the workspace. Nothing was published.");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    const fn = (e: BeforeUnloadEvent) => {
      if (dirty) e.preventDefault();
    };
    addEventListener("beforeunload", fn);
    return () => removeEventListener("beforeunload", fn);
  }, [dirty]);
  return (
    <Modal
      title={`${post.project} · ${platformNames[post.platform]}`}
      close={close}
    >
      <div className="editor-meta">
        <span>
          {post.title}
          {post.optional ? " · Optional" : ""}
        </span>
        <Status status={draft.status} publication={draft.publication}/>
        <small>
          v{draft.version} · {dirty ? "Unsaved changes" : "Saved draft"}
        </small>
      </div>
      <WorkflowPanel post={draft} dirty={dirty} initialOpen={workflowFocus} onSaved={updated=>{
        setDraft(updated);client.setQueryData<Campaign>(["campaign"],old=>old?{...old,posts:old.posts.map(p=>p.id===updated.id?updated:p)}:old);
      }}/>
      <div className="editor-layout">
        <section className="compose">
          <div className="editor-tabs">
            {[
              ["copy", "Copy", FileText],
              ["notes", "Notes", MessageSquare],
              ["art", "Artwork", Images],
              ["history", "History", History],
            ].map(([k, n, I]: any) => (
              <button
                key={k}
                className={tab === k ? "selected" : ""}
                onClick={() => setTab(k)}
              >
                <I size={16} />
                {n}
                {k === "notes" && draft.notes && <span className="note-dot" />}
              </button>
            ))}
          </div>
          <div className="compose-body">
            {tab === "copy" && (
              <>
                <div className="timing">
                  <label>
                    Date
                    <input
                      type="date"
                      value={draft.date}
                      onChange={(e) =>
                        setDraft({ ...draft, date: e.target.value })
                      }
                    />
                  </label>
                  <label>
                    Time · Lisbon
                    <input
                      type="time"
                      value={draft.time}
                      onChange={(e) =>
                        setDraft({ ...draft, time: e.target.value })
                      }
                    />
                  </label>
                  <label>
                    Review status
                    <select
                      value={draft.status}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          status: e.target.value as Post["status"],
                        })
                      }
                    >
                      <option value="draft">Draft</option>
                      <option value="revision">Needs revision</option>
                      <option value="copy-approved">Copy approved only</option>
                      <option value="ready">Validated / ready</option>
                      <option value="skipped">Skipped</option>
                      {draft.status==="published-manually" && (
                        <option value="published-manually">
                          Posted (legacy confirmation)
                        </option>
                      )}
                    </select>
                  </label>
                </div>
                {draft.content.map((text, i) => (
                  <div className="copy-block" key={i}>
                    <div>
                      <label htmlFor={`copy-${i}`}>
                        {draft.platform === "twitter"
                          ? i === 0
                            ? "Opening post"
                            : `Thread reply ${i}`
                          : draft.platform === "producthunt"
                            ? i===0 ? "Main listing" : i===1 ? `Opening maker comment · 1/${draft.content.length-1} · post first` : `Reply ${i}/${draft.content.length-1} · post as a reply to the maker comment`
                            : `Post copy${draft.content.length > 1 ? ` · ${i + 1}` : ""}`}
                      </label>
                      <span
                        className={
                          draft.platform === "twitter" && countX(text) > 280
                            ? "warning-dot"
                            : ""
                        }
                      >
                        {draft.platform === "twitter"
                          ? `${countX(text)} / 280 estimated`
                          : `${text.length} characters`}
                      </span>
                      {draft.content.length > 1 && (
                        <button
                          className="icon-btn"
                          aria-label={`Remove block ${i + 1}`}
                          onClick={() =>
                            setDraft({
                              ...draft,
                              content: (() => { const kept = draft.content.filter((_, j) => i !== j);
                                return draft.platform === "producthunt" && i > 0 ? [kept[0], ...renumberComments(kept.slice(1))] : kept; })(),
                              status: "revision",
                            })
                          }
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                    <textarea
                      id={`copy-${i}`}
                      value={text}
                      rows={draft.platform === "twitter" ? 5 : 14}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          content: draft.content.map((t, j) =>
                            j === i ? e.target.value : t,
                          ),
                          status: "revision",
                        })
                      }
                    />
                  </div>
                ))}
                {draft.platform === "twitter" && (
                  <button
                    className="text-btn"
                    onClick={() =>
                      setDraft({
                        ...draft,
                        content: [...draft.content, ""],
                        status: "revision",
                      })
                    }
                  >
                    <Plus size={16} /> Add thread reply
                  </button>
                )}
                {draft.platform === "producthunt" && draft.content.length < 30 && (
                  <button className="text-btn" onClick={() => {
                      const comments = [...draft.content.slice(1), "1/1 · "];
                      setDraft({ ...draft, content: [draft.content[0], ...renumberComments(comments)], status: "revision" });
                    }}>
                    <Plus size={16} /> {draft.content.length < 2 ? "Add maker comment" : "Add reply to the maker comment"}
                  </button>
                )}
                {draft.platform === "linkedin" && <div className="followup-editor">
                  <h3 className="comment-editor-title">LinkedIn comments · {liComments.length}</h3>
                  <p className="small-note">Manual, after publication. Post comment 1 as a top-level comment, then each later one as a reply to it, in order. Numbering (1/N · ) is updated automatically when you add or remove a comment. Aim for 1,000 characters or fewer each. Never sent automatically.</p>
                  {liComments.map((text, i) => (
                    <div className="copy-block" key={i}>
                      <div>
                        <label htmlFor={`li-comment-${i}`}>
                          {`Comment ${i + 1}/${liComments.length} · ${i === 0 ? "top-level, post first" : "reply to comment 1"}`}
                        </label>
                        <span className={text.trim().length > 1000 ? "warning-dot" : ""}>
                          {`${text.trim().length} characters${text.trim().length > 1000 ? " · shorten or split" : ""}`}
                        </span>
                        <button className="icon-btn" aria-label={`Remove comment ${i + 1}`}
                          onClick={() => setComments(renumberComments(liComments.filter((_, j) => j !== i)))}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <textarea id={`li-comment-${i}`} rows={8} value={text}
                        onChange={(e) => setComments(liComments.map((t, j) => (j === i ? e.target.value : t)))} />
                    </div>
                  ))}
                  <button className="text-btn" onClick={() => {
                      const numbered = !liComments.length || liComments.some(t => /^\d+\/\d+ · /.test(t));
                      setComments(numbered ? renumberComments([...liComments, "1/1 · "]) : [...liComments, ""]);
                    }}>
                    <Plus size={16} /> Add LinkedIn comment
                  </button>
                </div>}
                <details className="source">
                  <summary>Original Markdown & provenance</summary>
                  <small>{post.source}</small>
                  <pre>{post.sourceMarkdown}</pre>
                </details>
              </>
            )}
            {tab === "notes" && (
              <>
                <h3>Direction for the next pass</h3>
                <p className="small-note">
                  Tell me what to sharpen, remove, verify or redesign. Save
                  these notes, then export a handoff for our next conversation.
                </p>
                <label htmlFor="notes">Your notes</label>
                <textarea
                  id="notes"
                  value={draft.notes}
                  rows={14}
                  placeholder="For example: make the opener more personal; simplify the CHO paragraph; check the actual build cost."
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      notes: e.target.value,
                      status: "revision",
                    })
                  }
                />
                <div className="note-explainer">
                  <MessageSquare size={18} />
                  <span>
                    Saved notes do not start an AI run or spend credits. They
                    stay here until we review them.
                  </span>
                </div>
              </>
            )}
            {tab === "art" && (
              <>
                <h3>Artwork for this post</h3>
                <p className="small-note">
                  Choose artwork in order. LinkedIn: one image is safest for the
                  promoted-post candidate. PH: preserve the six-slide gallery.
                </p>
                <div className="art-picker">
                  {relevant.map((a) => (
                    <button
                      aria-pressed={draft.media.includes(a.id)}
                      className={draft.media.includes(a.id) ? "chosen" : ""}
                      key={a.id}
                      onClick={() =>
                        setDraft({
                          ...draft,
                          media: draft.media.includes(a.id)
                            ? draft.media.filter((id) => id !== a.id)
                            : [...draft.media, a.id],
                          status: "revision",
                        })
                      }
                    >
                      <AssetImage asset={a} />
                      <span>{a.name}</span>
                      {draft.media.includes(a.id) && (
                        <b>{draft.media.indexOf(a.id) + 1}</b>
                      )}
                    </button>
                  ))}
                </div>
                {!relevant.length && <p>No matching artwork yet.</p>}
                <p className="small-note">
                  Artwork changes need review too. The live text and the image
                  should tell the same story.
                </p>
              </>
            )}
            {tab === "history" && (
              <>
                <h3>Saved versions</h3>
                <p className="small-note">
                  A restore loads an older version into the editor. Save to make
                  it current.
                </p>
                {draft.history.length === 0 ? (
                  <p>
                    No earlier edits. The imported Markdown is preserved under
                    Copy.
                  </p>
                ) : (
                  draft.history
                    .slice()
                    .reverse()
                    .map((h, i) => (
                      <div className="history-row" key={i}>
                        <div>
                          <strong>
                            {DateTime.fromISO(h.at).toFormat("d LLL, HH:mm")}
                          </strong>
                          <p>{h.content[0].slice(0, 100)}</p>
                        </div>
                        <button
                          className="btn"
                          onClick={() => {
                            setDraft({
                              ...draft,
                              content: h.content,
                              notes: h.notes,
                              date: h.date,
                              time: h.time,
                              media: h.media,
                              status: "revision",
                            });
                            setTab("copy");
                          }}
                        >
                          Restore
                        </button>
                      </div>
                    ))
                )}
              </>
            )}
          </div>
        </section>
        <aside className="preview-column">
          <div className="preview-heading">
            <Eye size={17} />
            <strong>Post preview</strong>
            <span>Approximation</span>
          </div>
          <PostPreview post={draft} assets={assets} profile={profile} Image={AssetImage} onDownload={downloadKit}/>
          <div className="checks">
            <h3>
              <ShieldCheck size={17} /> Before this goes out
            </h3>
            {check.length ? (
              check.map((w) => (
                <p key={w}>
                  <AlertTriangle size={15} />
                  {w}
                </p>
              ))
            ) : (
              <p>
                <Check size={16} /> Automatic text checks are clear. Human
                review still matters.
              </p>
            )}
            {draft.platform === "producthunt" && (
              <p>
                <FileText size={15} /> Publish manually. Personally compose the
                final maker comment.
              </p>
            )}
            <p>
              <LockKeyhole size={15} /> Copy approval is not permission to
              schedule.
            </p>
          </div>
        </aside>
      </div>
      <footer className="editor-footer">
        <div aria-live="polite" className={error ? "error" : "save-message"}>
          {error ||
            message ||
            (dirty
              ? "You have unsaved changes."
              : "Safe to revise. Publishing remains locked.")}
        </div>
        <button
          className="btn"
          onClick={() => download(`${post.id}.md`, exportMD([draft]))}
        >
          <Download size={16} /> Export draft
        </button>
        <button
          className="btn primary"
          disabled={busy || !dirty}
          onClick={save}
        >
          <Save size={17} />
          {busy ? "Saving…" : "Save draft"}
        </button>
      </footer>
    </Modal>
  );
}
function WorkflowPanel({post,dirty,initialOpen,onSaved}:{post:Post;dirty:boolean;initialOpen:boolean;onSaved:(post:Post)=>void}) {
  const [open,setOpen]=useState(initialOpen),[busy,setBusy]=useState(false),[message,setMessage]=useState(""),
    [url,setUrl]=useState(post.publication?.url||""),[confirmed,setConfirmed]=useState(false),
    [submission,setSubmission]=useState(post.publication?.submissionId||"");
  const manual=true;
  const [publishedOptions,setPublishedOptions]=useState<any[]|null>(null),[publishedChoice,setPublishedChoice]=useState(""),[matchConfirmed,setMatchConfirmed]=useState(false);
  async function loadPublished() {
    setBusy(true);setMessage("");
    try {const r=await api(`/blotato/published?platform=${post.platform}`);setPublishedOptions(r.items);if(!r.items.length)setMessage("No published posts found for this platform in the last 90 days.");}
    catch(e:any){setMessage(e.message);}finally{setBusy(false);}
  }
  const queuedNow=isQueued(post.publication),when=DateTime.fromISO(post.scheduledAt).setZone("Europe/Lisbon").toFormat("ccc d LLL, HH:mm")+" Lisbon";
  async function action(kind:string) {
    if(!manual&&kind==="validate"&&!window.confirm(`Confirm and queue this ${post.platform==="twitter"?"X":"LinkedIn"} post in Blotato?\n\nIt will publish automatically on ${when}.`))return;
    if(!manual&&kind==="revise"&&queuedNow&&!window.confirm("Take this post off the Blotato queue so you can revise it?"))return;
    setBusy(true);setMessage("");
    try {
      if(kind==="sync") {
        const result=await api("/blotato/sync",{method:"POST",body:JSON.stringify({postId:post.id})});
        if(result.posts[0])onSaved(result.posts[0]);
        setMessage(result.errors?.join(" ")||"Status checked. Scheduled is not the same as posted.");
      } else if(kind==="match-published") {
        onSaved(await api(`/posts/${post.id}/published-blotato`,{method:"POST",body:JSON.stringify({version:post.version,publishedPostId:publishedChoice})}));
        setMessage("Blotato confirmed the selected post is published.");
      } else {
        const updated=await api(`/posts/${post.id}/${kind==="track"?"blotato":"workflow"}`,{method:"POST",
          body:JSON.stringify(kind==="track"?{version:post.version,submissionId:submission.trim()}:{version:post.version,action:kind,url})});
        onSaved(updated);
        setMessage(kind==="validate"?(manual?"Validated. This post is ready; nothing was scheduled or published.":`Confirmed. Blotato will publish it on ${when}.`)
          :kind==="revise"&&!manual?"Back to revision. If it was queued, it is no longer in the Blotato queue.":"Status saved. No publishing request was sent.");
      }
    }catch(e:any){setMessage(e.message);}finally{setBusy(false);}
  }
  return <section className="workflow-panel" aria-label="Readiness and publication">
    <div className="workflow-actions">
      <button className={`btn ${post.status==="ready"?"validated":"primary"}`} disabled={busy||dirty||post.status==="ready"||warnings(post).length>0}
        onClick={()=>action("validate")}><CheckCircle2 size={17}/>{manual?(post.status==="ready"?"Validated · ready":"Validate as ready"):
          post.status==="ready"?(queuedNow?`Queued · ${DateTime.fromISO(post.scheduledAt).setZone("Europe/Lisbon").toFormat("d LLL HH:mm")}`:"Confirmed"):"Confirm & queue in Blotato"}</button>
      {post.status==="ready"&&post.publication?.state!=="published"&&<button className="text-btn" disabled={busy||dirty} onClick={()=>action("revise")}>Needs changes</button>}
      <button className="btn" aria-expanded={open} onClick={()=>setOpen(!open)}><CheckCheck size={17}/>{isPosted(post)?"Posted details":manual?"Confirm it’s posted":"Track Blotato publication"}</button>
      <small>{dirty?"Save your edits before changing readiness or publication.":manual?"Ready = validated. Posted = already published. Neither action sends a post.":
        queuedNow?"Queued in Blotato. To edit copy, artwork or time, choose Needs changes first.":"Confirm queues this post in Blotato for its saved time. Needs changes takes it off the queue."}</small>
    </div>
    {post.validatedAt&&post.status==="ready"&&<p className="workflow-note">Validated {DateTime.fromISO(post.validatedAt).toFormat("d LLL, HH:mm")}.</p>}
    {open&&<div className="publication-panel">
      {post.publication?.state==="published"?<>
        <p><CheckCheck size={17}/> Posted · {post.publication.source==="manual"?"confirmed by you":"verified by Blotato"}
          {post.publication.confirmedAt&&` · ${DateTime.fromISO(post.publication.confirmedAt).toFormat("d LLL, HH:mm")}`}</p>
        {post.publication.url&&<a className="text-btn" href={post.publication.url} target="_blank" rel="noopener noreferrer">Open published post <ExternalLink size={15}/></a>}
        {post.publication.source==="manual"&&<button className="text-btn" disabled={busy||dirty} onClick={()=>action("undo-manual")}>Undo this confirmation</button>}
      </>:manual?<>
        <label htmlFor="publication-url">{post.platform==="producthunt"?"Published Product Hunt URL":"Published announcement URL"}</label>
        <input id="publication-url" type="url" placeholder={post.platform==="producthunt"?"https://www.producthunt.com/posts/…":"https://…"} value={url} onChange={e=>setUrl(e.target.value)}/>
        <label className="confirmation-check"><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/>I confirm this entry is already published. This only records its status.</label>
        <button className="btn" disabled={busy||dirty||!confirmed||!url.trim()} onClick={()=>action("confirm-published")}><CheckCheck size={16}/>Confirm posted</button>
      </>:<>
        <p>Already published in Blotato? Select the real post to associate it with this draft. Its published state is verified again before saving.</p>
        <button className="btn" disabled={busy||dirty} onClick={loadPublished}><CheckCheck size={16}/>Choose a published Blotato post</button>
        {publishedOptions&&publishedOptions.length>0&&<div className="published-picker">
          <label htmlFor="published-choice">Published posts · most recent 50, last 90 days</label>
          <select id="published-choice" value={publishedChoice} onChange={e=>{setPublishedChoice(e.target.value);setMatchConfirmed(false)}}>
            <option value="">Choose the matching post</option>
            {publishedOptions.map(p=><option key={p.id} value={p.id}>{DateTime.fromISO(p.postTime).toFormat("d LLL")} · {p.text.slice(0,110)||p.id}</option>)}
          </select>
          {publishedChoice&&<><blockquote>{publishedOptions.find(p=>p.id===publishedChoice)?.text}</blockquote>
            <label className="confirmation-check"><input type="checkbox" checked={matchConfirmed} onChange={e=>setMatchConfirmed(e.target.checked)}/>This is the published version of this draft.</label>
            <button className="btn" disabled={busy||dirty||!matchConfirmed} onClick={()=>action("match-published")}>Confirm Blotato match</button>
          </>}
        </div>}
        <details className="submission-tracking"><summary>Track a submission that is still publishing</summary>
        <p>Link the original <code>postSubmissionId</code> returned by Blotato. The app checks its status while you are here and marks Posted only after Blotato confirms publication.</p>
        <label htmlFor="submission-id">Blotato postSubmissionId</label>
        <input id="submission-id" value={submission} onChange={e=>setSubmission(e.target.value)} placeholder="Original submission ID, not a schedule ID"/>
        <div className="workflow-actions"><button className="btn" disabled={busy||dirty||!submission.trim()} onClick={()=>action("track")}>Link & check status</button>
          {post.publication?.submissionId&&<button className="text-btn" disabled={busy||dirty} onClick={()=>action("sync")}><RefreshCw size={15}/>Check again</button>}
        </div>
        {post.publication&&<p className="workflow-note">Blotato: {post.publication.state}{post.publication.error?` · ${post.publication.error}`:""}. {post.publication.state==="in-progress"?"Awaiting a confirmed result; this does not prove that a job exists.":""}</p>}
        </details>
        <small>Blotato must be connected on Fly. Confirmed posts are queued in Blotato and publish at their saved time.</small>
      </>}
    </div>}
    {message&&<p className="workflow-feedback" role="status">{message}</p>}
  </section>;
}
function ProfileSettings() {
  const client=useQueryClient();
  const q=useQuery({queryKey:["profile"],queryFn:()=>api("/profile") as Promise<PreviewProfile>});
  const [draft,setDraft]=useState<PreviewProfile>(defaultProfile),[busy,setBusy]=useState(false),[message,setMessage]=useState("");
  useEffect(()=>{if(q.data)setDraft(q.data)},[q.data]);
  async function save(e:React.FormEvent) {
    e.preventDefault();setBusy(true);setMessage("");
    try {const value=await api("/profile",{method:"PUT",body:JSON.stringify(draft)});client.setQueryData(["profile"],value);setMessage("Preview profile saved. Your LinkedIn and X profiles were not changed.");}
    catch(e:any){setMessage(e.message);}finally{setBusy(false);}
  }
  async function photo(file:File|undefined) {
    if(!file)return;
    if(file.size>300000||!["image/png","image/jpeg","image/webp"].includes(file.type)){setMessage("Choose a PNG, JPEG or WebP portrait under 300 KB.");return;}
    const reader=new FileReader();
    reader.onload=()=>setDraft(p=>({...p,avatarDataUrl:String(reader.result)}));
    reader.readAsDataURL(file);
  }
  return <section className="connection-card profile-settings">
    <div className="connection-title"><UserRound size={24}/><div><h2>Your preview profile</h2><p>Used in the LinkedIn, X and maker-comment previews</p></div></div>
    <div className="profile-summary"><img src={draft.avatarDataUrl||BRAND+"paul-avatar.png"} alt={draft.name}/><div><strong>{draft.name}</strong><p>{draft.headline}</p><small>@{draft.xHandle}</small></div></div>
    <p className="small-note">The default portrait is your existing GitHub avatar, not a verified LinkedIn photo. Replace it here if your social profile uses a different image.</p>
    <div className="profile-links"><a href="https://www.linkedin.com/in/paulfxyz" target="_blank" rel="noopener noreferrer">Your LinkedIn <ExternalLink size={13}/></a><a href="https://twitter.com/paulfxyz" target="_blank" rel="noopener noreferrer">Your X <ExternalLink size={13}/></a></div>
    <details><summary>Edit preview identity</summary><form onSubmit={save}>
      <label htmlFor="profile-name">Display name</label><input id="profile-name" maxLength={80} value={draft.name} onChange={e=>setDraft({...draft,name:e.target.value})} required/>
      <label htmlFor="profile-headline">Preview headline</label><input id="profile-headline" maxLength={180} value={draft.headline} onChange={e=>setDraft({...draft,headline:e.target.value})}/>
      <label htmlFor="profile-handle">X handle (without @)</label><input id="profile-handle" maxLength={15} pattern="[A-Za-z0-9_]+" value={draft.xHandle} onChange={e=>setDraft({...draft,xHandle:e.target.value})} required/>
      <label htmlFor="profile-photo">Profile picture · PNG, JPEG or WebP, under 300 KB</label><input id="profile-photo" type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>photo(e.target.files?.[0])}/>
      {draft.avatarDataUrl&&<button className="text-btn" type="button" onClick={()=>setDraft({...draft,avatarDataUrl:""})}>Use original GitHub avatar</button>}
      <button className="btn primary" disabled={busy}>{busy?"Saving…":"Save preview profile"}</button>
    </form></details>
    {message&&<p role="status">{message}</p>}
  </section>;
}
function Login({
  onLogin,
  theme,
  toggle,
  mode,
  setupToken,
}: {
  onLogin: (t: string) => void;
  theme: string;
  toggle: () => void;
  mode: string;
  setupToken: string;
}) {
  const [email, setEmail] = useState("owner@example.com"),
    [code, setCode] = useState(""),
    [sent, setSent] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [password,setPassword]=useState("");
  const [confirmation,setConfirmation]=useState("");
  const [setupComplete,setSetupComplete]=useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (mode === "setup" && !setupComplete) {
        if(password !== confirmation) throw new Error("The passwords do not match.");
        if(password.length < 16) throw new Error("Choose a password of at least 16 characters.");
        await api("/bootstrap",{method:"POST",body:JSON.stringify({email,password,setupToken})});
        setSetupComplete(true);
      }
      if (mode === "password" || mode === "setup") {
        const r=await api("/auth/password",{method:"POST",body:JSON.stringify({email,password})});
        setPassword("");setConfirmation("");onLogin(r.token);
      } else if (sent) {
        const r = await api("/auth/verify", {
          method: "POST",
          body: JSON.stringify({ email, code }),
        });
        onLogin(r.token);
      } else {
        await api("/auth/start", {
          method: "POST",
          body: JSON.stringify({ email }),
        });
        setSent(true);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="login">
      <button
        className="icon-btn theme-login"
        aria-label="Toggle theme"
        onClick={toggle}
      >
        {theme === "light" ? <Moon /> : <Sun />}
      </button>
      <section className="login-story">
        <div className="identity">
          <img src={BRAND+"kitty-head.webp"} alt="Weekathon kitty" />
          <span>
            PF <Heart className="heart" size={21} fill="currentColor" /> PH
          </span>
        </div>
        <h1>
          Great launches{" "}
          <br />
          start with{" "}
          <br />
          <span>a better draft.</span>
        </h1>
        <p>
          A private place for the words, the artwork,
          <br />
          and the little things that make them better.
        </p>
        <img
          className="login-kitty"
          src={BRAND+"kitty.webp"}
          alt="Original Weekathon laptop kitty"
        />
        <small>WEEKATHON · THE SOCIAL WORKSPACE</small>
      </section>
      <section className="login-form">
        <div>
          <LockKeyhole size={25} />
          <h2>{mode === "setup" ? "Make this space yours." : "Your launch room."}</h2>
          <p>
            {mode === "setup" ? "Choose your private password. This one-time setup link stops working as soon as your password is saved."
              : "Sign in to review the campaign. Nothing gets posted from the sign-in screen."}
          </p>
          <form onSubmit={submit}>
            <label htmlFor="email">Your email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={sent || mode === "setup"}
              autoComplete="email"
              required
            />
            {(mode === "password" || mode === "setup") && <>
              <label htmlFor="password">{mode === "setup" ? "Choose a password" : "Password"}</label>
              <input id="password" type="password" autoComplete={mode === "setup" ? "new-password" : "current-password"} minLength={mode === "setup" ? 16 : undefined} maxLength={256} value={password} onChange={e=>setPassword(e.target.value)} required />
              {mode === "setup" && <>
                <label htmlFor="confirm-password">Confirm your password</label>
                <input id="confirm-password" type="password" autoComplete="new-password" minLength={16} maxLength={256} value={confirmation} onChange={e=>setConfirmation(e.target.value)} required />
              </>}
              <p>{mode === "setup" ? "Use at least 16 characters. Your password is hashed on Fly.io, not saved in Computer’s credential vault." : "Private sign-in. Your drafts and revisions stay on this app’s persistent Fly.io storage."}</p>
            </>}
            {sent && (
              <>
                <p>Open the sign-in link in your email. If the email includes a code instead, enter it here.</p>
                <label htmlFor="otp">Email verification code</label>
                <input
                  id="otp"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="Paste the code from your email"
                  required
                />
              </>
            )}
            <button className="btn primary" disabled={busy}>
              {busy
                ? "One moment…"
                : mode === "setup"
                  ? "Create password & enter"
                : mode === "password" || sent
                  ? "Enter the workspace"
                  : "Send a sign-in email"}{" "}
              <ArrowUpRight size={16} />
            </button>
          </form>
          {sent && (
            <button
              className="text-btn"
              onClick={() => {
                setSent(false);
                setCode("");
              }}
            >
              Use another email / resend
            </button>
          )}
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          <div className="login-safety">
            <ShieldCheck size={17} /> Restricted to Paul's account. No public
            signup.
          </div>
        </div>
        <a className="attribution" href="https://www.perplexity.ai/computer">
          Built with Perplexity Computer
        </a>
      </section>
    </div>
  );
}
createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={qc}>
    <App />
  </QueryClientProvider>,
);
