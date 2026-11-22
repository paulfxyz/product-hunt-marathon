import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
const dir=mkdtempSync(join(tmpdir(),"ph-fly-test-"));
Object.assign(process.env,{
  STORAGE_MODE:"fly",DB_PATH:join(dir,"data.db"),NODE_ENV:"production",
  DEV_PREVIEW:"true",FLY_APP_NAME:"ph-social-manager",
  APP_URL:"https://ph-social-manager.fly.dev",BOOTSTRAP_TOKEN:"test-bootstrap-not-a-real-secret",
  APP_SECRET:"test-encryption-key-not-a-real-secret"
});
const {app}=await import("../server/app");
test("Fly auth, persistent drafts, origin checks, setup lock, and logout",async()=>{
  const server=app.listen(0,"127.0.0.1");await once(server,"listening");
  const base=`http://127.0.0.1:${(server.address() as any).port}/api`;
  const body={email:"owner@example.com",password:"test-only-password-with-32-characters"};
  const json={"Content-Type":"application/json"};
  try {
    const session=await (await fetch(base+"/session")).json();
    assert.equal(session.mode,"password");assert.equal(session.previewToken,undefined);
    assert.equal((await fetch(base+"/campaign")).status,401);
    assert.equal((await fetch(base+"/bootstrap",{method:"POST"})).status,403);
    const setupBody=JSON.stringify({...body,setupToken:process.env.BOOTSTRAP_TOKEN});
    assert.equal((await fetch(base+"/bootstrap",{method:"POST",headers:{...json,Origin:"https://evil.invalid"},body:setupBody})).status,403);
    process.env.BOOTSTRAP_EXPIRES="1";
    assert.equal((await fetch(base+"/bootstrap",{method:"POST",headers:json,body:setupBody})).status,403);
    delete process.env.BOOTSTRAP_EXPIRES;
    assert.equal((await fetch(base+"/bootstrap",{method:"POST",headers:json,body:setupBody})).status,200);
    assert.equal((await fetch(base+"/bootstrap",{method:"POST",headers:json,body:setupBody})).status,409);
    const response=await fetch(base+"/auth/password",{method:"POST",headers:json,body:JSON.stringify(body)});
    assert.equal(response.status,200);
    const token=(await response.json()).token;
    const cookie=response.headers.get("set-cookie")!;
    assert.match(cookie,/HttpOnly/);assert.match(cookie,/Secure/);assert.match(cookie,/SameSite=Strict/);
    assert.equal((await (await fetch(base+"/session",{headers:{Cookie:cookie.split(";")[0]}})).json()).authenticated,true);
    const headers={...json,Authorization:`Bearer ${token}`};
    const campaign=await (await fetch(base+"/campaign",{headers})).json();
    const p=campaign.posts[0], payload={version:p.version,content:p.content,notes:"Persistent test note",date:p.date,time:p.time,status:"revision",media:p.media};
    const path=base+"/posts/"+p.id;
    assert.equal((await fetch(path,{method:"PATCH",headers:{...headers,Origin:"https://evil.invalid"},body:JSON.stringify(payload)})).status,403);
    assert.equal((await fetch(path,{method:"PATCH",headers,body:JSON.stringify(payload)})).status,200);
    assert.equal((await fetch(path,{method:"PATCH",headers,body:JSON.stringify(payload)})).status,409);
    const saved=await (await fetch(base+"/campaign",{headers})).json();
    assert.equal(saved.posts[0].notes,"Persistent test note");
    const junk=saved.posts.find((p:any)=>p.projectSlug==="junk"&&p.platform==="producthunt");
    const workflow=base+"/posts/"+junk.id+"/workflow";
    const ready=await fetch(workflow,{method:"POST",headers,body:JSON.stringify({version:junk.version,action:"validate"})});
    assert.equal(ready.status,200);
    const validated=await ready.json();assert.equal(validated.status,"ready");assert.ok(validated.validatedAt);
    const postedResponse=await fetch(workflow,{method:"POST",headers,body:JSON.stringify({version:validated.version,action:"confirm-published",url:"https://www.producthunt.com/posts/test-fixture"})});
    assert.equal(postedResponse.status,200);
    const posted=await postedResponse.json();assert.equal(posted.publication.state,"published");assert.equal(posted.publication.source,"manual");
    const unposted=await fetch(workflow,{method:"POST",headers,body:JSON.stringify({version:posted.version,action:"undo-manual"})});
    assert.equal(unposted.status,200);assert.equal((await unposted.json()).publication,undefined);
    const social=saved.posts.find((p:any)=>p.platform==="twitter");
    // Blotato is retired: X and LinkedIn posts are confirmed manually, with a real URL for their own platform.
    assert.equal((await fetch(base+"/posts/"+social.id+"/workflow",{method:"POST",headers,body:JSON.stringify({version:social.version,action:"confirm-published",url:"https://www.producthunt.com/posts/not-an-x-url"})})).status,400);
    const socialPosted=await fetch(base+"/posts/"+social.id+"/workflow",{method:"POST",headers,body:JSON.stringify({version:social.version,action:"confirm-published",url:"https://x.com/paulfxyz/status/123"})});
    assert.equal(socialPosted.status,200);assert.equal((await socialPosted.json()).publication.source,"manual");
    const profile={name:"Paul Fleury",headline:"Test-only preview headline",xHandle:"paulfxyz",avatarDataUrl:""};
    assert.equal((await fetch(base+"/profile",{method:"PUT",headers,body:JSON.stringify(profile)})).status,200);
    assert.equal((await (await fetch(base+"/profile",{headers})).json()).headline,profile.headline);
    assert.equal((await fetch(base+"/profile",{method:"PUT",headers,body:JSON.stringify({...profile,avatarDataUrl:"data:image/svg+xml;base64,PHN2Zz4="})})).status,400);
    // Blotato is retired: no route may reach it. Any provider call here would fail the test.
    const realFetch=globalThis.fetch;
    globalThis.fetch=(async(input:any,init:any)=>{
      if(String(input).includes("blotato.com"))throw new Error("Unexpected Blotato call");
      return realFetch(input,init);
    }) as typeof fetch;
    try {
      const other=saved.posts.find((p:any)=>p.platform==="linkedin");
      const v=await fetch(base+"/posts/"+other.id+"/workflow",{method:"POST",headers,body:JSON.stringify({version:other.version,action:"validate"})});
      assert.equal(v.status,200);const vj=await v.json();assert.equal(vj.status,"ready");assert.equal(vj.publication,undefined);
      const r=await fetch(base+"/posts/"+other.id+"/workflow",{method:"POST",headers,body:JSON.stringify({version:vj.version,action:"revise"})});
      assert.equal(r.status,200);assert.equal((await r.json()).status,"revision");
      const sync=await fetch(base+"/blotato/sync",{method:"POST",headers,body:"{}"});
      assert.equal(sync.status,200);assert.deepEqual(await sync.json(),{posts:[],checked:0,errors:[]});
      for(const [m,u] of [["GET","/blotato"],["POST","/blotato/key"],["GET","/blotato/published?platform=twitter"],["POST","/posts/"+social.id+"/blotato"],["POST","/posts/"+social.id+"/published-blotato"]])
        assert.equal((await fetch(base+u,{method:m,headers,body:m==="POST"?"{}":undefined})).status,410,u);
    } finally {globalThis.fetch=realFetch;}
    assert.equal((await fetch(base+"/publish",{method:"POST",headers})).status,403);
    assert.equal((await fetch(base+"/auth/logout",{method:"POST",headers})).status,200);
    assert.equal((await fetch(base+"/campaign",{headers})).status,401);
  } finally {
    server.closeAllConnections();await new Promise<void>(r=>server.close(()=>r()));
    const {db}=await import("../server/fly-store");db().close();rmSync(dir,{recursive:true,force:true});
  }
});
