(() => {
'use strict';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const LOG = window.TPHM_LOG || [];
const BASE = document.documentElement.dataset.base || '';
const T = window.T || (x => x);
const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.classList.contains('a11y-motion');
const narrow = () => innerWidth <= 760;
const money = n => 'US$' + Math.round(n).toLocaleString('en-US');
const host = u => u.replace(/^https?:\/\//, '').replace(/\/$/, '');
const phU = p => p.ph ? 'https://www.producthunt.com/products/' + p.ph : '';
const ghU = p => 'https://github.com/paulfxyz/' + p.gh;
const TAGS = { junk: 'mac', ase: 'web infra', mang: 'infra ai', hollr: 'web', clippy: 'web ai', mercury: 'web ai', megamesh: 'infra', 'ai-credit-checker': 'mac ai', xnftables: 'infra', timescreen: 'mac web', mars: 'mac', tetris: 'web' };
const EXT = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7M8 7h9v9" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const CONTACT = 'https://paulfleury.com/contact';
const TOTAL = LOG.reduce((s, p) => s + (p.budget || 0), 0);

/* ---------- Glyphs ---------- */
const SVG = {
  mail: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2.5" fill="none" stroke="#fff" stroke-width="2"/><path d="m4 7 8 6 8-6" fill="none" stroke="#fff" stroke-width="2" stroke-linejoin="round"/></svg>',
  trash: '<svg viewBox="0 0 24 24"><path d="M5 7h14M10 7V5h4v2M7 7l1 13h8l1-13" fill="none" stroke="#333" stroke-width="1.8" stroke-linejoin="round"/></svg>',
  slides: '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="12" rx="2" fill="none" stroke="#7C2D12" stroke-width="2"/><path d="M12 16v4M8 20h8" stroke="#7C2D12" stroke-width="2" stroke-linecap="round"/></svg>'
};
const glyph = id => {
  if (id.startsWith('p:')) return `<img src="/assets/icons/${id.slice(2)}.webp" alt="">`;
  switch (id) {
    case 'finder': return '<span class="folder"><i>12</i></span>';
    case 'notes': return '<span class="doc" style="--c:#D97706"><b>TXT</b></span>';
    case 'cho': return '<span class="doc" style="--c:#1C1512"><b>MD</b></span>';
    case 'builders': return '<span class="doc" style="--c:#15803D"><b>MD</b></span>';
    case 'mail': return `<span class="appglyph g-mail">${SVG.mail}</span>`;
    case 'saas': return `<span class="appglyph g-key">${SVG.slides}</span>`;
    case 'calc': return '<span class="appglyph g-calc">$</span>';
    case 'terminal': return '<span class="appglyph g-term">&gt;_</span>';
    case 'trash': return `<span class="appglyph g-trash">${SVG.trash}</span>`;
    case 'pitch': return '<img src="/assets/icons/openline.webp" alt="">';
    case 'hire': case 'welcome': case 'about': return '<span class="appglyph g-hire"><img src="/assets/brand/pfph-head-v1.webp" alt="" style="width:70%;height:auto;border-radius:0"></span>';
  }
  return '';
};

/* ---------- Toast + notifications ---------- */
let tt;
const toast = m => { let t = $('.toast'); if (!t) { t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); document.body.append(t); } t.textContent = m; t.classList.add('on'); clearTimeout(tt); tt = setTimeout(() => t.classList.remove('on'), 2600); };
const notify = ({ g, title, text, actions = [], ttl = 9000 }) => {
  const n = document.createElement('div'); n.className = 'notif'; n.setAttribute('role', 'status');
  n.innerHTML = `${glyph(g)}<b>${title}</b><p>${text}</p>${actions.length ? `<div class="row-btns">${actions.map((a, i) => `<button class="btn ${i ? 'btn-ln' : 'btn-or'}" data-i="${i}">${a[0]}</button>`).join('')}</div>` : ''}`;
  const kill = () => { n.classList.add('out'); setTimeout(() => n.remove(), 300); };
  n.addEventListener('click', e => { const b = e.target.closest('[data-i]'); if (b) { actions[+b.dataset.i][1](); } kill(); });
  $('#notifs').append(n); setTimeout(kill, ttl);
};

/* ---------- Window manager ---------- */
const wins = $('#wins');
let z = 10, cascade = 0;
const open = new Map();
const APPS = {};
const def = (id, o) => { APPS[id] = Object.assign({ id }, o); };

function openApp(id, opts = {}) {
  if (id.startsWith('p:') && !APPS[id]) { const p = LOG.find(x => 'p:' + x.key === id); if (!p) return; }
  const A = APPS[id] || productApp(id.slice(2));
  if (open.has(id)) { const w = open.get(id); w.classList.remove('min'); focus(w); opts.then && opts.then(w); return w; }
  const w = document.createElement('section');
  w.className = 'win' + (A.cls ? ' ' + A.cls : '');
  w.dataset.id = id; w.setAttribute('role', 'dialog'); w.setAttribute('aria-label', A.title);
  w.innerHTML = `<div class="wt"><div class="wt-dots"><button class="c" aria-label="Close ${A.title}"><i></i></button><button class="m" aria-label="Minimise"><i></i></button><button class="x" aria-label="Zoom"><i></i></button></div><div class="wt-t">${A.icon !== false ? glyph(id).replace('class="doc"', 'class="doc" style="transform:scale(.4);margin:-16px -12px"').replace('class="folder"', 'class="folder" style="transform:scale(.36);margin:-14px -18px"').replace(/class="appglyph ([^"]+)"/, 'class="appglyph $1" style="width:18px;height:18px;border-radius:5px;font-size:9px"') : ''}<span>${A.title}</span></div><div></div></div><div class="wb${A.pad ? ' pad' : ''}"></div>`;
  const dw = innerWidth, dh = innerHeight - 30 - 84;
  const W = Math.round(Math.min(A.w || 720, dw * .86, dw - 32)), H = Math.round(Math.min(A.h || 520, dh * .92, dh - 16));
  const off = (open.size ? (cascade++ % 4) : (cascade = 0)) * 26;
  w.style.width = W + 'px'; w.style.height = H + 'px';
  w.style.left = Math.max(8, Math.min(dw - W - 8, Math.round((dw - W) / 2 + off))) + 'px';
  w.style.top = Math.max(8, Math.min(dh - H, Math.round((dh - H) / 2 + off))) + 'px';
  wins.append(w); open.set(id, w);
  A.build($('.wb', w), w, opts);
  wireWin(w, id);
  focus(w); dockState();
  if (!opts.silent) setHash(id);
  opts.then && opts.then(w);
  const dk = $(`.dk[data-id="${CSS.escape(id)}"]`); if (dk && !reduce()) { dk.classList.remove('bounce'); void dk.offsetWidth; dk.classList.add('bounce'); }
  return w;
}
function closeWin(w) {
  if (!w) return; const id = w.dataset.id;
  $$('video', w).forEach(v => v.pause());
  open.delete(id); w.classList.add('closing');
  setTimeout(() => { w.remove(); const top = topWin(); top ? focus(top) : ($('#mbApp').textContent = 'Finder', setHash('')); }, reduce() ? 0 : 190);
  dockState();
}
function topWin() { let t = null, m = -1; open.forEach(w => { if (!w.classList.contains('min') && +w.style.zIndex > m) { m = +w.style.zIndex; t = w; } }); return t; }
function focus(w) {
  $$('.win.focus').forEach(x => x !== w && x.classList.remove('focus'));
  w.classList.add('focus'); w.style.zIndex = ++z;
  $('#mbApp').textContent = (APPS[w.dataset.id] || {}).title || w.getAttribute('aria-label');
  setHash(w.dataset.id);
}
function setHash(id) { const h = id ? '#/' + id.replace(/^p:/, '') : ''; if (location.hash !== h) history.replaceState(null, '', h || location.pathname); }
function wireWin(w, id) {
  const bar = $('.wt', w);
  $('.c', w).addEventListener('click', e => { e.stopPropagation(); closeWin(w); });
  $('.m', w).addEventListener('click', e => { e.stopPropagation(); w.classList.add('min'); dockState(); const t = topWin(); t && focus(t); });
  $('.x', w).addEventListener('click', e => { e.stopPropagation(); w.classList.toggle('max'); });
  bar.addEventListener('dblclick', e => { if (!e.target.closest('button')) w.classList.toggle('max'); });
  w.addEventListener('pointerdown', () => focus(w), true);
  bar.addEventListener('pointerdown', e => {
    if (e.target.closest('button') || narrow() || w.classList.contains('max')) return;
    const sx = e.clientX, sy = e.clientY, l = w.offsetLeft, t = w.offsetTop;
    bar.setPointerCapture(e.pointerId);
    const mv = ev => { w.style.left = Math.min(innerWidth - 80, Math.max(-w.offsetWidth + 120, l + ev.clientX - sx)) + 'px'; w.style.top = Math.min(innerHeight - 120, Math.max(0, t + ev.clientY - sy)) + 'px'; };
    const up = () => { bar.removeEventListener('pointermove', mv); bar.removeEventListener('pointerup', up); };
    bar.addEventListener('pointermove', mv); bar.addEventListener('pointerup', up);
  });
}

/* ---------- Desktop icons + dock ---------- */
const DESK = [['finder', 'The Marathon'], ['notes', 'Field notes.txt'], ['mail', 'Inbox'], ['saas', 'SaaS is dead.key'], ['calc', 'Rent or build'], ['cho', 'CHO.md'], ['hire', 'Hire me.app'], ['pitch', 'Openline.pitch'], ['builders', 'Run your own.md'], ['terminal', 'Terminal'], ['trash', 'Trash']];
$('#icons').innerHTML = DESK.map(([id, l]) => `<button class="dicon" data-open="${id}"><span class="gl">${glyph(id)}${id === 'mail' ? '<em class="badge" id="mailBadge">5</em>' : ''}</span><span>${l}</span></button>`).join('') + '<p class="ic-h">The twelve</p>' + LOG.map(p => `<button class="dicon dicon-p" data-open="p:${p.key}"><span class="gl">${glyph('p:' + p.key)}</span><span>${p.name}</span></button>`).join('');
const DOCK = [...LOG.map(p => 'p:' + p.key), '|', 'finder', 'mail', 'notes', 'terminal', 'trash'];
$('#dock').innerHTML = DOCK.map(id => id === '|' ? '<span class="dk-sep" aria-hidden="true"></span>' : `<button class="dk${id.startsWith('p:') ? ' dk-prod' : ''}" data-open="${id}" data-id="${id}" aria-label="${id.startsWith('p:') ? LOG.find(p => 'p:' + p.key === id).name : APPS_TITLE(id)}">${glyph(id)}<span class="dk-tip">${id.startsWith('p:') ? LOG.find(p => 'p:' + p.key === id).name : APPS_TITLE(id)}</span></button>`).join('');
function APPS_TITLE(id) { return { finder: 'The Marathon', mail: 'Inbox', notes: 'Field notes', terminal: 'Terminal', trash: 'Trash' }[id] || id; }
function dockState() { $$('.dk').forEach(d => d.classList.toggle('run', open.has(d.dataset.id))); }
const dock = $('#dock');
dock.addEventListener('mousemove', e => {
  if (reduce() || narrow()) return;
  $$('.dk', dock).forEach(d => { const r = d.getBoundingClientRect(); const dist = Math.abs(e.clientX - (r.left + r.width / 2)); const s = Math.max(0, 1 - dist / 150); const px = 48 + 26 * s * s; d.style.width = d.style.height = px + 'px'; });
});
dock.addEventListener('mouseleave', () => $$('.dk', dock).forEach(d => { d.style.width = d.style.height = ''; }));
document.addEventListener('click', e => {
  const o = e.target.closest('[data-open]'); if (o) { e.preventDefault(); closeMenus(); openApp(o.dataset.open); }
  const a = e.target.closest('[data-act]'); if (a) { closeMenus(); act(a.dataset.act); }
});
/* ---------- Phone: iOS home screen ---------- */
const IOS_TOOLS = [['saas', 'SaaS is dead'], ['calc', 'Rent or build'], ['cho', 'CHO'], ['hire', 'Hire me'], ['pitch', 'Openline'], ['builders', 'Run yours'], ['about', 'About']];
const IOS_DOCK = [['finder', 'Marathon'], ['mail', 'Inbox'], ['notes', 'Notes'], ['terminal', 'Terminal']];
const ic = (id, l, badge) => `<button class="ia" data-open="${id}"><span class="ia-ic">${id === 'about' ? '<span class="appglyph g-about">i</span>' : glyph(id)}${badge ? `<em class="badge ios-badge">${badge}</em>` : ''}</span><span class="ia-l">${l}</span></button>`;
$('#ios').innerHTML = `<div class="ios-pages" id="iosPages">
  <section class="ios-page" aria-label="Page 1">
    <div class="ios-wg">
      <button class="wg wg-hero" data-open="welcome"><small>The Marathon</small><b>11 + 1</b><span>tools shipped, 10–21 Nov</span><em>Built, not rented.</em></button>
      <button class="wg wg-dj" id="wgDj" type="button" aria-label="DJ kitty: play the Free Software Song"><img src="/assets/kitty/kitty-dj.webp" alt="" width="413" height="520"><span class="wg-tx"><small>DJ kitty</small><b>Free Software Song</b><span class="wg-st" id="wgSt">Tap to play</span></span><span class="eq" aria-hidden="true"><i></i><i></i><i></i><i></i></span></button>
    </div>
    <div class="ios-grid">${IOS_TOOLS.map(([id, l]) => ic(id, l)).join('')}</div>
  </section>
  <section class="ios-page" aria-label="Page 2: the twelve">
    <p class="ios-h">The twelve</p>
    <div class="ios-grid">${LOG.map(p => ic('p:' + p.key, p.name)).join('')}</div>
  </section>
</div>
<div class="ios-dots" aria-hidden="true"><i class="on"></i><i></i></div>
<button class="ios-search" type="button" data-act="spot"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" stroke-width="2.4"/><path d="m20 20-3.5-3.5" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>Search</button>
<nav class="ios-dock" aria-label="Dock">${IOS_DOCK.map(([id, l]) => ic(id, l, id === 'mail' ? 5 : 0)).join('')}</nav>`;
const iosPages = $('#iosPages');
iosPages.addEventListener('scroll', () => { const i = Math.round(iosPages.scrollLeft / iosPages.clientWidth); $$('.ios-dots i').forEach((d, j) => d.classList.toggle('on', i === j)); }, { passive: true });
const setIOS = () => document.documentElement.classList.toggle('ios', narrow());
setIOS(); addEventListener('resize', setIOS);
const appState = () => document.documentElement.classList.toggle('app-open', [...open.values()].some(w => !w.classList.contains('min')));
new MutationObserver(appState).observe($('#wins'), { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
$('#iosHome').addEventListener('click', () => [...open.values()].forEach(closeWin));
const sbt = () => { try { $('#sbTime').textContent = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Lisbon', hour: '2-digit', minute: '2-digit' }).format(new Date()); } catch (e) {} };
sbt(); setInterval(sbt, 20000);

/* DJ kitty: the music button */
const pet = $('#pet'), np = $('#np');
let song;
const setPlaying = on => {
  document.documentElement.classList.toggle('playing', on);
  pet.setAttribute('aria-pressed', on); pet.setAttribute('aria-label', on ? 'DJ kitty: pause the Free Software Song' : 'DJ kitty: play the Free Software Song');
  np.hidden = !on;
  const wd = $('#wgDj'); if (wd) { wd.setAttribute('aria-label', on ? 'DJ kitty: pause the Free Software Song' : 'DJ kitty: play the Free Software Song'); $('#wgSt').textContent = on ? 'Now playing · tap to pause' : 'Tap to play'; }
};
const toggleSong = () => {
  if (!song) { song = new Audio('/assets/a11y/free-software-song.mp3'); song.preload = 'auto'; song.addEventListener('ended', () => setPlaying(false)); song.addEventListener('pause', () => setPlaying(false)); song.addEventListener('play', () => setPlaying(true)); }
  if (song.paused) { song.play().then(() => toast('Now playing: the Free Software Song, recorded by Julian Coccia')).catch(() => toast('Tap the kitty again to play')); }
  else song.pause();
};
pet.addEventListener('click', toggleSong);
$('#wgDj').addEventListener('click', toggleSong);
np.addEventListener('click', toggleSong);
/* Embedded in the logbook: exit goes back to the page */
const EMBED = window.top !== window;
const exitOS = () => { if (song) song.pause(); window.parent.postMessage({ tphm: 'exit-os' }, location.origin); };
if (EMBED) {
  document.documentElement.classList.add('embed');
  $('#exitOS').hidden = false; $('#exitOS').addEventListener('click', exitOS);
  document.addEventListener('click', e => { const a = e.target.closest('a[data-home]'); if (a) { e.preventDefault(); exitOS(); } }, true);
}

/* ---------- Menus ---------- */
$('#mbApps').innerHTML = LOG.map(p => `<button role="menuitem" data-open="p:${p.key}"><img src="/assets/icons/${p.key}.webp" alt="">${p.name}<kbd>${p.encore ? '+1' : p.n}</kbd></button>`).join('');
const closeMenus = () => $$('.mb-menu.open').forEach(m => { m.classList.remove('open'); $('.mb-btn', m).setAttribute('aria-expanded', 'false'); });
$$('.mb-menu').forEach(m => {
  const b = $('.mb-btn', m);
  b.addEventListener('click', e => { e.stopPropagation(); const was = m.classList.contains('open'); closeMenus(); if (!was) { m.classList.add('open'); b.setAttribute('aria-expanded', 'true'); const f = $('.mb-drop [role=menuitem]', m); f && f.focus(); } });
  b.addEventListener('mouseenter', () => { if ($('.mb-menu.open') && !m.classList.contains('open')) { closeMenus(); m.classList.add('open'); b.setAttribute('aria-expanded', 'true'); } });
  m.addEventListener('keydown', e => {
    const items = $$('[role=menuitem]', m), i = items.indexOf(document.activeElement);
    if (e.key === 'ArrowDown') { e.preventDefault(); items[(i + 1) % items.length].focus(); }
    if (e.key === 'ArrowUp') { e.preventDefault(); items[(i - 1 + items.length) % items.length].focus(); }
    if (e.key === 'Escape') { closeMenus(); b.focus(); e.stopPropagation(); }
  });
});
document.addEventListener('click', e => { if (!e.target.closest('.mb-menu')) closeMenus(); });
function act(a) {
  if (a === 'theme') { const t = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'; document.documentElement.dataset.theme = t; try { localStorage.setItem('tphmos-theme', t); } catch (e) {} }
  if (a === 'restart') { try { sessionStorage.removeItem('tphmos-booted'); } catch (e) {} location.hash = ''; location.reload(); }
  if (a === 'close') closeWin(topWin());
  if (a === 'closeall') [...open.values()].forEach(closeWin);
  if (a === 'tile') { let i = 0; const ws = [...open.values()].filter(w => !w.classList.contains('min')); const cols = Math.ceil(Math.sqrt(ws.length)) || 1, rows = Math.ceil(ws.length / cols) || 1; const cw = (innerWidth - 16) / cols, ch = (innerHeight - 30 - 96) / rows; ws.forEach(w => { w.classList.remove('max'); w.style.left = 8 + (i % cols) * cw + 'px'; w.style.top = 8 + Math.floor(i / cols) * ch + 'px'; w.style.width = cw - 8 + 'px'; w.style.height = ch - 8 + 'px'; i++; }); }
  if (a === 'spot') spotOpen();
}

/* ---------- Clock ---------- */
const clk = () => { try { $('#clock').textContent = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Lisbon', weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date()).replace(',', '') + ' · Lisbon'; } catch (e) {} };
clk(); setInterval(clk, 20000);

/* ======================= APPS ======================= */
def('welcome', { title: 'Welcome to TPHM OS', w: 960, h: 660, build(b) {
  b.innerHTML = `<div class="wel"><div class="wel-l">
    <p class="eyb">The Product Hunt Marathon · 10–21 Nov 2026</p>
    <h1 class="big">Twelve tools. Twelve days. <em>Built, not rented.</em></h1>
    <p class="p2">From Junk to Tetris, I shipped one free, open-source tool a day, built with AI. No launch squad, no upvote ask. Everything is installed on this desktop: open anything.</p>
    <p class="small" style="font-weight:600;color:var(--ink-2)">I'm here to…</p>
    <div class="paths">
      <button class="pathb" data-open="finder"><b>Try the tools</b><span>Twelve free apps, one click each</span></button>
      <button class="pathb" data-open="hire"><b>Hire a CHO</b><span>Up to 30 hours a week, open now</span></button>
      <button class="pathb" data-open="pitch"><b>Invest</b><span>Openline, my main venture</span></button>
      <button class="pathb" data-open="builders"><b>Run my own</b><span>Six lessons and a checklist</span></button>
    </div>
    <div class="stats"><div><b>11 + 1</b><span>launches</span></div><div><b>US$0</b><span>to use any of them</span></div><div><b>≈ 2.75k</b><span>US$ to build all twelve</span></div><div><b>0</b><span>upvotes bought</span></div></div>
    <p class="small">Tip: press <kbd style="margin:0">⌘K</kbd> to search anything. Prefer scrolling? <a href="${BASE}/" data-home>Read it as a page</a>.</p>
  </div><div class="wel-r"><img src="/assets/kitty/fin.webp" alt="The Marathon kitty holding a sign: 11 + 1 shipped" width="1100" height="614"></div></div>`;
} });

def('finder', { title: 'The Marathon', w: 860, h: 540, build(b) {
  b.innerHTML = `<div class="fd"><aside class="fd-side" aria-label="Filter">
    <p>Marathon</p>
    <button aria-pressed="true" data-f="all"><i style="--c:var(--or)"></i>All twelve</button>
    <p>Kinds</p>
    <button aria-pressed="false" data-f="mac"><i style="--c:#6B7280"></i>Mac</button>
    <button aria-pressed="false" data-f="web"><i style="--c:#3B82F6"></i>Web</button>
    <button aria-pressed="false" data-f="infra"><i style="--c:#10B981"></i>Dev &amp; infra</button>
    <button aria-pressed="false" data-f="ai"><i style="--c:#A855F7"></i>AI-powered</button>
  </aside><div class="fd-main">
    <div class="fd-bar"><b id="fdT">All twelve</b><div class="seg" role="group" aria-label="View"><button aria-pressed="true" data-v="grid">Icons</button><button aria-pressed="false" data-v="list">List</button></div></div>
    <div class="fd-grid">${LOG.map(p => `<button class="fi" data-open="p:${p.key}" data-tags="${TAGS[p.key]}"><img src="/assets/icons/${p.key}.webp" alt=""><b>${p.name}</b><span>${p.encore ? 'Bonus' : 'Day ' + p.n} · ${p.day.slice(4)}</span></button>`).join('')}</div>
    <div class="fd-list" hidden><table><thead><tr><th>Name</th><th>Kind</th><th>Shipped</th><th class="num">What it took</th></tr></thead><tbody>${LOG.map(p => `<tr tabindex="0" data-open="p:${p.key}" data-tags="${TAGS[p.key]}"><td><img src="/assets/icons/${p.key}.webp" alt="">${p.name}</td><td>${p.kind}</td><td>${p.day}</td><td class="num">${p.budget ? '≈ ' + money(p.budget) : 'bonus'}</td></tr>`).join('')}</tbody></table></div>
    <div class="fd-status"><span id="fdN">12 items</span><span>All MIT · free for good · ≈ ${money(TOTAL)} for all twelve</span></div>
  </div></div>`;
  $$('.fd-side button', b).forEach(btn => btn.addEventListener('click', () => {
    $$('.fd-side button', b).forEach(x => x.setAttribute('aria-pressed', x === btn));
    const f = btn.dataset.f; let n = 0;
    $$('[data-tags]', b).forEach(el => { const on = f === 'all' || el.dataset.tags.split(' ').includes(f); el.classList.toggle('is-hidden', !on); if (on && el.classList.contains('fi')) n++; });
    $('#fdT', b).textContent = btn.textContent.trim(); $('#fdN', b).textContent = n + ' item' + (n > 1 ? 's' : '');
  }));
  $$('.seg button', b).forEach(btn => btn.addEventListener('click', () => {
    $$('.seg button', b).forEach(x => x.setAttribute('aria-pressed', x === btn));
    $('.fd-grid', b).hidden = btn.dataset.v !== 'grid'; $('.fd-list', b).hidden = btn.dataset.v !== 'list';
  }));
  $('tbody', b).addEventListener('keydown', e => { if (e.key === 'Enter') { const r = e.target.closest('tr'); r && openApp(r.dataset.open); } });
} });

function productApp(key) {
  const i = LOG.findIndex(p => p.key === key), p = LOG[i];
  const live = { tetris: 'https://tetris.rocks', timescreen: 'https://time.paulfleury.com' }[key];
  const A = { id: 'p:' + key, title: p.name, w: 1000, h: 600, build(b) {
    const prev = LOG[(i - 1 + LOG.length) % LOG.length], next = LOG[(i + 1) % LOG.length];
    b.innerHTML = `<div class="pa"><div class="pa-media"><video muted loop playsinline autoplay poster="/assets/covers/${key}.webp" src="/assets/loops/${key}.mp4" aria-label="${p.name} animated cover"></video>${live ? '<span class="live-tag">Cover</span>' : ''}</div>
      <div class="pa-body">
        <div class="pa-head"><img src="/assets/icons/${key}.webp" alt=""><div><p class="eyb">${p.encore ? 'Bonus · 12 of 11' : 'Day ' + p.n + ' of 11'} · ${p.day}</p><b>${p.name}</b></div></div>
        <p class="pa-line">${p.line}</p>
        <p class="p2">${p.note}</p>
        <dl class="facts"><div><dt>Kind</dt><dd>${p.kind}</dd></div><div><dt>Stack</dt><dd>${p.stack}</dd></div><div><dt>Licence</dt><dd>MIT, free for good</dd></div><div><dt>What it took</dt><dd>${p.budget ? '≈ ' + money(p.budget) + ' <span class="small">AI tokens, hours and other compute, marketing and hosting across every iteration. Not a price.</span>' : 'Not tracked'}</dd></div></dl>
        <div class="row-btns">${live ? `<button class="btn btn-or" data-live="${live}">Run it right here</button>` : ''}${p.site ? `<a class="btn ${live ? 'btn-ln' : 'btn-or'}" href="${p.site}" target="_blank" rel="noopener">${host(p.site)} ${EXT}</a>` : ''}${p.ph ? `<a class="btn ${p.site || live ? 'btn-ln' : 'btn-or'}" href="${phU(p)}" target="_blank" rel="noopener">Product Hunt ${EXT}</a>` : ''}<a class="btn btn-ln" href="${ghU(p)}" target="_blank" rel="noopener">GitHub ${EXT}</a></div>
        ${p.encore ? '<p class="small">Tetris is a trademark of The Tetris Company. Grand Theft Auto and GTA VI are trademarks of Take-Two Interactive and Rockstar Games. A fan project, not affiliated with any of them, and it comes down on request, no questions asked.</p>' : ''}
        <div class="pa-nav"><button class="btn btn-ln" data-swap="${prev.key}">← ${prev.name}</button><button class="btn btn-ln" data-swap="${next.key}">${next.name} →</button></div>
      </div></div>`;
    if (reduce()) { const v = $('video', b); v.removeAttribute('autoplay'); v.pause(); }
    const lb = $('[data-live]', b);
    lb && lb.addEventListener('click', () => {
      const m = $('.pa-media', b); m.innerHTML = `<iframe src="${lb.dataset.live}" title="${p.name}, running live" allow="fullscreen; autoplay" loading="lazy"></iframe><span class="live-tag">Live · ${host(lb.dataset.live)}</span>`;
      lb.remove(); const f = $('iframe', m); setTimeout(() => f.focus(), 600);
    });
    $$('[data-swap]', b).forEach(s => s.addEventListener('click', () => {
      const w = b.closest('.win'), L = w.style.left, T = w.style.top, Wd = w.style.width, Hd = w.style.height;
      closeWin(w); const nw = openApp('p:' + s.dataset.swap); Object.assign(nw.style, { left: L, top: T, width: Wd, height: Hd, animation: 'none' });
    }));
  } };
  APPS['p:' + key] = A; return A;
}

const NOTES = [
  ['love', 'A love letter, with a few corrections', 'On Product Hunt since the early days', `<p class="lead">I've been on Product Hunt since its early days.</p><p>Back then I was in a relationship with the first French journalist to interview Ryan Hoover, so I like to think I heard about it at the kitchen table before most of France did. I've browsed it, hunted on it and recommended it for a decade. This Marathon was my way of giving something back: eleven useful, free tools in a row, plus one for fun.</p><h3>The rules I set for myself</h3><p>No launch squad. No upvote ask. No paid engagement. Just one product a day, a clear page, a real maker comment and an invitation to send feedback.</p>`],
  ['editors', 'Being seen: the editors featured Mang, not the Marathon', 'Live is not seen: about 4 points without a feature or ads', `<p class="lead">On Product Hunt, being live and being seen are two different things.</p><p>Every launch gets a page, but <a href="https://help.producthunt.com/en/articles/17734306-1-how-product-hunt-works" target="_blank" rel="noopener">the team hand-picks which ones appear on the homepage</a>, and <a href="https://help.producthunt.com/en/articles/17734646-8-launch-faq-and-myths" target="_blank" rel="noopener">featuring is an editorial decision that meeting the guidelines doesn't guarantee</a>. Launches that aren't featured sit behind a "See all of today's products" link that most visitors never click.</p><p>The editors did pick up Mang, the terminal assistant from day three, and featured it. That was a real moment. But the Marathon as a whole never became the story: eleven consecutive free, MIT-licensed launches from one maker read as eleven separate small products, each judged on its own day, and others, Megamesh for one, may well have deserved attention too. I don't think anyone acted in bad faith. But it shows what the curation model rewards: one big, polished, funded launch beats a steady run of honest small ones.</p><p>Here is what I have observed as a long-time member, and not Product Hunt's documented policy. In practice, a product seems to be capped at about 4 upvote points unless it brings a large volume of votes and, in particular, gets featured editorially or runs an ad campaign on Product Hunt. That campaign costs about US$55 CPM, which is expensive for an indie maker.</p><p class="aside">Product Hunt's <a href="https://help.producthunt.com/en/articles/17734341-2-what-kind-of-products-get-featured" target="_blank" rel="noopener">featuring guidelines</a> look for originality, a clear edge, plain language and a product that works. Upvotes alone don't decide it.</p>`],
  ['market', 'The upvote black market is real', 'My inbox filled with offers to sell me votes', `<p class="lead">From the first launch day, my inbox filled with offers to sell me upvotes.</p><p>Packages of "supporters", guaranteed top-five placements, launch-day "communities" that vote on command. I didn't keep count, but there were a lot of them, on Product Hunt, LinkedIn, X and email.</p><p>Product Hunt is clear that this is against the rules. Its own guide says <a href="https://help.producthunt.com/en/articles/17734384-5-how-to-promote-your-launch-and-what-to-avoid" target="_blank" rel="noopener">never pay for upvotes or comments</a>, and that bought engagement can get a launch removed and an account banned. It also weights votes by account history, so <a href="https://help.producthunt.com/en/articles/17734646-8-launch-faq-and-myths" target="_blank" rel="noopener">votes from brand-new or low-quality accounts earn far fewer points</a>. Good. But a market only exists when buyers exist, and the volume of offers tells you that many makers are paying.</p><p><button class="btn btn-ln" data-open="mail">Open the inbox</button></p>`],
  ['sad', 'What I would change', 'Open source should not need a budget', `<p class="lead">Too often, the leaderboard rewards whoever can manufacture momentum.</p><p>A commercial launch with a paid push, a "community" of vote-swappers, or a pump-and-dump product that collects a badge and disappears within a year. Meanwhile, free tools with their code on GitHub, the kind you can still run in ten years, get a fraction of the attention.</p><p>That's not a complaint about the people who work there. It's a design problem: when attention is ranked by votes, votes become a currency, and currencies get counterfeited.</p><p class="lead">What I would change</p><p>I'd love Product Hunt to update its algorithm so that open-source software is fairly unlocked and put forward, without needing a marketing budget of any kind: no upvote push, no ad campaign on Product Hunt. A lane for open-source launches, or credit for makers who ship consistently and honestly, would be a good start.</p><p>My takeaway, as a long-time member: if you want to perform on Product Hunt today, you need a big marketing budget alongside your launch. I think the platform is no longer suited to indie makers as it is, but it could make room for open-source builders.</p>`],
  ['again', 'Would I do it again?', 'Yes. The point was never the leaderboard', `<p class="lead">Yes. The point was never the leaderboard.</p><p>Twelve tools now exist that didn't a month ago, and every one of them is free.</p><p>The full numbers (visits, stars, feedback and what the paid boosts on X and LinkedIn actually delivered) are in the Full Report, published on Tuesday 24 November on <a href="https://www.linkedin.com/in/paulfxyz/" target="_blank" rel="noopener">LinkedIn</a> and <a href="https://x.com/paulfxyz" target="_blank" rel="noopener">X</a>.</p>`]
];
def('notes', { title: 'Field notes', w: 860, h: 560, build(b, w, o) {
  b.innerHTML = `<div class="nt"><div class="nt-side" role="tablist" aria-label="Notes">${NOTES.map((n, i) => `<button role="tab" aria-selected="${i === 0}" data-n="${i}"><b>${n[1]}</b><span>${n[2]}</span></button>`).join('')}</div><article class="nt-main prose" tabindex="0"></article></div>`;
  const show = i => { $$('.nt-side button', b).forEach((x, k) => x.setAttribute('aria-selected', k === i)); const m = $('.nt-main', b); m.innerHTML = `<p class="nt-date">Field notes from Product Hunt · November 2026</p><h2>${NOTES[i][1]}</h2>${NOTES[i][3]}`; m.scrollTop = 0; };
  $$('.nt-side button', b).forEach(x => x.addEventListener('click', () => show(+x.dataset.n)));
  w._show = show; show(o.note != null ? o.note : 0);
} });

const MSGS = [
  ['L', '#7C5CFF', 'Launch agency', 'Product Hunt DM', 'Hi! We can get you top 5 today. 300+ real upvotes, from $...'],
  ['S', '#1D9BF0', 'Growth hacker', 'X', 'Join our launch community, we support each other\u2019s launches...'],
  ['T', '#2C7A3B', 'Top-five service', 'Email', 'Guaranteed top-five placement for your launch. Packages from $...'],
  ['C', '#C8451F', 'Launch-day community', 'LinkedIn', 'Our supporters vote the minute you go live. DM me for prices...'],
  ['B', '#9A8A7B', 'Boost seller', 'Email', 'Need a launch-day boost? Upvotes and comments, delivered fast...']
];
const declined = new Set();
const mailBadge = () => { const n = MSGS.length - declined.size, el = $('#mailBadge'); if (el) { el.textContent = n; el.hidden = !n; } };
def('mail', { title: 'Inbox', w: 900, h: 520, build(b) {
  let sel = 0;
  const draw = () => {
    const left = MSGS.length - declined.size;
    b.innerHTML = `<div class="ml"><div class="ml-list"><div class="ml-head"><div><b>Inbox</b><span>${left ? left + ' offer' + (left > 1 ? 's' : '') + ' to sell me upvotes' : 'Inbox zero'}</span></div><button class="btn btn-or" id="mlAll" ${left ? '' : 'disabled style="opacity:.4"'}>Decline all</button></div>
      ${MSGS.map((m, i) => `<button class="ml-item${declined.has(i) ? ' declined read' : ''}" aria-selected="${i === sel}" data-m="${i}"><b>${m[2]}</b><small>${m[3]}</small><span>${m[4]}</span></button>`).join('')}
      <p class="small" style="padding:12px 14px">Paraphrased from the kind of offers I received on Product Hunt, LinkedIn, X and email. Declined, every time.</p></div>
      <div class="ml-read">${left === 0 && declined.has(sel) ? `<div class="zero"><b>Inbox zero.</b><p class="p2">Zero votes bought. Zero votes asked for.</p><button class="btn btn-ln" data-note="2">Why this market exists</button></div>` : (() => { const m = MSGS[sel]; return `<div class="ml-from"><span class="ml-av" style="background:${m[1]}">${m[0]}</span><div><b>${m[2]}</b><p class="small">via ${m[3]} · paraphrased</p></div></div><div class="ml-msg">"${m[4]}"</div>${declined.has(sel) ? '<span class="stamp">Declined</span>' : `<div class="row-btns"><button class="btn btn-or" data-dec="${sel}">Decline</button><button class="btn btn-ln" data-note="2">Read the field note</button></div>`}<p class="small">Product Hunt's own guide says <a href="https://help.producthunt.com/en/articles/17734384-5-how-to-promote-your-launch-and-what-to-avoid" target="_blank" rel="noopener">never pay for upvotes or comments</a>.</p>`; })()}</div></div>`;
    $$('.ml-item', b).forEach(x => x.addEventListener('click', () => { sel = +x.dataset.m; draw(); }));
    const d = $('[data-dec]', b); d && d.addEventListener('click', () => { declined.add(sel); mailBadge(); const nx = MSGS.findIndex((_, i) => !declined.has(i)); draw(); if (nx >= 0) setTimeout(() => { sel = nx; draw(); }, reduce() ? 0 : 700); });
    const all = $('#mlAll', b); all && all.addEventListener('click', () => { MSGS.forEach((_, i) => declined.add(i)); mailBadge(); draw(); toast('Five offers declined. Zero votes bought.'); });
    $$('[data-note]', b).forEach(x => x.addEventListener('click', () => openNote(+x.dataset.note)));
  };
  b._draw = draw; draw();
} });
const openNote = i => openApp('notes', { note: i, then: w => w._show && w._show(i) });

/* Slides helper */
function slides(b, list) {
  b.innerHTML = `<div class="kn"><div class="kn-thumbs" role="tablist">${list.map((s, i) => `<button role="tab" aria-selected="${i === 0}" data-s="${i}">${i + 1}. ${s.t}</button>`).join('')}</div><div class="kn-stage"><div class="kn-slide" tabindex="0"></div><div class="kn-ctrl"><button class="btn btn-ln" data-d="-1">← Back</button><span></span><button class="btn btn-or" data-d="1">Next →</button></div></div></div>`;
  let cur = 0; const st = $('.kn-slide', b);
  const go = i => { cur = Math.max(0, Math.min(list.length - 1, i)); const s = list[cur]; st.className = 'kn-slide ' + (s.c || ''); st.innerHTML = s.h; st.scrollTop = 0; $$('.kn-thumbs button', b).forEach((x, k) => x.setAttribute('aria-selected', k === cur)); $('.kn-ctrl span', b).textContent = `${cur + 1} / ${list.length}`; $('[data-d="-1"]', b).disabled = cur === 0; $('[data-d="1"]', b).style.visibility = cur === list.length - 1 ? 'hidden' : ''; };
  $$('.kn-thumbs button', b).forEach(x => x.addEventListener('click', () => go(+x.dataset.s)));
  $$('[data-d]', b).forEach(x => x.addEventListener('click', () => go(cur + +x.dataset.d)));
  b.addEventListener('keydown', e => { if (e.target.closest('input')) return; if (e.key === 'ArrowRight') { e.preventDefault(); go(cur + 1); } if (e.key === 'ArrowLeft') { e.preventDefault(); go(cur - 1); } });
  go(0);
}
const B = LOG.filter(p => p.budget).sort((a, b) => b.budget - a.budget);
def('saas', { title: 'SaaS is dead.key', w: 960, h: 600, build(b) {
  slides(b, [
    { t: 'SaaS is dead', c: 'orange', h: `<p class="eyb">A provocation, not an obituary</p><h2 class="big">SaaS is dead. Rent by default? <em style="color:#FFE7B0">Not anymore.</em></h2><p>My bet is that more companies will build and own the workflows they used to rent.</p>` },
    { t: 'For companies', c: 'light', h: `<p class="eyb">For companies</p><h2 class="big">Own the workflow. Question the recurring bill.</h2><p>Swapping SaaS seats for an uncontrolled AI bill isn't sovereignty. Use AI to create reusable tools, turn repeated prompts into owned apps, use ordinary code for predictable steps, and test small self-hosted models for narrow jobs.</p><p>Compare cost per successful result, including hardware, power, hosting, licences, security, maintenance and human time. Self-hosting is not automatically cheaper or more private.</p>` },
    { t: 'For founders and investors', h: `<p class="eyb">For SaaS founders and investors</p><h2 class="big">Reproducible features are no longer a moat.</h2><p>My deliberately aggressive belief: AI can already reproduce the software functionality of a SaaS company's entire product line, for less than one month of its revenue. Soon that budget could fall to one customer's annual bill, then their monthly bill.</p><p>If I'm right, SaaS economics built only on reproducible features could be reduced to dust. This is my prediction, not a benchmark. Recreating software is not rebuilding proprietary data, infrastructure, compliance or customer trust.</p>` },
    { t: 'The evidence', h: `<p class="eyb">The evidence on this desktop</p><h2 class="big" style="font-size:clamp(26px,2.8vw,40px)">Twelve simple tools, built, not rented, at a residual cost.</h2><p>A scratchpad, a domain monitor, a terminal assistant, an encrypted inbox, a contract reviewer, a research panel, a VPN, a credit monitor, a firewall template, a clock, a malware scanner and a game. Each one replaces or sidesteps something people usually pay for every month.</p><ol class="bars">${B.map(p => `<li><img src="/assets/icons/${p.key}.webp" alt=""><span>${p.name}</span><i style="--v:${p.budget / B[0].budget * 100}"></i><em>${p.budget}</em></li>`).join('')}<li style="border-top:1px solid rgba(255,255,255,.15);padding-top:6px"><span></span><span>All twelve, in US$</span><span></span><em>≈ ${TOTAL.toLocaleString('en-US')}</em></li></ol><p style="font-size:13px">Each prototype took roughly US$50 to US$400 of AI and time: AI tokens, hours and other compute, marketing or hosting across every iteration. An approximation, not a price or an invoice. Most run for a few dollars a month of hosting, or for free on your own machine.</p>` },
    { t: 'Four principles', h: `<p class="eyb">How to decide</p><h2 class="big">Build where it matters. Rent where it's worth it.</h2><ul class="principles"><li><b>Build where ownership is an advantage.</b>Internal tools, repeated workflows, anything your team touches every day.</li><li><b>Keep paying where it's worth it.</b>When a supplier delivers value you can't sensibly reproduce: data, networks, regulated services.</li><li><b>Budget the whole life, not the prototype.</b>Iteration, AI usage, maintenance, security and expertise all count.</li><li><b>Software on demand, responsibility included.</b>Every tool needs an owner, tests and a way back.</li></ul>` },
    { t: 'Your turn', c: 'orange', h: `<p class="eyb">Your turn</p><h2 class="big">Do the maths on your own stack.</h2><p>A rough sketch of three years of renting against building and running your own.</p><div class="row-btns"><button class="btn btn-ln" style="background:#fff;border:0;color:#1a0b05" data-open="calc">Open Rent or build</button><button class="btn btn-ln" style="background:transparent;color:#fff;border-color:rgba(255,255,255,.5)" data-open="hire">Hire a CHO to do it</button></div>` }
  ]);
} });

def('calc', { title: 'Rent or build', w: 420, h: 600, build(b) {
  b.innerHTML = `<div class="cl"><div class="cl-disp"><div class="r"><span>Rent, 3 years</span><b id="cR">–</b></div><div class="r"><span>Build, 3 years</span><b id="cB">–</b></div><div class="cl-bars" style="margin-top:10px"><div><span>Rent</span><i id="bR"></i></div><div class="b"><span>Build</span><i id="bB"></i></div></div><p class="v" id="cV" aria-live="polite"></p></div>
    <label>Seats<output id="oS"></output><input type="range" id="iS" min="1" max="500" value="25"></label>
    <label>Price per seat, per month<output id="oP"></output><input type="range" id="iP" min="5" max="200" step="5" value="30"></label>
    <label>Build budget, one-off<output id="oB"></output><input type="range" id="iB" min="100" max="10000" step="100" value="2000"></label>
    <label>Hosting and upkeep, per month<output id="oR"></output><input type="range" id="iR" min="0" max="2000" step="10" value="150"></label>
    <p class="small">A rough sketch, not a quote. Recreating software is not rebuilding data, compliance or trust. Count security, maintenance and an owner for every tool.</p></div>`;
  const f = () => {
    const s = +$('#iS', b).value, p = +$('#iP', b).value, bu = +$('#iB', b).value, r = +$('#iR', b).value;
    $('#oS', b).textContent = s; $('#oP', b).textContent = money(p); $('#oB', b).textContent = money(bu); $('#oR', b).textContent = money(r);
    const rent = s * p * 36, build = bu + r * 36, mx = Math.max(rent, build, 1);
    $('#cR', b).textContent = money(rent); $('#cB', b).textContent = money(build);
    $('#bR', b).style.width = rent / mx * 100 + '%'; $('#bB', b).style.width = build / mx * 100 + '%';
    const save = s * p - r; let m;
    if (save <= 0) m = 'Keep renting. At this scale the subscription is the better deal.';
    else { const k = Math.ceil(bu / save); m = k <= 36 ? `Building pays for itself in about ${k} month${k > 1 ? 's' : ''}, then saves ${money(save)} a month.` : 'Building only pays off after three years. Probably keep renting.'; }
    $('#cV', b).textContent = m;
  };
  $$('input', b).forEach(i => i.addEventListener('input', f)); f();
} });

const DEPTS = [['Marketing', ['Landing pages', 'Experiment dashboards']], ['Sales', ['Proposal builders', 'Account research']], ['Operations', ['Onboarding portals', 'Approval flows']], ['Engineering', ['Release tooling', 'QA assistants']], ['Legal', ['Contract intake, with lawyers owning the judgement']], ['Social', ['Calendars and approval queues, where humans approve what goes out']]];
def('cho', { title: 'CHO.md', w: 780, h: 600, build(b) {
  b.innerHTML = `<article class="dc prose"><p class="eyb">CHO.md</p><h2 class="big">What is a Chief Hacking Officer?</h2>
    <p class="lead">A Chief Hacking Officer uses AI to make an organisation work faster and better: sovereign software, reusable workflows and tools people can maintain.</p>
    <p>One accountable lead or small team, backed by the right experts.</p>
    <h3>Why "hacking"?</h3><p>Think life hacks and biohacks: finding a smarter route through a problem, not just cybersecurity. Shortcuts through friction, not around consent, security or quality. You don't need to be a founder to grow into the role.</p>
    <h3>How a CHO works</h3>
    <ul class="tools"><li><b>AI plus the right people</b>Centralise ownership, budgets and evaluation, not every decision. Work with internal specialists and expert contractors. A CHO enables engineering, sales, marketing, legal and operations; nobody replaces all their expertise.</li><li><b>Build with AI, run with judgement</b>Turn repeated prompts into reusable workflows. Test small models for bounded tasks and bigger ones for genuine gaps. The deliverable is a supported tool with an owner, not a chat transcript.</li><li><b>One home for your code</b>Every tool's code, tests, docs and deployment recipes live in organisation-owned Git repositories, ideally a self-hosted forge. Secrets and personal data stay out.</li><li><b>Private where needed, open where useful</b>Publish reusable, non-sensitive code when rights and security allow. Keep critical internals private.</li><li style="grid-column:1/-1"><b>Fork evidence, not promises</b>Give teams and AI assistants reviewed code, test results and known limitations to build on, then send improvements upstream.</li></ul>
    <h3>Tools a CHO could ship</h3>
    <div class="dtabs" role="tablist">${DEPTS.map((d, i) => `<button role="tab" aria-selected="${i === 0}" data-d="${i}">${d[0]}</button>`).join('')}</div><ul class="dpanel" aria-live="polite"></ul>
    <div class="impact"><b>Measure impact, not output.</b> Less repetitive work, better handoffs, tools teams can maintain. Include the full running cost, and keep testing, security and human approval in scope.</div>
    <p class="aside">For a real-world comparison, read how <a href="https://fintechly.com/five-minutes-with-ben-chisell-ceo-of-paysend/" target="_blank" rel="noopener">Paysend's CEO describes</a> selective AI trials, expansion after measurable value, and a shared internal coding agent.</p>
    <p class="row-btns" style="margin-top:18px"><button class="btn btn-or" data-open="hire">Hire me as your CHO</button></p></article>`;
  const sd = i => { $$('.dtabs button', b).forEach((x, k) => x.setAttribute('aria-selected', k === i)); $('.dpanel', b).innerHTML = DEPTS[i][1].map(t => `<li>${t}</li>`).join(''); };
  $$('.dtabs button', b).forEach(x => x.addEventListener('click', () => sd(+x.dataset.d))); sd(0);
} });

def('hire', { title: 'Hire me.app', w: 760, h: 620, build(b) {
  b.innerHTML = `<article class="dc prose"><p class="eyb">Paul Fleury · Founder. CEO. Chief Hacking Officer.</p><h2 class="big">A playful title, <em>serious consulting.</em></h2>
    <p class="lead">These twelve tools are my proof of work. Up to 30 hours of my week are open to do the same for your company.</p>
    <h3>How I split my week</h3><div class="week-bar" aria-hidden="true"><i style="--w:60"></i><i class="o" style="--w:30"></i><i class="s" style="--w:12"></i></div>
    <ul class="wl"><li><b>60 h</b><span>Openline, my main venture</span></li><li class="o"><b>Up to 30 h</b><span>CHO consulting</span><em>Available</em></li><li class="s"><b>10–15 h</b><span>Open source and side projects</span></li></ul>
    <dl class="terms"><div><dt>Who</dt><dd>A great company or ambitious startup, a worthwhile product, mutual trust and a modest budget.</dd></div><div><dt>What</dt><dd>A consulting CHO role: find your recurring bottlenecks, then design, build and hand over tools your team owns, with code in your repositories.</dd></div><div><dt>How</dt><dd>Small, measurable steps. Prototype in days, not quarters. Ordinary code where it's predictable, AI where it earns its place, humans approving what matters.</dd></div><div><dt>Cost</dt><dd>Simple tools at a residual cost: a prototype in the low hundreds of dollars of AI, then hosting measured in dollars a month. Full lifetime costs are always estimated with you, upfront.</dd></div><div><dt>Bring</dt><dd>A real problem and a mandate. Consulting is separate from Openline's fundraising.</dd></div></dl>
    <p class="row-btns" style="margin-top:18px"><a class="btn btn-or" href="${CONTACT}" target="_blank" rel="noopener">Let's build together ${EXT}</a><a class="btn btn-ln" href="https://www.linkedin.com/in/paulfxyz/" target="_blank" rel="noopener">Message me on LinkedIn ${EXT}</a><button class="btn btn-ln" data-open="cho">What is a CHO?</button></p></article>`;
} });

def('pitch', { title: 'Openline.pitch', w: 960, h: 600, build(b) {
  slides(b, [
    { t: 'Openline', h: `<p class="eyb">My main venture and startup</p><h2 class="big">Openline. <em style="color:var(--or-2)">Travel eSIMs, proven in B2B.</em></h2><p class="bign" style="color:var(--or)">1M+</p><p><b style="color:#fff">eSIMs activated through B2B partners.</b> Now we're bringing that experience straight to travellers, with more network options and a founder you can reach.</p><p style="color:#fff;font-weight:700">I'm raising from angels and VCs.</p><div class="row-btns"><a class="btn btn-or" href="${CONTACT}" target="_blank" rel="noopener">Talk to Paul ${EXT}</a><a class="btn btn-ln" style="background:transparent;color:#fff;border-color:rgba(255,255,255,.3)" href="https://openline.com" target="_blank" rel="noopener">openline.com ${EXT}</a></div>` },
    { t: 'Spin-offs', c: 'light', h: `<p class="eyb">Openline spin-offs</p><h2 class="big">Tools built for Openline, now products of their own.</h2><div class="vgrid"><div class="vcard"><header><img src="/assets/icons/iris.webp" alt=""><div><small>Openline spin-off</small><b>Iris</b></div></header><p>One inbox for 19 customer channels. AI drafts each reply with your own key. Nothing is sent until you approve it.</p><p class="small">Waitlist open · looking for investors</p><a href="https://iris.online" target="_blank" rel="noopener">iris.online ↗</a></div><div class="vcard"><header><img src="/assets/icons/digital-spot.webp" alt=""><div><small>Openline spin-off</small><b>Digital Spot</b></div></header><p>Social media on autopilot, four weeks ahead and in your voice. Only the posts you verify get published.</p><p class="small">First 200 get priority · looking for investors</p><a href="https://digital.spot" target="_blank" rel="noopener">digital.spot ↗</a></div></div>` },
    { t: 'Also on the bench', c: 'light', h: `<p class="eyb">Also on the bench</p><h2 class="big">A thought experiment and a Sunday hobby.</h2><div class="vgrid"><div class="vcard"><header><img src="/assets/icons/enki.webp" alt=""><div><small>Thought experiment</small><b>Enki</b></div></header><p>Open blueprints for AI on hardware you own. A non-profit of 300 people: no fee, one vote each.</p><p class="small">Looking for a philanthropist</p><a href="https://enki.ngo" target="_blank" rel="noopener">enki.ngo ↗</a></div><div class="vcard"><header><img src="/assets/icons/cup-of-news.webp" alt=""><div><small>Sunday hobby, soon an app</small><b>Cup of News</b></div></header><p>A calmer news app: scheduled briefings that link back to the original reporting.</p><p class="small">Open to contributors</p><a href="https://cupof.news" target="_blank" rel="noopener">cupof.news ↗</a></div></div>` },
    { t: 'Let\u2019s talk', c: 'orange', h: `<p class="eyb">Investor, philanthropist or just curious?</p><h2 class="big">The Marathon was the side project. Openline is the main bet.</h2><p>I read everything, and I reply.</p><div class="row-btns"><a class="btn btn-ln" style="background:#fff;border:0;color:#1a0b05" href="${CONTACT}" target="_blank" rel="noopener">Write to me ${EXT}</a></div>` }
  ]);
} });

const LESSONS = [
  ['Build what you need yourself', 'Every tool here started as a small annoyance in my own week. You\u2019ll write better copy, find better bugs and keep maintaining it after launch day.'],
  ['Lock one kit, then repeat it', 'Day one set the template: icon, six gallery slides, separate X and LinkedIn copy, a calendar reminder. Check each new kit against the live product. Batches drift.'],
  ['Be honest about the build', 'Say what AI did, what it cost and what the limits are. "A personal VPN, not an anonymity service" earns more trust than a bigger claim.'],
  ['Ask for feedback, never votes', 'It\u2019s the rule, and it\u2019s better for you. Feedback improves the product. Votes fade by Friday.'],
  ['Publish by hand, keep receipts', 'I posted every thread myself and logged each link in a small campaign manager. When dates moved, and they did, everything stayed in sync.'],
  ['Make it accessible, in every language', 'Reading aids, reduced motion, readable contrast and a simple page with narration, in every language you publish. It costs little with AI and it widens who can use your work.']
];
const KIT = `# My launch-day kit (adapted from The Product Hunt Marathon, tphm.io)\n\n- [ ] One icon, six gallery slides, checked against the live product\n- [ ] A clear page in plain language: what it does, what it doesn't\n- [ ] A real maker comment: what AI did, what it cost, the limits\n- [ ] Separate copy for X and LinkedIn, posted by hand\n- [ ] A calendar reminder for followers\n- [ ] Ask for feedback, never votes. Decline every upvote offer\n- [ ] Log each published link in one place (receipts)\n- [ ] Reading aids, reduced motion, readable contrast, a simple page\n- [ ] Code public, MIT, with tests and a README\n- [ ] Bugs first, then the smallest useful change\n`;
def('builders', { title: 'Run your own.md', w: 720, h: 620, build(b) {
  let done = []; try { done = JSON.parse(localStorage.getItem('tphm-lessons') || '[]'); } catch (e) {}
  b.innerHTML = `<article class="dc prose"><p class="eyb">For builders and consultants</p><h2 class="big">Run your own <em>little marathon.</em></h2><p>What I'd tell anyone planning a run of public launches. Tick them off as you go.</p>
    <div class="check">${LESSONS.map(([t, d], i) => `<button aria-pressed="${done.includes(i)}" data-l="${i}"><b>${t}</b><span>${d}</span></button>`).join('')}</div>
    <p class="row-btns" style="margin-top:18px"><button class="btn btn-or" id="cpk">Copy the launch-day checklist</button><a class="btn btn-ln" href="https://github.com/paulfxyz" target="_blank" rel="noopener">All the code on GitHub ${EXT}</a></p></article>`;
  $$('.check button', b).forEach(x => x.addEventListener('click', () => { x.setAttribute('aria-pressed', x.getAttribute('aria-pressed') !== 'true'); done = $$('.check [aria-pressed=true]', b).map(y => +y.dataset.l); try { localStorage.setItem('tphm-lessons', JSON.stringify(done)); } catch (e) {} if (done.length === 6) toast('All six. You\u2019re ready for your own marathon.'); }));
  $('#cpk', b).addEventListener('click', async () => { try { await navigator.clipboard.writeText(KIT); toast('Checklist copied. Go ship something.'); } catch (e) { toast('Copy failed on this browser.'); } });
} });

def('trash', { title: 'Trash', w: 520, h: 380, build(b) {
  b.innerHTML = `<div class="tr"><div class="tr-item"><span class="doc" style="--c:#6B7280"><b>SAAS</b></span><div><b>Rent-by-default.saas</b><span>Moved to the Trash on Tue 10 Nov 2026, day one of the Marathon</span></div></div><div class="tr-item"><span class="folder" style="transform:scale(.62);margin:-6px -8px"><i></i></span><div><b>Bought upvotes</b><span>Empty · 0 items, and it stays that way</span></div></div><p class="row-btns"><button class="btn btn-ln" id="emp">Empty Trash</button><button class="btn btn-ln" data-open="saas">Why SaaS is dead</button></p></div>`;
  $('#emp', b).addEventListener('click', () => toast('Kept as a reminder. Zero upvotes bought, rent by default retired.'));
} });

def('about', { title: 'About TPHM OS', w: 560, h: 620, build(b) {
  b.innerHTML = `<div class="ab"><img src="/assets/brand/pfph-head-v1.webp" alt="" width="272" height="201"><h2 class="big">TPHM OS 12.0</h2><p class="small" style="font-family:var(--mono)">The Product Hunt Marathon · 10–21 Nov 2026 · Lisbon</p>
    <p>The permanent logbook of twelve free, open-source launches by Paul Fleury. Think. Build. Ship. Repeat.</p>
    <p>Dedicated to Aaron Swartz, Jonathan James, Bassel Khartabil and Barnaby Jack, for documentation, shared ownership, maintenance and responsible testing. They inspired this work; they never endorsed it.</p>
    <p class="small">The DJ kitty on the desktop plays the Free Software Song, recorded by Julian Coccia (GFDL 1.3+). Tetris is a trademark of The Tetris Company; Grand Theft Auto and GTA VI are trademarks of Take-Two Interactive and Rockstar Games. The Tetris bonus is a fan project, not affiliated with any of them, and comes down on request, no questions asked.</p>
    <div class="links"><a href="https://www.producthunt.com/@paulfxyz" target="_blank" rel="noopener">Product Hunt</a><a href="https://www.linkedin.com/in/paulfxyz/" target="_blank" rel="noopener">LinkedIn</a><a href="https://x.com/paulfxyz" target="_blank" rel="noopener">X</a><a href="https://github.com/paulfxyz" target="_blank" rel="noopener">GitHub</a><a href="https://paulfleury.com" target="_blank" rel="noopener">paulfleury.com</a><a href="${CONTACT}" target="_blank" rel="noopener">Contact</a><a href="https://megastack.sh" target="_blank" rel="noopener">Security friends: megastack.sh</a></div>
    <p><a class="btn btn-ln" href="${BASE}/" data-home>Read it as a page instead</a></p></div>`;
} });

/* Terminal */
def('terminal', { title: 'paul@tphm: ~', w: 720, h: 460, cls: 'dark-win', build(b) {
  b.innerHTML = `<div class="tm"><div class="o notranslate"></div><div class="tm-in"><span class="p">paul@tphm ~ %</span><input aria-label="Terminal command" autocomplete="off" spellcheck="false"></div></div>`;
  const out = $('.o', b), inp = $('input', b), tm = $('.tm', b); const hist = []; let hi = 0;
  const tl = h => h.replace(/(^|>)([^<]+)(?=<|$)/g, (m, a, t) => a + t.split('\n').map(l => l.replace(/\S(?:.*\S)?/, x => T(x))).join('\n'));
  const say = h => { out.insertAdjacentHTML('beforeend', tl(h) + '\n'); tm.scrollTop = tm.scrollHeight; };
  const find = q => LOG.find(p => p.key === q || p.name.toLowerCase() === q || p.key.startsWith(q));
  const CMDS = {
    help: () => say(`<span class="y">Commands</span>\n  <span class="a">ls</span>             list the twelve apps\n  <span class="a">open</span> &lt;name&gt;    open an app (try: open mars)\n  <span class="a">neofetch</span>       system info\n  <span class="a">budget</span>         what it took, tool by tool\n  <span class="a">whoami</span>         who built this\n  <span class="a">cat</span> cho.md     what is a CHO\n  <span class="a">hire</span> · <span class="a">invest</span> · <span class="a">notes</span> · <span class="a">inbox</span> · <span class="a">saas</span>\n  <span class="a">sudo upvote</span>    try it\n  <span class="a">clear</span>          clear the screen`),
    ls: () => say(LOG.map(p => `<span class="d">${String(p.n).padStart(2, '0')}</span>  <span class="a">${p.key.padEnd(18)}</span> ${p.kind}`).join('\n')),
    neofetch: () => say(`<span class="a">   /\\_/\\ </span>   <span class="y">paul</span>@<span class="y">tphm</span>\n<span class="a">  ( o.o )</span>   OS: TPHM OS 12.0 (Lisbon)\n<span class="a">   > ^ <</span>    Apps: 11 + 1, all MIT\n            Built: 10–21 Nov 2026\n            Cost: ≈ ${money(TOTAL)} for all twelve\n            Upvotes bought: 0\n            Shell: feedback over votes`),
    budget: () => say(B.map(p => `${p.name.padEnd(18)} <span class="a">${'█'.repeat(Math.round(p.budget / 25))}</span> ${p.budget}`).join('\n') + `\n${'All twelve'.padEnd(18)} ≈ ${TOTAL.toLocaleString('en-US')} US$\n<span class="d">AI tokens, hours, compute, marketing and hosting. Not a price.</span>`),
    whoami: () => say('Paul Fleury. Founder. CEO. Chief Hacking Officer. Lisbon.\nMain venture: <a href="https://openline.com" target="_blank" rel="noopener">Openline</a>. Contact: <a href="' + CONTACT + '" target="_blank" rel="noopener">paulfleury.com/contact</a>'),
    hire: () => { say('Opening Hire me.app…'); openApp('hire'); },
    invest: () => { say('Opening Openline.pitch…'); openApp('pitch'); },
    notes: () => { say('Opening Field notes…'); openApp('notes'); },
    inbox: () => { say('Opening Inbox…'); openApp('mail'); },
    saas: () => { say('Opening SaaS is dead.key…'); openApp('saas'); },
    clear: () => { out.innerHTML = ''; },
    exit: () => closeWin(b.closest('.win')),
    date: () => say(new Date().toString())
  };
  const run = raw => {
    const c = raw.trim(); say(`<span class="p">paul@tphm ~ %</span> ${c.replace(/</g, '&lt;')}`); if (!c) return;
    hist.push(c); hi = hist.length;
    const [cmd, ...rest] = c.toLowerCase().split(/\s+/), arg = rest.join(' ');
    if (cmd === 'open') { const p = find(arg); if (p) { say(`Launching ${p.name}…`); openApp('p:' + p.key); } else if (APPS[arg]) openApp(arg); else say(`open: ${arg || '(nothing)'}: not found. Try <span class="a">ls</span>.`); return; }
    if (cmd === 'cat') { if (/cho/.test(arg)) { say('Opening CHO.md…'); openApp('cho'); } else say(`cat: ${arg}: try cho.md`); return; }
    if (cmd === 'sudo' && /upvote|vote/.test(arg)) { say('<span class="a">Permission denied:</span> upvotes are not for sale on this machine.'); return; }
    if (cmd === 'sudo') { say('Nice try.'); return; }
    if (cmd === 'tetris') { say('Launching the bonus…'); openApp('p:tetris'); return; }
    if (cmd === 'rm' && /saas/.test(arg)) { say('Already in the Trash.'); return; }
    const p = find(cmd); if (p && !CMDS[cmd]) { say(`Launching ${p.name}…`); openApp('p:' + p.key); return; }
    (CMDS[cmd] || (() => say(`zsh: command not found: ${cmd.replace(/</g, '&lt;')}. Type <span class="a">help</span>.`)))();
  };
  inp.addEventListener('keydown', e => {
    if (e.key === 'Enter') { run(inp.value); inp.value = ''; }
    if (e.key === 'ArrowUp') { e.preventDefault(); hi = Math.max(0, hi - 1); inp.value = hist[hi] || ''; }
    if (e.key === 'ArrowDown') { e.preventDefault(); hi = Math.min(hist.length, hi + 1); inp.value = hist[hi] || ''; }
  });
  tm.addEventListener('click', () => inp.focus());
  say('<span class="d">TPHM OS 12.0 · last login: Tue 10 Nov 2026, day one</span>\nType <span class="a">help</span> to see what this machine can do.');
  setTimeout(() => inp.focus(), 100);
} });

/* ---------- Spotlight ---------- */
const sp = $('#spot'), sq = $('#spotQ'), sl = $('#spotL');
const SI = [
  ...LOG.map(p => ({ g: 'Apps', t: p.name, s: p.kind, id: 'p:' + p.key })),
  ...[['finder', 'The Marathon', 'All twelve apps'], ['notes', 'Field notes', 'Product Hunt, honestly'], ['mail', 'Inbox', 'Upvote sellers'], ['saas', 'SaaS is dead', 'Slides'], ['calc', 'Rent or build', 'Calculator'], ['cho', 'What is a CHO?', 'CHO.md'], ['hire', 'Hire me', 'Up to 30 h a week'], ['pitch', 'Openline, for investors', 'Main venture'], ['builders', 'Run your own marathon', 'Lessons and checklist'], ['terminal', 'Terminal', 'Type help'], ['welcome', 'Welcome', 'Start here'], ['about', 'About TPHM OS', 'Credits and links']].map(([id, t, s]) => ({ g: 'Documents and tools', t, s, id })),
  ...NOTES.map((n, i) => ({ g: 'Field notes', t: n[1], s: 'Note', id: 'notes', note: i })),
  { g: 'Actions', t: 'Write to Paul', s: 'paulfleury.com/contact', fn: () => open(CONTACT, '_blank', 'noopener'), id: 'hire' },
  { g: 'Actions', t: 'Light or dark windows', fn: () => act('theme'), id: 'about' },
  { g: 'Actions', t: 'Read it as a page', fn: () => { EMBED ? exitOS() : (location.href = BASE + '/'); }, id: 'welcome' }
];
let ss = 0, sr = [];
const spRender = () => {
  const q = sq.value.trim().toLowerCase();
  sr = q ? SI.filter(x => (x.t + ' ' + (x.s || '') + ' ' + T(x.t) + ' ' + T(x.s || '')).toLowerCase().includes(q)) : SI.filter(x => x.g !== 'Field notes').slice(0, 10);
  ss = Math.min(ss, Math.max(0, sr.length - 1)); let g = '', h = '';
  sr.forEach((x, i) => { if (x.g !== g) { g = x.g; h += `<li class="sp-g" role="presentation">${g}</li>`; } h += `<li class="sp-i" role="option" id="sp${i}" data-i="${i}" aria-selected="${i === ss}">${glyph(x.id)}<span>${x.t}</span>${x.s ? `<small>${x.s}</small>` : ''}</li>`; });
  sl.innerHTML = h; sq.setAttribute('aria-activedescendant', sr.length ? 'sp' + ss : '');
  const s = $('[aria-selected=true]', sl); s && s.scrollIntoView({ block: 'nearest' });
};
function spotOpen() { sq.value = ''; ss = 0; spRender(); sp.showModal(); sq.focus(); }
const spRun = i => { const x = sr[i]; if (!x) return; sp.close(); if (x.fn) x.fn(); else if (x.note != null) openNote(x.note); else openApp(x.id); };
sq.addEventListener('input', () => { ss = 0; spRender(); });
sq.addEventListener('keydown', e => {
  if (e.key === 'ArrowDown') { e.preventDefault(); ss = (ss + 1) % Math.max(1, sr.length); spRender(); }
  if (e.key === 'ArrowUp') { e.preventDefault(); ss = (ss - 1 + sr.length) % Math.max(1, sr.length); spRender(); }
  if (e.key === 'Enter') { e.preventDefault(); spRun(ss); }
});
sl.addEventListener('click', e => { const it = e.target.closest('.sp-i'); it && spRun(+it.dataset.i); });
sp.addEventListener('click', e => { if (e.target === sp) sp.close(); });

/* ---------- Keyboard ---------- */
document.addEventListener('keydown', e => {
  if ((e.metaKey || e.ctrlKey) && (e.key.toLowerCase() === 'k' || e.code === 'Space')) { e.preventDefault(); sp.open ? sp.close() : spotOpen(); return; }
  if (e.key === 'Escape' && !sp.open && !document.querySelector('.mb-menu.open')) { const t = topWin(); if (t && !e.target.closest('iframe')) { e.preventDefault(); closeWin(t); } }
});

/* ---------- Boot ---------- */
const boot = $('#boot');
let booted = false; try { booted = sessionStorage.getItem('tphmos-booted') === '1'; } catch (e) {}
let started = false;
const start = () => {
  if (started) return; started = true;
  boot.classList.add('done'); try { sessionStorage.setItem('tphmos-booted', '1'); } catch (e) {}
  const m = location.hash.match(/^#\/([\w-]+)/);
  if (m) { const k = m[1]; LOG.some(p => p.key === k) ? openApp('p:' + k) : APPS[k] ? openApp(k) : openApp('welcome'); }
  else if (!narrow()) openApp('welcome');
  if (!narrow()) setTimeout(() => notify({ g: 'mail', title: 'Launch agency · Product Hunt DM', text: '"Hi! We can get you top 5 today. 300+ real upvotes, from $..."', actions: [['Decline', () => { declined.add(0); mailBadge(); toast('Declined. Zero votes bought.'); const mw = open.get('mail'); mw && $('.wb', mw)._draw && $('.wb', mw)._draw(); }], ['Open Inbox', () => openApp('mail')]] }), 6000);
};
if (booted || reduce()) { boot.style.display = 'none'; start(); }
else {
  const T = ['Booting TPHM OS 12.0', 'Installing 11 + 1 apps…', 'Declining upvote offers…', 'Moving rent-by-default to the Trash…', 'Ready.'];
  T.forEach((t, i) => setTimeout(() => { $('#bootT').textContent = t; }, i * 380));
  setTimeout(start, 2000);
  const skip = () => start();
  addEventListener('keydown', skip, { once: true }); boot.addEventListener('click', skip);
}
addEventListener('hashchange', () => { const m = location.hash.match(/^#\/([\w-]+)/); if (!m) return; const k = m[1]; LOG.some(p => p.key === k) ? openApp('p:' + k, { silent: true }) : APPS[k] && openApp(k, { silent: true }); });
mailBadge();
})();
