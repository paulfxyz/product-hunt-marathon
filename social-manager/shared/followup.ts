const start = "<!-- LINKEDIN_FOLLOWUP_START -->";
const end = "<!-- LINKEDIN_FOLLOWUP_END -->";
export function followupComments(notes: string): string[] {
  return followupComment(notes).split(/\n\s*---\s*\n/).map(t=>t.trim()).filter(Boolean);
}
export function followupComment(notes: string): string {
  const a=notes.indexOf(start), b=notes.indexOf(end,a);
  return a>=0&&b>a?notes.slice(a+start.length,b).trim():"";
}
export function withFollowupComment(notes: string, text: string): string {
  const a=notes.indexOf(start), b=notes.indexOf(end,a);
  const block=`${start}\n${text}\n${end}`;
  return a>=0&&b>a?notes.slice(0,a)+block+notes.slice(b+end.length):notes+"\n\n"+block;
}
const NUM=/^\d+\/\d+ · /;
// Rewrites leading "N/M · " numbers after a comment is added or removed (only when the set already uses them).
export function renumberComments(list: string[]): string[] {
  if(!list.some(t=>NUM.test(t))) return list;
  return list.map((t,i)=>`${i+1}/${list.length} · `+t.replace(NUM,""));
}
// The text that is actually stored: blank or number-only comments dropped, numbering kept consistent.
export function joinComments(list: string[]): string {
  return renumberComments(list.map(t=>t.trim()).filter(t=>t&&!/^\d+\/\d+ ·$/.test(t))).join("\n\n---\n\n");
}
