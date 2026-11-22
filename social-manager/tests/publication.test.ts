import test from "node:test";
import assert from "node:assert/strict";
import {publicationFromBlotato,isPosted,validPublicationUrl} from "../shared/rules";
test("scheduled and in-progress receipts are never called published",()=>{
  for(const status of ["in-progress","scheduled","failed"]) {
    const publication=publicationFromBlotato({platform:"twitter"},"submission-123",{postSubmissionId:"submission-123",status});
    assert.equal(isPosted({status:"ready",publication}),false);
  }
});
test("provider publication requires a matching submission and platform",()=>{
  const publication=publicationFromBlotato({platform:"twitter"},"submission-123",{postSubmissionId:"submission-123",status:"published",publicUrl:"https://x.com/paulfxyz/status/123"});
  assert.equal(isPosted({status:"ready",publication}),true);
  assert.throws(()=>publicationFromBlotato({platform:"linkedin"},"submission-123",{status:"published",publicUrl:"https://x.com/paulfxyz/status/123"}));
  assert.throws(()=>publicationFromBlotato({platform:"twitter"},"submission-123",{postSubmissionId:"wrong-submission",status:"published"}));
  assert.equal(validPublicationUrl("producthunt","javascript:alert(1)"),false);
  assert.equal(validPublicationUrl("producthunt","https://producthunt.com.evil.invalid/posts/example"),false);
});
