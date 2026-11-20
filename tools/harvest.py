#!/usr/bin/env python3
"""Collect every English string the site and the OS render, by visiting each page
and clicking through its interactive states with the i18n layer in harvest mode.
Writes assets/i18n/keys.json. Run tools/serve.py on :8931 first."""
import asyncio, json, sys
from pathlib import Path
from playwright.async_api import async_playwright
sys.path.insert(0, str(Path(__file__).parent))
import build

ROOT = Path(__file__).resolve().parent.parent
B = 'http://127.0.0.1:8931'
INIT = 'window.TPHM_HARVEST = true; window.__tphmKeys = new (class extends Set { add(v) { if (!this.has(v) && window.__k) { try { window.__k(v); } catch (e) {} } return super.add(v); } })();'
GET = '() => [...(window.__tphmKeys || [])]'

SITE_PARTS = ["async () => {\n  const sleep = ms => new Promise(r => setTimeout(r, ms)); document.addEventListener('click', e => { const a = e.target.closest('a[href]'); if (a) e.preventDefault(); }, true); HTMLMediaElement.prototype.play = function () { return Promise.resolve(); };\n  const vis = e => e.offsetParent !== null || e.getClientRects().length;\n  const closeAll = () => document.querySelectorAll('dialog[open]').forEach(d => d.id !== 'ldlg' && d.close());\n  for (const b of [...document.querySelectorAll('[data-dlg]')]) { b.click(); await sleep(40); closeAll(); }\n}", "async () => {\n  const sleep = ms => new Promise(r => setTimeout(r, ms)); document.addEventListener('click', e => { const a = e.target.closest('a[href]'); if (a) e.preventDefault(); }, true); HTMLMediaElement.prototype.play = function () { return Promise.resolve(); };\n  const vis = e => e.offsetParent !== null || e.getClientRects().length;\n  const closeAll = () => document.querySelectorAll('dialog[open]').forEach(d => d.id !== 'ldlg' && d.close());\n  for (const b of [...document.querySelectorAll('.path')]) { b.click(); await sleep(40); }\n}", "async () => {\n  const sleep = ms => new Promise(r => setTimeout(r, ms)); document.addEventListener('click', e => { const a = e.target.closest('a[href]'); if (a) e.preventDefault(); }, true); HTMLMediaElement.prototype.play = function () { return Promise.resolve(); };\n  const vis = e => e.offsetParent !== null || e.getClientRects().length;\n  const closeAll = () => document.querySelectorAll('dialog[open]').forEach(d => d.id !== 'ldlg' && d.close());\n  for (const b of [...document.querySelectorAll('[data-v],[data-tag],[data-f],.chip,.seg button')]) { if (vis(b)) { b.click(); await sleep(30); } }\n}", "async () => {\n  const sleep = ms => new Promise(r => setTimeout(r, ms)); document.addEventListener('click', e => { const a = e.target.closest('a[href]'); if (a) e.preventDefault(); }, true); HTMLMediaElement.prototype.play = function () { return Promise.resolve(); };\n  const vis = e => e.offsetParent !== null || e.getClientRects().length;\n  const closeAll = () => document.querySelectorAll('dialog[open]').forEach(d => d.id !== 'ldlg' && d.close());\n  for (let i = 0; i < 13; i++) { const n = document.getElementById('nowNext'); n && n.click(); await sleep(30); }\n}", "async () => {\n  const sleep = ms => new Promise(r => setTimeout(r, ms)); document.addEventListener('click', e => { const a = e.target.closest('a[href]'); if (a) e.preventDefault(); }, true); HTMLMediaElement.prototype.play = function () { return Promise.resolve(); };\n  const vis = e => e.offsetParent !== null || e.getClientRects().length;\n  const closeAll = () => document.querySelectorAll('dialog[open]').forEach(d => d.id !== 'ldlg' && d.close());\n  for (const b of [...document.querySelectorAll('[data-tip]')]) { b.dispatchEvent(new MouseEvent('mouseover', { bubbles: true })); await sleep(5); }\n}", "async () => {\n  const sleep = ms => new Promise(r => setTimeout(r, ms)); document.addEventListener('click', e => { const a = e.target.closest('a[href]'); if (a) e.preventDefault(); }, true); HTMLMediaElement.prototype.play = function () { return Promise.resolve(); };\n  const vis = e => e.offsetParent !== null || e.getClientRects().length;\n  const closeAll = () => document.querySelectorAll('dialog[open]').forEach(d => d.id !== 'ldlg' && d.close());\n  for (const i of [...document.querySelectorAll('input[type=range],input[type=number]')]) { i.value = i.max || 10; i.dispatchEvent(new Event('input', { bubbles: true })); i.dispatchEvent(new Event('change', { bubbles: true })); await sleep(20); }\n}", "async () => {\n  const sleep = ms => new Promise(r => setTimeout(r, ms)); document.addEventListener('click', e => { const a = e.target.closest('a[href]'); if (a) e.preventDefault(); }, true); HTMLMediaElement.prototype.play = function () { return Promise.resolve(); };\n  const vis = e => e.offsetParent !== null || e.getClientRects().length;\n  const closeAll = () => document.querySelectorAll('dialog[open]').forEach(d => d.id !== 'ldlg' && d.close());\n  for (const i of [...document.querySelectorAll('input[type=checkbox]')]) { i.click(); await sleep(10); }\n}", "async () => {\n  const sleep = ms => new Promise(r => setTimeout(r, ms)); document.addEventListener('click', e => { const a = e.target.closest('a[href]'); if (a) e.preventDefault(); }, true); HTMLMediaElement.prototype.play = function () { return Promise.resolve(); };\n  const vis = e => e.offsetParent !== null || e.getClientRects().length;\n  const closeAll = () => document.querySelectorAll('dialog[open]').forEach(d => d.id !== 'ldlg' && d.close());\n  const ck = document.getElementById('copyKit'); ck && ck.click(); await sleep(100);\n}", "async () => {\n  const sleep = ms => new Promise(r => setTimeout(r, ms)); document.addEventListener('click', e => { const a = e.target.closest('a[href]'); if (a) e.preventDefault(); }, true); HTMLMediaElement.prototype.play = function () { return Promise.resolve(); };\n  const vis = e => e.offsetParent !== null || e.getClientRects().length;\n  const closeAll = () => document.querySelectorAll('dialog[open]').forEach(d => d.id !== 'ldlg' && d.close());\n  for (const b of [...document.querySelectorAll('[data-open]')].slice(0, 40)) { b.click(); await sleep(60); const nx = document.getElementById('p-next'); closeAll(); }\n}", "async () => {\n  const sleep = ms => new Promise(r => setTimeout(r, ms)); document.addEventListener('click', e => { const a = e.target.closest('a[href]'); if (a) e.preventDefault(); }, true); HTMLMediaElement.prototype.play = function () { return Promise.resolve(); };\n  const vis = e => e.offsetParent !== null || e.getClientRects().length;\n  const closeAll = () => document.querySelectorAll('dialog[open]').forEach(d => d.id !== 'ldlg' && d.close());\n  const k = document.querySelector('.k-open'); if (k) { k.click(); await sleep(80); const q = document.getElementById('kq'); q.value = 'zzzz'; q.dispatchEvent(new Event('input')); await sleep(40); q.value=''; q.dispatchEvent(new Event('input')); closeAll(); }\n}", "async () => {\n  const sleep = ms => new Promise(r => setTimeout(r, ms)); document.addEventListener('click', e => { const a = e.target.closest('a[href]'); if (a) e.preventDefault(); }, true); HTMLMediaElement.prototype.play = function () { return Promise.resolve(); };\n  const vis = e => e.offsetParent !== null || e.getClientRects().length;\n  const closeAll = () => document.querySelectorAll('dialog[open]').forEach(d => d.id !== 'ldlg' && d.close());\n  const l = document.querySelector('[data-lang-open]'); if (l) { l.click(); await sleep(60); const q = document.querySelector('.ldlg input'); q.value = 'zzzz'; q.dispatchEvent(new Event('input')); await sleep(30); document.getElementById('ldlg').close(); }\n}", "async () => {\n  const sleep = ms => new Promise(r => setTimeout(r, ms)); document.addEventListener('click', e => { const a = e.target.closest('a[href]'); if (a) e.preventDefault(); }, true); HTMLMediaElement.prototype.play = function () { return Promise.resolve(); };\n  const vis = e => e.offsetParent !== null || e.getClientRects().length;\n  const closeAll = () => document.querySelectorAll('dialog[open]').forEach(d => d.id !== 'ldlg' && d.close());\n  for (const b of [...document.querySelectorAll('button')].filter(b => /a11y|access/i.test(b.className + b.id + (b.getAttribute('aria-label') || '')))) { b.click(); await sleep(80); }\n}"]
CLICK_SITE = None


CLICK_OS = r'''async () => {
  const sleep = ms => new Promise(r => setTimeout(r, ms)); document.addEventListener('click', e => { const a = e.target.closest('a[href]'); if (a) e.preventDefault(); }, true); HTMLMediaElement.prototype.play = function () { return Promise.resolve(); };
  await sleep(2500);
  const seen = new Set();
  const press = async el => { try { el.click(); el.dispatchEvent(new MouseEvent('dblclick', { bubbles: true })); } catch (e) {} await sleep(70); };
  const targets = () => [...document.querySelectorAll('[data-open],[data-app],.dicon,.dk,.mb-btn,.mb-item,[role=menuitem],[role=tab],.pathb,.fi,.ml-item,[data-m],[data-n],[data-l],[data-note],.btn,.tb button,.wt button,button')];
  for (let round = 0; round < 3; round++) {
    for (const el of targets()) {
      const id = el.outerHTML.slice(0, 160);
      if (seen.has(id)) continue; seen.add(id);
      if (/close|restart|exit|shut|quit|reboot|logout/i.test(id)) continue;
      if (el.closest('a[target]')) continue;
      await press(el);
      if (seen.size > 600) return;
    }
  }
}'''


async def guard(pg, url):
    first = {'done': False}
    async def r(route):
        req = route.request
        if req.url.endswith(('.mp4', '.mp3', '.webm')): return await route.abort()
        if req.is_navigation_request() and req.frame == pg.main_frame:
            if first['done']: return await route.abort()
            first['done'] = True
        await route.continue_()
    await pg.route('**/*', r)


async def visit(p, url, script, wait=600):
    b = await p.chromium.launch(channel='chromium', args=['--disable-dev-shm-usage'])
    ctx = await b.new_context(viewport={'width': 1360, 'height': 900}, device_scale_factor=1)
    await ctx.add_init_script(INIT)
    await ctx.add_init_script("window.open = () => null; navigator.clipboard && (navigator.clipboard.writeText = () => Promise.reject())")
    pg = await ctx.new_page()
    await guard(pg, url)
    pg.on('dialog', lambda d: asyncio.ensure_future(d.dismiss()))
    keys = []
    await ctx.expose_function('__k', lambda v: SINK.add(v))
    try:
        await pg.goto(url, wait_until='load'); await pg.wait_for_timeout(wait)
        if script:
            try: await pg.evaluate(script)
            except Exception as e: print('  script error', url, str(e)[:120])
        keys = await pg.evaluate(GET)
    except Exception as e:
        print('  visit error', url, str(e)[:160])
    await b.close()
    return keys


SINK = set()
async def main():
    keys = SINK
    async with async_playwright() as p:
        jobs = [(B + u, sc) for u in ['/'] + ['/' + c for c in build.CHAPTERS] for sc in SITE_PARTS] + [(B + '/junk', None), (B + '/os', CLICK_OS)]
        for vw in [None, 'phone']:
            pass
        for url, sc in jobs:
            k = await visit(p, url, sc)
            print(url, len(k), len(SINK), flush=True); keys |= set(k)
        # OS on a phone (iOS home screen strings)
        b = await p.chromium.launch(channel='chromium', args=['--disable-dev-shm-usage'])
        ctx = await b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=1, is_mobile=True, has_touch=True)
        await ctx.add_init_script(INIT); await ctx.expose_function('__k', lambda v: SINK.add(v))
        pg = await ctx.new_page(); await guard(pg, B + '/os'); await pg.goto(B + '/os'); await pg.wait_for_timeout(2500)
        try: await pg.evaluate(CLICK_OS)
        except Exception as e: print('phone os', str(e)[:100])
        try: k = await pg.evaluate(GET); print('phone os', len(k)); keys |= set(k)
        except Exception as e: print('phone os get', str(e)[:80])
        await b.close()
    import re
    t = lambda x: (lambda n: build.NUM.sub(lambda m: '{%d}' % (n.append(0) or len(n) - 1), re.sub(r'\s+', ' ', x).strip()))([])
    keys |= {t(x) for x in build.meta_strings()}
    for L in build.LANGS: keys.add(t(L['e']))
    out = sorted(k for k in keys if k.strip())
    (ROOT / 'assets/i18n/keys.json').write_text(json.dumps(out, ensure_ascii=False, indent=0))
    print('total', len(out))

asyncio.run(main())
