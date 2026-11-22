import { z } from "zod";
export const platformSchema = z.enum([
  "linkedin",
  "twitter",
  "producthunt",
  "announcement",
]);
export const statusSchema = z.enum([
  "draft",
  "revision",
  "copy-approved",
  "ready",
  "skipped",
  "published-manually",
]);
export const publicationSchema = z.object({
  source:z.enum(["manual","blotato"]),
  state:z.enum(["linked","in-progress","scheduled","published","failed"]),
  submissionId:z.string().optional(),
  scheduleId:z.string().optional(),
  publishedPostId:z.string().optional(),
  url:z.string().optional(),
  confirmedAt:z.string().optional(),
  checkedAt:z.string().optional(),
  scheduledTime:z.string().optional(),
  error:z.string().optional(),
});
export const postSchema = z.object({
  id: z.string(),
  project: z.string(),
  projectSlug: z.string(),
  platform: platformSchema,
  title: z.string(),
  date: z.string(),
  time: z.string(),
  scheduledAt: z.string(),
  timezone: z.literal("Europe/Lisbon"),
  content: z.array(z.string().max(20000)).min(1).max(30),
  source: z.string(),
  sourceMarkdown: z.string(),
  notes: z.string().max(50000),
  status: statusSchema,
  optional: z.boolean(),
  media: z.array(z.string()),
  version: z.number(),
  updatedAt: z.string(),
  validatedAt:z.string().optional(),
  publication:publicationSchema.optional(),
  history: z
    .array(
      z.object({
        at: z.string(),
        content: z.array(z.string()),
        notes: z.string(),
        date: z.string(),
        time: z.string(),
        status: statusSchema,
        media: z.array(z.string()),
        validatedAt:z.string().optional(),
        publication:publicationSchema.optional(),
      }),
    )
    .default([]),
});
export type Post = z.infer<typeof postSchema>;
export type Platform = z.infer<typeof platformSchema>;
export interface Asset {
  id: string;
  project: string;
  channel: string;
  name: string;
  file: string;
  width: number;
  height: number;
  alt: string;
  revision?: string;
}
export interface Campaign {
  posts: Post[];
  assets: Asset[];
  revision: number;
  updatedAt: string;
}
export const previewProfileSchema=z.object({
  name:z.string().trim().min(1).max(80),
  headline:z.string().max(180),
  xHandle:z.string().regex(/^[A-Za-z0-9_]{1,15}$/),
  avatarDataUrl:z.string().max(450000).default(""),
});
export type PreviewProfile=z.infer<typeof previewProfileSchema>;
export const defaultProfile:PreviewProfile={
  name:"Paul Fleury",headline:"Internet entrepreneur. Building things. Lisbon.",
  xHandle:"paulfxyz",avatarDataUrl:"",
};
export const patchSchema = z.object({
  version: z.number().int(),
  content: z.array(z.string().max(20000)).min(1).max(30),
  notes: z.string().max(50000),
  status: statusSchema,
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  media: z.array(z.string()).max(10),
});

// Names the draft field that failed validation, with its size where relevant.
const DRAFT_FIELD_LABELS:Record<string,string>={content:"Post copy",notes:"Your notes",date:"Date",time:"Time",status:"Review status",media:"Artwork",version:"Draft version"};
export function draftIssueMessage(issues:z.ZodIssue[],input:any):string{
  const n=(x:unknown)=>Number(x).toLocaleString("en-US");
  const parts=issues.slice(0,3).map((i:any)=>{
    const [field,idx]=i.path||[];
    let label=DRAFT_FIELD_LABELS[field]||String(field??"Draft");
    const multi=field==="content"&&Array.isArray(input?.content)&&input.content.length>1;
    if(field==="content"&&typeof idx==="number"&&multi)label+=` (part ${idx+1})`;
    if(i.code==="too_big"&&i.type==="string"){
      const v=field==="content"?input?.content?.[idx]:input?.[field];
      return `${label} is too long (${typeof v==="string"?n(v.length):"?"} / ${n(i.maximum)} characters).`;
    }
    if(i.code==="too_big"&&i.type==="array")return `${label} has too many items (maximum ${n(i.maximum)}).`;
    if(i.code==="too_small"&&i.type==="array")return `${label} needs at least ${n(i.minimum)} item.`;
    if(field==="date")return "Date must be a valid date (YYYY-MM-DD).";
    if(field==="time")return "Time must be in HH:MM format.";
    return `${label}: ${i.message}`;
  });
  if(issues.length>3)parts.push(`(${issues.length-3} more issue${issues.length-3>1?"s":""}.)`);
  return parts.join(" ");
}
