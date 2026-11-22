import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
process.env.DB_PATH ??= join(mkdtempSync(join(tmpdir(),"ph-origin-")),"data.db");
const { sameOrigin, allowedOrigins } = await import("../server/fly-store");
const req=(origin?:string)=>({headers:origin?{origin}:{}} as any);
test("custom domain login: canonical APP_URL plus explicit fly.dev fallback only",()=>{
  const saved={u:process.env.APP_URL,a:process.env.APP_ALT_ORIGINS};
  try{
    process.env.APP_URL="https://social.paulfleury.com";
    process.env.APP_ALT_ORIGINS=" https://ph-social-manager.fly.dev/ , javascript:alert(1), http://insecure.example";
    assert.deepEqual(allowedOrigins(),["https://social.paulfleury.com","https://ph-social-manager.fly.dev"]);
    assert.ok(sameOrigin(req()));
    assert.ok(sameOrigin(req("https://social.paulfleury.com")));
    assert.ok(sameOrigin(req("https://ph-social-manager.fly.dev")));
    for(const o of ["https://evil.invalid","http://social.paulfleury.com","https://social.paulfleury.com.evil.invalid","http://insecure.example"])assert.equal(sameOrigin(req(o)),false,o);
    delete process.env.APP_ALT_ORIGINS;
    assert.equal(sameOrigin(req("https://ph-social-manager.fly.dev")),false);
  }finally{process.env.APP_URL=saved.u;if(saved.a===undefined)delete process.env.APP_ALT_ORIGINS;else process.env.APP_ALT_ORIGINS=saved.a;}
});
