import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
// A mistaken DEV_PREVIEW setting must never unlock a Vercel deployment.
process.env.VERCEL='1';process.env.DEV_PREVIEW='true';
const {app}=await import('../server/app');
test('production is fail-closed even if preview flag is set',async()=>{
  const server=app.listen(0,'127.0.0.1');await once(server,'listening');
  const port=(server.address() as any).port;
  const base=`http://127.0.0.1:${port}`;
  try{
    const session=await (await fetch(base+'/api/session')).json();
    assert.equal(session.previewToken,undefined);assert.equal(session.mode,'private');
    assert.equal((await fetch(base+'/api/campaign')).status,401);
    assert.equal((await fetch(base+'/api/assets/junk-linkedin-01-launch')).status,401);
    assert.equal((await fetch(base+'/api/campaign',{headers:{Authorization:'Bearer invalid'}})).status,401);
    const bad=await fetch(base+'/api/auth/start',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'not-owner@example.com'})});
    assert.equal(bad.status,403);
  }finally{server.closeAllConnections();await new Promise<void>(r=>server.close(()=>r()))}
});
