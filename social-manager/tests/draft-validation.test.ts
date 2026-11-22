import test from "node:test";
import assert from "node:assert/strict";
import { patchSchema, draftIssueMessage } from "../shared/schema";
const base={version:1,content:["hi"],notes:"",status:"revision",date:"2026-11-06",time:"10:01",media:[]};
const msg=(o:any)=>{const r=patchSchema.safeParse(o);return r.success?"OK":draftIssueMessage(r.error.issues,o);};
test("notes accept up to 50,000 characters",()=>{
  assert.equal(msg({...base,notes:"x".repeat(50000)}),"OK");
  assert.equal(msg({...base,notes:"x".repeat(50013)}),"Your notes is too long (50,013 / 50,000 characters).");
});
test("validation errors name the field",()=>{
  assert.equal(msg({...base,content:["a","b".repeat(20500)]}),"Post copy (part 2) is too long (20,500 / 20,000 characters).");
  assert.equal(msg({...base,date:"06/11/2026",time:"10h"}),"Date must be a valid date (YYYY-MM-DD). Time must be in HH:MM format.");
  assert.equal(msg({...base,media:Array(11).fill("a")}),"Artwork has too many items (maximum 10).");
});
