import { DateTime } from "luxon";
import type { Post } from "./schema";
export const platformNames = {
  twitter: "X",
  linkedin: "LinkedIn",
  producthunt: "Product Hunt",
  announcement: "Announcement",
};
export function isPosted(post:Pick<Post,"status"|"publication">) {
  return post.publication?.state==="published" || post.status==="published-manually";
}
export function validPublicationUrl(platform:string,raw:string) {
  try {
    const u=new URL(raw);
    if(u.protocol!=="https:" || u.username || u.password) return false;
    const host=u.hostname.replace(/^www\./,"");
    if(platform==="producthunt") return host==="producthunt.com" && u.pathname!=="/";
    if(platform==="twitter") return ["x.com","twitter.com"].includes(host) && /\/status\/\d+/.test(u.pathname);
    if(platform==="linkedin") return host==="linkedin.com" && /^\/(feed\/update|posts)\//.test(u.pathname);
    return platform==="announcement";
  } catch {return false;}
}
export function publicationFromBlotato(post:Pick<Post,"platform">,submissionId:string,result:any):NonNullable<Post["publication"]> {
  if(result.postSubmissionId && result.postSubmissionId!==submissionId) throw new Error("Blotato returned a different submission ID.");
  if(!["in-progress","scheduled","published","failed"].includes(result.status)) throw new Error("Unrecognized Blotato publication state.");
  if(result.publicUrl && !validPublicationUrl(post.platform,result.publicUrl)) throw new Error("This publication URL belongs to a different platform.");
  return {source:"blotato",state:result.status,submissionId,
    url:result.status==="published"?result.publicUrl||undefined:undefined,
    checkedAt:new Date().toISOString(),
    confirmedAt:result.status==="published"?new Date().toISOString():undefined,
    scheduledTime:result.scheduledTime,
    error:result.status==="failed"?String(result.errorMessage||"Blotato reported a publishing failure.").slice(0,500):undefined};
}
export function utcTime(date: string, time: string) {
  const dt = DateTime.fromISO(`${date}T${time}`, { zone: "Europe/Lisbon" });
  if (!dt.isValid) throw new Error("Choose a valid date and Lisbon time.");
  return dt.toUTC().toISO()!;
}
/** Blotato rejects X threads longer than this (first post + 10 additionalPosts). */
export const BLOTATO_MAX_THREAD = 11;
export function queued(p:{publication?:{source:string;state:string}}){return p.publication?.source==="blotato"&&["scheduled","in-progress"].includes(p.publication.state);}
export function countX(text: string) {
  // Conservative display estimate. Provider's final URL/Unicode weighting can differ.
  return Array.from(text.replace(/https?:\/\/[^\s]+/g, "x".repeat(23))).length;
}
export function warnings(
  post: Pick<Post, "content" | "platform" | "projectSlug">,
): string[] {
  const text = post.content.join("\n");
  const out: string[] = [];
  if (/\{\{[^}]+\}\}/.test(text))
    out.push("Replace the placeholder launch URL.");
  if (
    /BUILD DRAFT|Draft build notes|Illustrative.*budget|not verified/i.test(
      text,
    )
  )
    out.push("Unverified build details or estimated costs remain in the copy.");
  if (post.platform === "twitter" && post.content.some((t) => countX(t) > 280))
    out.push("At least one X post exceeds the estimated 280-character limit.");
  if (post.platform === "twitter" && post.content.length > BLOTATO_MAX_THREAD)
    out.push(`This X thread has ${post.content.length} posts; Blotato accepts at most ${BLOTATO_MAX_THREAD}.`);
  if (post.platform === "linkedin" && post.content.join("\n\n").length > 3000)
    out.push("LinkedIn copy exceeds 3,000 characters.");
  if (!text.trim()) out.push("The post is empty.");
  if (
    ["openline", "enki"].includes(post.projectSlug) &&
    /US\$|\$\s*\d|AI build budget/i.test(text)
  )
    out.push("No AI cost estimates should appear for this project.");
  return out;
}
