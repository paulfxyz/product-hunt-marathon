import React,{useEffect,useRef,useState} from "react";
import {phKit,type KitFile,type KitDownloader} from "./phKit";
export type {KitFile,KitDownloader};
import {ArrowUp,ArrowUpRight,Bookmark,Download,ChevronLeft,ChevronRight,Globe,Heart,Maximize2,MessageCircle,MoreHorizontal,Repeat2,Send,Share2,ThumbsUp,X,BarChart3} from "lucide-react";
import type {Asset,Post,PreviewProfile} from "../shared/schema";
import {followupComments} from "../shared/followup";

type ImageComponent=React.ComponentType<{asset:Asset|undefined;className?:string;onClick?:()=>void;full?:boolean}>;
function PostingKit({slug,icons,gallery,all,onDownload}:{slug:string;icons:Asset[];gallery:Asset[];all:Asset[];onDownload:KitDownloader}){
  const [busy,setBusy]=useState(""),[error,setError]=useState("");
  const files=phKit(slug,icons,gallery,all);
  const run=async(key:string,list:KitFile[],zip?:string)=>{setBusy(key);setError("");try{await onDownload(list,zip);}catch(e:any){setError(e.message||"Download failed. Please retry.");}finally{setBusy("");}};
  return <section className="ph-kit" aria-label="Files for posting on Product Hunt">
    <div className="ph-kit-head"><strong>Posting kit</strong><span>Icon, thumbnail and gallery as original files, numbered in upload order. Static PNGs are the safe choice; animated GIFs are optional.</span>
      <button className="btn" disabled={!!busy} onClick={()=>run("all",files,`${slug}-product-hunt-kit.zip`)}><Download size={16}/>{busy==="all"?"Preparing…":`Download all (${files.length} files, ZIP)`}</button></div>
    <ul>{files.map(f=><li key={f.name}><span>{f.name}</span><small>{f.resize?`${f.resize} × ${f.resize}`:`${f.asset.width} × ${f.asset.height}`}</small>
      <button className="text-btn" disabled={!!busy} onClick={()=>run(f.name,[f])}><Download size={14}/>{busy===f.name?"…":"Download"}</button></li>)}</ul>
    {error&&<p className="error" role="alert">{error}</p>}
  </section>;
}
const brand=import.meta.env.BASE_URL+"brand/";
function profileImage(p:PreviewProfile){return p.avatarDataUrl || brand+"paul-avatar.png";}
function listing(post:Post) {
  const first=post.content[0]||"";
  const field=(key:string)=>first.match(new RegExp(`^\\s*[-*]?\\s*${key}:\\s*(.+)$`,"im"))?.[1]?.trim()||"";
  const raw=field("Website")||field("Destination");
  const website=raw.match(/https:\/\/[^\s)]+/)?.[0]||"";
  return {name:field("Name")||post.project,tagline:field("Tagline"),description:field("Description"),website};
}
export function Gallery({assets,Image,kind="producthunt"}:{assets:Asset[];Image:ImageComponent;kind?:string}) {
  const [index,setIndex]=useState(0),[large,setLarge]=useState(false);
  const dialog=useRef<HTMLDialogElement>(null);
  const current=Math.min(index,Math.max(assets.length-1,0));
  const move=(n:number)=>setIndex((current+n+assets.length)%assets.length);
  useEffect(()=>{if(large)dialog.current?.showModal();else dialog.current?.close();},[large]);
  if(!assets.length)return <div className="preview-no-art">Choose artwork in the Artwork tab to preview it here.</div>;
  const keys=(e:React.KeyboardEvent)=>{
    if(e.key==="ArrowLeft"||e.key==="ArrowRight"){e.preventDefault();e.stopPropagation();move(e.key==="ArrowLeft"?-1:1);}
  };
  return <div className={`preview-gallery ${kind}`} onKeyDown={keys}>
    <div className="gallery-stage">
      <button className="gallery-open" aria-label={`Enlarge screenshot ${current+1} of ${assets.length}`} onClick={()=>setLarge(true)}>
        <Image asset={assets[current]} />
        <span className="gallery-enlarge"><Maximize2 size={16}/> Enlarge</span>
      </button>
      {assets.length>1&&<>
        <button className="gallery-arrow previous" aria-label="Previous screenshot" onClick={()=>move(-1)}><ChevronLeft size={20}/></button>
        <button className="gallery-arrow next" aria-label="Next screenshot" onClick={()=>move(1)}><ChevronRight size={20}/></button>
      </>}
      <span className="gallery-counter">{current+1} / {assets.length}</span>
    </div>
    {assets.length>1&&<div className="gallery-thumbnails" aria-label="Screenshot gallery">
      {assets.map((a,i)=><button key={a.id} aria-label={`Screenshot ${i+1} of ${assets.length}: ${a.name}`} aria-pressed={current===i}
        onClick={()=>setIndex(i)}><Image asset={a}/></button>)}
    </div>}
    <dialog className="gallery-lightbox" ref={dialog} onCancel={e=>{e.preventDefault();e.stopPropagation();setLarge(false);}}
      onClick={e=>{e.stopPropagation();if(e.target===dialog.current)setLarge(false);}} onKeyDown={keys}>
      <header><span>{assets[current].project} · {assets[current].name} · {current+1}/{assets.length}</span>
        <button className="icon-btn" aria-label="Close screenshot viewer" onClick={()=>setLarge(false)}><X/></button></header>
      <Image asset={assets[current]} full />
      <footer>
        <button className="btn" onClick={()=>move(-1)} disabled={assets.length<2}><ChevronLeft size={17}/>Previous</button>
        <span>Original resolution · use arrow keys</span>
        <button className="btn" onClick={()=>move(1)} disabled={assets.length<2}>Next<ChevronRight size={17}/></button>
      </footer>
    </dialog>
  </div>;
}
function FeedActions({platform}:{platform:"twitter"|"linkedin"}) {
  const [hint,setHint]=useState("");
  const items=platform==="linkedin"
    ? [[ThumbsUp,"Like"],[MessageCircle,"Comment"],[Repeat2,"Repost"],[Send,"Send"]] as const
    : [[MessageCircle,"Reply"],[Repeat2,"Repost"],[Heart,"Like"],[BarChart3,"Views"],[Bookmark,"Bookmark"],[Share2,"Share"]] as const;
  return <>
    <div className={`feed-actions ${platform}`}>
      {items.map(([Icon,label])=><button key={label} title={`${label} · preview only`} aria-label={`${label} (preview only)`}
        onClick={()=>setHint(`${label} is shown for preview only. Nothing is sent and no engagement is recorded.`)}>
        <Icon size={18}/>{platform==="linkedin"&&<span>{label}</span>}
      </button>)}
    </div>
    {hint&&<p className="preview-action-hint" role="status">{hint}</p>}
  </>;
}
export function PostPreview({post,assets,profile,Image,onDownload}:{post:Post;assets:Asset[];profile:PreviewProfile;Image:ImageComponent;onDownload?:KitDownloader}) {
  const [expanded,setExpanded]=useState(false),[phView,setPhView]=useState("page");
  const selected=post.media.map(id=>assets.find(a=>a.id===id)).filter(Boolean) as Asset[];
  if(post.platform==="producthunt") {
    const info=listing(post),icons=assets.filter(a=>a.project===post.projectSlug&&(a.channel==="brand"||a.channel==="icon")),icon=icons.find(a=>!a.file.endsWith(".gif"))||icons[0];
    return <div className="ph-preview-shell">
      <div className="preview-view-switch" role="group" aria-label="Product Hunt preview layout">
        <button className={phView==="page"?"selected":""} onClick={()=>setPhView("page")}>Product page</button>
        <button className={phView==="feed"?"selected":""} onClick={()=>setPhView("feed")}>Launch feed</button>
      </div>
      <div className="ph-site-bar"><b>P</b><strong>Product Hunt</strong><span>Draft preview</span></div>
      {phView==="feed"?<div className="ph-feed-item">
        <Image asset={icon} className="ph-product-icon"/>
        <div><h3>{info.name}</h3><p>{info.tagline}</p><button className="text-btn" onClick={()=>setPhView("page")}>Open product preview <ArrowUpRight size={14}/></button></div>
        <button className="ph-upvote" title="Preview only" disabled><ArrowUp size={18}/>Upvote</button>
      </div>:<>
        <div className="ph-product-header"><Image asset={icon} className="ph-product-icon"/>
          <div><h3>{info.name}</h3><p>{info.tagline}</p></div></div>
        <div className="ph-product-actions">
          {info.website&&<a className="btn" href={info.website} target="_blank" rel="noopener noreferrer">Visit website <ArrowUpRight size={15}/></a>}
          <button className="ph-upvote" disabled title="Layout preview only; no votes are requested"><ArrowUp size={17}/>Upvote</button>
        </div>
        <div className="ph-tabs"><strong>Overview</strong><span>Reviews</span><span>Launches</span></div>
        <p className="ph-description">{info.description || info.tagline}</p>
        <Gallery assets={selected} Image={Image}/>
        {onDownload&&<PostingKit slug={post.projectSlug} icons={icons} gallery={selected} all={assets} onDownload={onDownload}/>}
        <section className="ph-maker">
          <div className="feed-author"><img src={profileImage(profile)} alt={profile.name}/><div><strong>{profile.name} <span className="maker-label">Maker</span></strong><small>First comment preview · personalise before posting</small></div></div>
          <p className="feed-copy">{expanded?(post.content[1]||""):(post.content[1]||"").slice(0,650)}</p>
          {(post.content[1]||"").length>650&&<button className="text-btn" onClick={()=>setExpanded(!expanded)}>{expanded?"Show less":"Read full maker comment"}</button>}
        </section>
        {post.content.length>2&&<section className="ph-followups" aria-label="Product Hunt replies to the maker comment">
          <p className="small-note">Post the maker comment (1/{post.content.length-1}) first, then each part below as a reply to it, in order. Copy the full text, number included.</p>
          {post.content.slice(2).map((text,index)=><details className="linkedin-followup" key={index}>
            <summary>Reply {index+2}/{post.content.length-1} to the maker comment · {text.length} characters</summary>
            <p className="feed-copy">{text}</p>
          </details>)}
        </section>}
      </>}
      <p className="preview-truth">Layout approximation, not a live Product Hunt page. No invented votes or reviews.</p>
    </div>;
  }
  if(post.platform==="twitter") return <div className="x-feed-shell">
    <div className="social-feed-title">Home <span>For you · Following</span></div>
    {post.content.map((text,i)=><article className="x-post" key={i}>
      <div className={"x-avatar-column "+(i<post.content.length-1?"has-thread":"")}><img src={profileImage(profile)} alt={profile.name}/></div>
      <div className="x-post-body">
        <div className="x-author"><strong>{profile.name}</strong><span>@{profile.xHandle} · {i?"Reply":"Now"}</span><MoreHorizontal size={17}/></div>
        <p className="feed-copy">{text}</p>
        {i===0&&selected.length>0&&<Gallery assets={selected} Image={Image} kind="twitter"/>}
        <FeedActions platform="twitter"/>
      </div>
    </article>)}
    <p className="preview-truth">X feed approximation. Thread replies shown in order; engagement counts are intentionally absent.</p>
  </div>;
  return <div className="linkedin-feed-shell">
    <div className="social-feed-title"><b>in</b> Home feed <span>Preview</span></div>
    <article className="linkedin-feed-card">
      <div className="feed-author"><img src={profileImage(profile)} alt={profile.name}/>
        <div><strong>{profile.name} <span>· You</span></strong><small>{profile.headline}</small><small>Just now · <Globe size={12}/></small></div>
        <MoreHorizontal size={19}/>
      </div>
      <div className="linkedin-copy"><p className="feed-copy">{expanded?post.content.join("\n\n"):post.content.join("\n\n").slice(0,260)}</p>
        {post.content.join("\n\n").length>260&&<button className="feed-more" onClick={()=>setExpanded(!expanded)}>{expanded?"Show less":"…see more"}</button>}
      </div>
      {selected.length>0&&<Gallery assets={selected} Image={Image} kind="linkedin"/>}
      <div className="linkedin-engagement"><span>No engagement yet · unpublished preview</span></div>
      <FeedActions platform="linkedin"/>
      {followupComments(post.notes).map((text,index)=><details className="linkedin-followup" key={index}>
        <summary>{index===0?"Top-level comment":"Reply to the first comment"} · {text.match(/^(\d+\/\d+) · /)?.[1]||`comment ${index+1}`} · {text.length} characters</summary>
        <div className="feed-author"><img src={profileImage(profile)} alt=""/><strong>{profile.name}</strong></div>
        <p className="feed-copy">{text}</p>
        <small>Not automatically published or scheduled.</small>
      </details>)}
    </article>
    <p className="preview-truth">LinkedIn feed approximation. Your preview identity is editable in Connections; it does not change your social profiles.</p>
  </div>;
}
