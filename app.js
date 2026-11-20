(() => {
'use strict';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const LOG = window.TPHM_LOG || [];
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.classList.contains('a11y-motion');
const ico = id => `<svg class="ico"><use href="#i-${id}"/></svg>`;
const money = n => 'US$' + Math.round(n).toLocaleString('en-US');
const ph = p => p.ph ? 'https://www.producthunt.com/products/' + p.ph : '';
const gh = p => 'https://github.com/paulfxyz/' + p.gh;
const TAGS = {
  junk: 'mac', ase: 'web infra', mang: 'infra ai', hollr: 'web', clippy: 'web ai', mercury: 'web ai',
  megamesh: 'infra', 'ai-credit-checker': 'mac ai', xnftables: 'infra', timescreen: 'mac web', mars: 'mac', tetris: 'web'
};
const host = u => u.replace(/^https?:\/\//, '').replace(/\/$/, '');

/* Theme */
$('.theme').addEventListener('click', () => {
  const t = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = t;
  try { localStorage.setItem('tphm-theme', t); } catch (e) {}
});

/* Header: scrolled, progress, current section */
const top = $('.top'), bar = $('.progress');
const onScroll = () => {
  top.classList.toggle('scrolled', scrollY > 8);
  const h = document.documentElement.scrollHeight - innerHeight;
  bar.style.setProperty('--sp', h > 0 ? (scrollY / h).toFixed(4) : 0);
};
addEventListener('scroll', onScroll, { passive: true }); onScroll();
const navLinks = $$('[data-nav]');

/* Toast */
let tt;
const toast = m => { const t = $('#toast'); t.textContent = m; t.classList.add('on'); clearTimeout(tt); tt = setTimeout(() => t.classList.remove('on'), 2200); };

/* Tooltips */
const tipbox = $('#tipbox');
const showTip = el => {
  tipbox.textContent = el.dataset.tip; tipbox.hidden = false;
  const r = el.getBoundingClientRect(), w = tipbox.offsetWidth, h = tipbox.offsetHeight;
  let x = Math.min(Math.max(8, r.left + r.width / 2 - w / 2), innerWidth - w - 8);
  let y = r.top - h - 10; if (y < 8) y = r.bottom + 10;
  tipbox.style.left = x + 'px'; tipbox.style.top = y + 'px';
};
const hideTip = () => { tipbox.hidden = true; };
document.addEventListener('mouseover', e => { const t = e.target.closest('[data-tip]'); if (t) showTip(t); });
document.addEventListener('mouseout', e => { if (e.target.closest('[data-tip]')) hideTip(); });
document.addEventListener('focusin', e => { const t = e.target.closest('[data-tip]'); t ? showTip(t) : hideTip(); });
document.addEventListener('click', e => { const t = e.target.closest('.tip'); if (t) { e.stopPropagation(); e.preventDefault(); tipbox.hidden ? showTip(t) : hideTip(); } else hideTip(); }, true);
addEventListener('scroll', hideTip, { passive: true });

/* Course + now carousel */
const course = $('#course'), track = $('#nowTrack'), runner = $('#runner');
let cur = LOG.length - 1;
course.innerHTML = LOG.map((p, i) => `<li class="${p.encore ? 'is-encore' : 'is-done'}"><a href="#/${p.key}" data-i="${i}" aria-label="Day ${p.n}: ${p.name}">${p.encore ? ico('star') : p.n}</a></li>`).join('');
track.innerHTML = LOG.map((p, i) => `
  <article class="slide" aria-roledescription="slide" aria-label="${p.n} of 12" ${i === cur ? '' : 'inert'}>
    <div class="now-art"><img src="/assets/kitty/p/${p.key}.webp" alt="The Marathon kitty for ${p.name}" width="900" height="502" ${i < 9 ? 'loading="lazy"' : ''}><span class="pill ${p.encore ? 'pill-encore' : 'pill-done'}">${p.encore ? ico('star') + ' Encore' : ico('check') + ' Shipped'}</span></div>
    <div class="now-body">
      <div class="now-head"><img class="app" src="/assets/icons/${p.key}.webp" alt="" width="52" height="52"><div><p class="now-day">${p.encore ? 'Bonus, 12 of 11' : 'Day ' + p.n + ' of 11'} · ${p.day}</p><p class="now-name">${p.name}</p></div></div>
      <p class="now-line">${p.line}</p>
      <div class="now-actions"><button class="btn btn-primary" type="button" data-open="${p.key}">Open the entry ${ico('go')}</button>${p.site ? `<a class="btn btn-ghost" href="${p.site}" target="_blank" rel="noopener">${host(p.site)} ${ico('ext')}</a>` : `<a class="btn btn-ghost" href="${gh(p)}" target="_blank" rel="noopener">${ico('gh')} GitHub</a>`}</div>
    </div>
  </article>`).join('');
const setSlide = (i, focus) => {
  cur = (i + LOG.length) % LOG.length;
  track.style.setProperty('--i', cur);
  $$('.slide', track).forEach((s, k) => s.toggleAttribute('inert', k !== cur));
  $$('li', course).forEach((li, k) => li.classList.toggle('sel', k === cur));
  runner.style.setProperty('--s', cur);
  const n = LOG[(cur + 1) % LOG.length];
  $('#nowNext').innerHTML = `<img src="/assets/icons/${n.key}.webp" alt="" width="28" height="28"><span>Next: <b>${n.name}</b> · ${n.day}</span>`;
};
$('#nowNext').addEventListener('click', () => setSlide(cur + 1));
$('#nowNext').setAttribute('role', 'button'); $('#nowNext').tabIndex = 0;
$('#nowNext').addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSlide(cur + 1); } });
$('#nowPrev').addEventListener('click', () => setSlide(cur - 1));
$('#nowNextBtn').addEventListener('click', () => setSlide(cur + 1));
course.addEventListener('click', e => { const a = e.target.closest('a[data-i]'); if (!a) return; e.preventDefault(); setSlide(+a.dataset.i); });
let sx = null;
track.addEventListener('touchstart', e => { sx = e.touches[0].clientX; }, { passive: true });
track.addEventListener('touchend', e => { if (sx == null) return; const d = e.changedTouches[0].clientX - sx; if (Math.abs(d) > 40) setSlide(cur + (d < 0 ? 1 : -1)); sx = null; });
setSlide(cur);

/* Hero paths */
const PATHS = {
  try: { t: '<b>Start with the wall.</b> Twelve free tools, each one a click away. Hover a tile to see it move, open it for the story and the links.', a: [['See all twelve', '#log', 'wall'], ['Play the encore', 'https://tetris.rocks']] },
  hire: { t: '<b>Up to 30 hours a week, open now.</b> I find your recurring bottlenecks, then build tools your team owns, with code in your repositories.', a: [['What a CHO does', '#cho'], ['Write to me', 'https://paulfleury.com/contact']] },
  invest: { t: '<b>Openline is my main venture.</b> Over one million eSIMs activated through B2B partners, now going direct to travellers. I\u2019m raising from angels and VCs.', a: [['See the ventures', '#invest'], ['Talk to Paul', 'https://paulfleury.com/contact']] },
  learn: { t: '<b>Six lessons and a launch checklist.</b> Plus an honest account of what Product Hunt rewards, and the upvote market I said no to.', a: [['Builder lessons', '#builders'], ['Field notes', '#hunt']] }
};
const pathCard = $('#pathCard');
$$('.path').forEach(b => b.addEventListener('click', () => {
  const on = b.getAttribute('aria-pressed') === 'true';
  $$('.path').forEach(x => x.setAttribute('aria-pressed', 'false'));
  if (on) { pathCard.hidden = true; return; }
  b.setAttribute('aria-pressed', 'true');
  const P = PATHS[b.dataset.path];
  pathCard.innerHTML = `<p>${P.t}</p><div class="path-actions">${P.a.map(([l, h, v], k) => h[0] === '#' ? `<a class="btn ${k ? 'btn-ghost' : 'btn-primary'}" href="${h}" ${v ? `data-view="${v}"` : ''}>${l} ${ico('go')}</a>` : `<a class="btn ${k ? 'btn-ghost' : 'btn-primary'}" href="${h}" target="_blank" rel="noopener">${l} ${ico('ext')}</a>`).join('')}</div>`;
  pathCard.hidden = false;
}));
pathCard.addEventListener('click', e => {
  const a = e.target.closest('a[href^="#"]'); if (!a) return;
  if (a.dataset.view) setView(a.dataset.view);
  const t = document.querySelector(a.getAttribute('href'));
  if (t) setTimeout(() => { t.classList.remove('flash'); void t.offsetWidth; t.classList.add('flash'); }, 500);
});

/* Log: rows + wall */
const rows = $('#rows'), wall = $('#wall');
rows.innerHTML = LOG.map(p => `
  <div class="row is-done${p.encore ? ' is-encore' : ''}" data-key="${p.key}" data-tags="${TAGS[p.key]}">
    <div class="row-meta"><span class="row-num">${String(p.n).padStart(2, '0')}</span><span class="row-date">${p.day}</span></div>
    <img class="app" src="/assets/icons/${p.key}.webp" alt="" width="52" height="52" loading="lazy">
    <div class="row-text"><p class="row-name"><button type="button" data-open="${p.key}">${p.name}</button><span class="row-kind">${p.kind}</span></p><p class="row-line">${p.line}</p></div>
    <span class="row-budget${p.budget ? '' : ' na'}">${p.budget ? '≈ ' + money(p.budget) : 'Bonus'}</span>
    <div class="row-links">${p.ph ? `<a class="ph" href="${ph(p)}" target="_blank" rel="noopener">Product Hunt ${ico('ext')}</a>` : ''}${p.site ? `<a href="${p.site}" target="_blank" rel="noopener">Website ${ico('ext')}</a>` : ''}<a href="${gh(p)}" target="_blank" rel="noopener">GitHub ${ico('ext')}</a></div>
  </div>`).join('');
wall.innerHTML = LOG.map(p => `
  <button class="tile" type="button" data-open="${p.key}" data-key="${p.key}" data-tags="${TAGS[p.key]}">
    <span class="tile-media"><img src="/assets/covers/${p.key}.webp" alt="" width="720" height="720" loading="lazy"><video muted loop playsinline preload="none" data-src="/assets/loops/${p.key}.mp4"></video><span class="tile-n">${p.encore ? '12 of 11' : p.n}</span></span>
    <span class="tile-body"><b>${p.name}</b><span>${p.kind}</span></span>
  </button>`).join('');
rows.addEventListener('click', e => { if (e.target.closest('a,button')) return; const r = e.target.closest('.row'); if (r) openProduct(r.dataset.key); });
const playTile = (t, on) => {
  if (reduce) return;
  const v = $('video', t); if (!v) return;
  if (on) { if (!v.src) v.src = v.dataset.src; v.classList.add('on'); v.play().catch(() => {}); }
  else { v.pause(); v.classList.remove('on'); }
};
wall.addEventListener('mouseover', e => { const t = e.target.closest('.tile'); if (t && !t.contains(e.relatedTarget)) playTile(t, true); });
wall.addEventListener('mouseout', e => { const t = e.target.closest('.tile'); if (t && !t.contains(e.relatedTarget)) playTile(t, false); });
wall.addEventListener('focusin', e => { const t = e.target.closest('.tile'); t && playTile(t, true); });
wall.addEventListener('focusout', e => { const t = e.target.closest('.tile'); t && playTile(t, false); });
$$('.chip').forEach(c => c.addEventListener('click', () => {
  $$('.chip').forEach(x => x.setAttribute('aria-pressed', x === c));
  const f = c.dataset.f;
  $$('[data-tags]').forEach(el => el.classList.toggle('is-hidden', f !== 'all' && !el.dataset.tags.split(' ').includes(f)));
}));
const setView = v => {
  $$('.seg button').forEach(b => b.setAttribute('aria-pressed', b.dataset.v === v));
  rows.hidden = v !== 'list'; wall.hidden = v !== 'wall';
  try { localStorage.setItem('tphm-view', v); } catch (e) {}
};
$$('.seg button').forEach(b => b.addEventListener('click', () => setView(b.dataset.v)));
try { const v = localStorage.getItem('tphm-view'); if (v) setView(v); } catch (e) {}

/* Dialog helpers */
const sbw = () => document.documentElement.style.setProperty('--sbw', (innerWidth - document.documentElement.clientWidth) + 'px');
const openDlg = d => { sbw(); if (!d.open) d.showModal(); const b = $('.dlg-body', d); b && (b.scrollTop = 0, b.focus({ preventScroll: true })); };
$$('.dlg').forEach(d => {
  d.addEventListener('click', e => { if (e.target === d || e.target.closest('[data-close]')) d.close(); });
});

/* Product dialog + hash */
const pd = $('#pdlg'), pv = $('#p-video');
let pi = 0;
const fill = i => {
  pi = (i + LOG.length) % LOG.length; const p = LOG[pi];
  $('#p-icon').src = `/assets/icons/${p.key}.webp`;
  $('#p-day').textContent = (p.encore ? 'Bonus, 12 of 11' : `Day ${p.n} of 11`) + ' · ' + p.day;
  $('#p-name').textContent = p.name;
  $('#p-kind').textContent = p.kind;
  $('#p-line').textContent = p.line;
  $('#p-note').textContent = p.note;
  $('#p-stack').textContent = p.stack;
  $('#p-budget').textContent = p.budget ? '≈ ' + money(p.budget) : 'Not tracked';
  $('#p-links').innerHTML = (p.site ? `<a class="btn btn-primary" href="${p.site}" target="_blank" rel="noopener">${p.encore ? 'Play' : 'Try'} ${host(p.site)} ${ico('ext')}</a>` : '') +
    (p.ph ? `<a class="btn ${p.site ? 'btn-ghost' : 'btn-primary'}" href="${ph(p)}" target="_blank" rel="noopener">${ico('ph')} Product Hunt</a>` : '') +
    `<a class="btn btn-ghost" href="${gh(p)}" target="_blank" rel="noopener">${ico('gh')} GitHub</a>`;
  pv.poster = `/assets/covers/${p.key}.webp`;
  pv.src = `/assets/loops/${p.key}.mp4`;
  pv.setAttribute('aria-label', `${p.name} animated cover`);
  if (!reduce) pv.play().catch(() => {});
  const a = LOG[(pi - 1 + LOG.length) % LOG.length], b = LOG[(pi + 1) % LOG.length];
  $('#p-prev span').textContent = a.name; $('#p-next span').textContent = b.name;
  $('#p-count').textContent = `${pi + 1} / ${LOG.length}`;
  $('.p-body').scrollTop = 0;
};
function openProduct(key, push = true) {
  const i = LOG.findIndex(p => p.key === key); if (i < 0) return;
  fill(i); openDlg(pd);
  if (push && location.hash !== '#/' + key) history.replaceState(null, '', '#/' + key);
}
const step = d => { fill(pi + d); history.replaceState(null, '', '#/' + LOG[pi].key); };
$('#p-prev').addEventListener('click', () => step(-1));
$('#p-next').addEventListener('click', () => step(1));
pd.addEventListener('keydown', e => {
  if (e.target.closest('input')) return;
  if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
  if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
});
pd.addEventListener('close', () => { pv.pause(); if (LOG.some(p => location.hash === '#/' + p.key)) history.replaceState(null, '', page === 'home' ? location.pathname + location.search : '#/' + page); });
document.addEventListener('click', e => { const b = e.target.closest('[data-open]'); if (b) { e.preventDefault(); openProduct(b.dataset.open); } });
/* Pages: a short landing plus one page per chapter */
const PAGES = ['hunt', 'saas', 'cho', 'invest', 'builders'];
const PAGE_T = { hunt: 'The hunt', saas: 'SaaS is dead', cho: 'Hire a CHO', invest: 'Invest', builders: 'Run your own' };
const PAGE_OF = { top: 'home', main: 'home', log: 'home', chapters: 'home', follow: 'home', hunt: 'hunt', inbox: 'hunt', saas: 'saas', calc: 'saas', took: 'saas', cho: 'cho', invest: 'invest', builders: 'builders' };
const BASE_T = document.title;
let page = 'home';
PAGES.forEach((p, i) => {
  const s = document.getElementById(p), w = $('.wrap', s);
  const pv = PAGES[i - 1], nx = PAGES[i + 1];
  w.insertAdjacentHTML('afterbegin', `<nav class="crumb" aria-label="Breadcrumb"><a href="#/" data-back>${ico('back')} The logbook</a><span class="crumb-r"><span class="crumb-step">${pv ? `<a class="cs-btn" href="#/${pv}" aria-label="Previous chapter: ${PAGE_T[pv]}">${ico('back')}<span>${PAGE_T[pv]}</span></a>` : ''}<span class="cs-n">Chapter ${i + 1} of ${PAGES.length}</span>${nx ? `<a class="cs-btn" href="#/${nx}" aria-label="Next chapter: ${PAGE_T[nx]}"><span>${PAGE_T[nx]}</span>${ico('go')}</a>` : ''}</span></span><a class="crumb-os" href="/os/" data-os>${ico('os')} Open the OS</a></span></nav>`);
  w.insertAdjacentHTML('beforeend', `<nav class="pager" aria-label="Chapters">${pv ? `<a class="pg" href="#/${pv}"><small>${ico('back')} Previous</small><b>${PAGE_T[pv]}</b></a>` : '<a class="pg" href="#log"><small>' + ico('back') + ' Back to</small><b>The twelve</b></a>'}${nx ? `<a class="pg pg-n" href="#/${nx}"><small>Next ${ico('go')}</small><b>${PAGE_T[nx]}</b></a>` : '<a class="pg pg-n" href="/os/" data-os><small>Bonus ' + ico('go') + '</small><b>' + ico('os') + ' Boot TPHM OS</b></a>'}</nav>`);
});
/* "The 12" lights up only while the product grid is on screen */
let logSeen = false;
new IntersectionObserver(es => es.forEach(e => {
  logSeen = e.isIntersecting;
  const h = navLinks.find(a => a.dataset.nav === 'home');
  h && h.setAttribute('aria-current', logSeen && page === 'home' ? 'page' : 'false');
}), { rootMargin: '-35% 0px -45% 0px' }).observe(document.getElementById('log'));
let homeY = 0;
const showPage = (pg, target) => {
  if (page === 'home' && pg !== 'home') homeY = scrollY;
  const changed = pg !== page; page = pg;
  $$('section[data-page]').forEach(s => { s.hidden = s.dataset.page !== pg; });
  document.body.dataset.page = pg;
  navLinks.forEach(a => a.setAttribute('aria-current', a.dataset.nav === pg && (pg !== 'home' || logSeen) ? 'page' : 'false'));
  document.title = pg === 'home' ? BASE_T : `${PAGE_T[pg]} · TPHM`;
  const el = target && target !== 'top' && document.getElementById(target);
  if (el && target !== pg) requestAnimationFrame(() => el.scrollIntoView({ behavior: changed || reduce ? 'auto' : 'smooth', block: 'start' }));
  else if (changed && pg === 'home' && !target) requestAnimationFrame(() => scrollTo({ top: homeY, behavior: 'instant' }));
  else if (changed || target === pg || target === 'top') scrollTo({ top: 0, behavior: 'auto' });
  if (changed) { const h = pg === 'home' ? null : $('h2', document.getElementById(pg)); h && (h.tabIndex = -1, h.focus({ preventScroll: true })); }
  onScroll();
};
const route = () => {
  const hs = location.hash;
  const m = hs.match(/^#\/([\w-]*)/);
  if (m) {
    if (PAGES.includes(m[1])) return showPage(m[1], m[1]);
    if (m[1] && LOG.some(p => p.key === m[1])) { if (page !== 'home' && !pd.open) showPage('home'); return openProduct(m[1], false); }
    return showPage('home', m[1] ? null : 'top');
  }
  const id = hs.slice(1);
  if (id && PAGE_OF[id]) return showPage(PAGE_OF[id], id);
  showPage('home');
};
const go = href => { if (pd.open) pd.close(); if (location.hash !== href) history.pushState(null, '', href); route(); };
document.addEventListener('click', e => {
  const a = e.target.closest('a[href^="#"]'); if (!a || a.classList.contains('skip')) return;
  const href = a.getAttribute('href');
  if (href === '#/' || /^#\/(hunt|saas|cho|invest|builders)$/.test(href) || PAGE_OF[href.slice(1)]) { e.preventDefault(); go(href === '#/' ? location.pathname + location.search : href); if (href === '#/' && !a.hasAttribute('data-back')) { showPage('home', 'top'); } }
}, true);
addEventListener('popstate', route); addEventListener('hashchange', route); route();

/* Text dialogs */
const td = $('#tdlg'), tpl = $('#tpl-dlg').content;
const openText = k => {
  const s = tpl.querySelector(`[data-k="${k}"]`); if (!s) return;
  $('#t-title').textContent = s.dataset.t;
  $('#t-body').innerHTML = s.innerHTML + `<button class="btn btn-ghost dlg-done" type="button" data-close>Close</button>`;
  openDlg(td);
};
document.addEventListener('click', e => { const b = e.target.closest('[data-dlg]'); if (b) openText(b.dataset.dlg); });

/* Inbox */
const MSGS = [
  ['L', '#7C5CFF', 'Launch agency', 'Product Hunt DM', 'Hi! We can get you top 5 today. 300+ real upvotes, from $...'],
  ['S', '#1D9BF0', 'Growth hacker', 'X', 'Join our launch community, we support each other\u2019s launches...'],
  ['T', '#2C7A3B', 'Top-five service', 'Email', 'Guaranteed top-five placement for your launch. Packages from $...'],
  ['C', '#C8451F', 'Launch-day community', 'LinkedIn', 'Our supporters vote the minute you go live. DM me for prices...'],
  ['B', '#9A8A7B', 'Boost seller', 'Email', 'Need a launch-day boost? Upvotes and comments, delivered fast...']
];
const il = $('#inboxList');
il.innerHTML = MSGS.map(([a, c, f, ch, m]) => `<li><span class="inbox-av" style="background:${c}" aria-hidden="true">${a}</span><span class="inbox-from">${f}<small>${ch}</small></span><button class="inbox-x" type="button">Decline</button><span class="inbox-msg">"${m}"</span><span class="stamp" aria-hidden="true">Declined</span></li>`).join('');
const count = () => {
  const n = $$('li:not(.declined)', il).length;
  $('#inboxCount').textContent = n ? `${n} offer${n > 1 ? 's' : ''} to sell me upvotes` : 'Inbox zero. Zero votes bought.';
  $('#declineAll').disabled = !n; $('#declineAll').style.opacity = n ? 1 : .4;
};
il.addEventListener('click', e => { const b = e.target.closest('.inbox-x'); if (b) { b.closest('li').classList.add('declined'); count(); } });
$('#declineAll').addEventListener('click', () => {
  $$('li:not(.declined)', il).forEach((li, k) => setTimeout(() => { li.classList.add('declined'); count(); }, reduce ? 0 : k * 160));
});
count();

/* Point of view tabs */
const povTabs = $$('.pov [role=tab]');
povTabs.forEach((t, i) => {
  t.addEventListener('click', () => selPov(i));
  t.addEventListener('keydown', e => { if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); const j = (i + (e.key === 'ArrowRight' ? 1 : -1) + povTabs.length) % povTabs.length; selPov(j); povTabs[j].focus(); } });
});
function selPov(i) { povTabs.forEach((t, k) => { t.setAttribute('aria-selected', k === i); t.tabIndex = k === i ? 0 : -1; document.getElementById(t.getAttribute('aria-controls')).hidden = k !== i; }); }

/* Calculator */
const ids = ['seats', 'price', 'build', 'run'];
const calc = () => {
  const v = Object.fromEntries(ids.map(k => [k, +document.getElementById(k).value]));
  $('#o-seats').textContent = v.seats; $('#o-price').textContent = money(v.price); $('#o-build').textContent = money(v.build); $('#o-run').textContent = money(v.run);
  const rent = v.seats * v.price * 36, build = v.build + v.run * 36, mx = Math.max(rent, build, 1);
  $('#b-rent').style.width = (rent / mx * 100) + '%'; $('#b-build').style.width = (build / mx * 100) + '%';
  $('#v-rent').textContent = money(rent); $('#v-build').textContent = money(build);
  const monthlyRent = v.seats * v.price, saving = monthlyRent - v.run;
  let msg;
  if (saving <= 0) msg = 'Keep renting. At this scale the subscription is the better deal.';
  else { const m = Math.ceil(v.build / saving); msg = m <= 36 ? `Building pays for itself in about ${m} month${m > 1 ? 's' : ''}, then saves ${money(saving)} a month.` : 'Building only pays off after three years. Probably keep renting.'; }
  $('#verdict').textContent = msg;
};
ids.forEach(k => document.getElementById(k).addEventListener('input', calc)); calc();

/* What it took */
const B = LOG.filter(p => p.budget).sort((a, b) => b.budget - a.budget), MX = B[0].budget, TOT = B.reduce((s, p) => s + p.budget, 0);
$('#took').innerHTML = B.map(p => `<li><img src="/assets/icons/${p.key}.webp" alt="" width="28" height="28" loading="lazy"><button type="button" data-open="${p.key}">${p.name}</button><span class="tb"><i style="--v:${p.budget / MX * 100}"></i></span><span>${p.budget}</span></li>`).join('') +
  `<li class="took-total"><span></span><span>All twelve, in total</span><span></span><span>≈ ${TOT.toLocaleString('en-US')}</span></li>`;
new IntersectionObserver((es, o) => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); o.unobserve(e.target); } }), { threshold: .3 }).observe($('.took'));
const sig = $('.sig'); new IntersectionObserver((es, o) => es.forEach(e => { if (e.isIntersecting) { sig.classList.add('in'); o.disconnect(); } }), { threshold: .3 }).observe(sig);

/* CHO departments */
const DEPTS = [
  ['Landing pages', 'Experiment dashboards'], ['Proposal builders', 'Account research'], ['Onboarding portals', 'Approval flows'],
  ['Release tooling', 'QA assistants'], ['Contract intake'], ['Calendars', 'Approval queues']
];
const DNOTE = ['', '', '', '', 'Lawyers own the judgement.', 'Humans approve what goes out.'];
const dTabs = $$('.dept-tabs [role=tab]');
const selDept = i => {
  dTabs.forEach((t, k) => { t.setAttribute('aria-selected', k === i); t.tabIndex = k === i ? 0 : -1; });
  $('#deptPanel').innerHTML = `<ul>${DEPTS[i].map(x => `<li>${x}</li>`).join('')}</ul>${DNOTE[i] ? `<p>${DNOTE[i]}</p>` : ''}`;
};
dTabs.forEach((t, i) => {
  t.addEventListener('click', () => selDept(i));
  t.addEventListener('keydown', e => { if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); const j = (i + (e.key === 'ArrowRight' ? 1 : -1) + dTabs.length) % dTabs.length; selDept(j); dTabs[j].focus(); } });
});
selDept(0);

/* Builders */
const LESSONS = [
  ['Build what you need yourself', 'Every tool here started as a small annoyance in my own week. You\u2019ll write better copy, find better bugs and keep maintaining it after launch day.'],
  ['Lock one kit, then repeat it', 'Day one set the template: icon, six gallery slides, separate X and LinkedIn copy, a calendar reminder. Check each new kit against the live product. Batches drift.'],
  ['Be honest about the build', 'Say what AI did, what it cost and what the limits are. "A personal VPN, not an anonymity service" earns more trust than a bigger claim.'],
  ['Ask for feedback, never votes', 'It\u2019s the rule, and it\u2019s better for you. Feedback improves the product. Votes fade by Friday.'],
  ['Publish by hand, keep receipts', 'I posted every thread myself and logged each link in a small campaign manager. When dates moved, and they did, everything stayed in sync.'],
  ['Make it accessible, in every language', 'Reading aids, reduced motion, readable contrast and a simple page with narration, in every language you publish. It costs little with AI and it widens who can use your work.']
];
let done = []; try { done = JSON.parse(localStorage.getItem('tphm-lessons') || '[]'); } catch (e) {}
$('#lessons').innerHTML = LESSONS.map(([t, d], i) => `<button class="lesson" type="button" aria-pressed="${done.includes(i)}" data-l="${i}"><span class="lesson-box">${ico('check')}</span><b>${t}</b><span>${d}</span></button>`).join('');
$('#lessons').addEventListener('click', e => {
  const b = e.target.closest('.lesson'); if (!b) return;
  const on = b.getAttribute('aria-pressed') !== 'true'; b.setAttribute('aria-pressed', on);
  done = $$('.lesson[aria-pressed=true]').map(x => +x.dataset.l);
  try { localStorage.setItem('tphm-lessons', JSON.stringify(done)); } catch (e) {}
  if (done.length === LESSONS.length) toast('All six. You\u2019re ready for your own marathon.');
});
const KIT = `# My launch-day kit (adapted from The Product Hunt Marathon, tphm.io)

- [ ] One icon, six gallery slides, checked against the live product
- [ ] A clear page in plain language: what it does, what it doesn't
- [ ] A real maker comment: what AI did, what it cost, the limits
- [ ] Separate copy for X and LinkedIn, posted by hand
- [ ] A calendar reminder for followers
- [ ] Ask for feedback, never votes. Decline every upvote offer
- [ ] Log each published link in one place (receipts)
- [ ] Reading aids, reduced motion, readable contrast, a simple page
- [ ] Code public, MIT, with tests and a README
- [ ] Bugs first, then the smallest useful change
`;
$('#copyKit').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(KIT); toast('Checklist copied. Go ship something.'); }
  catch (e) { toast('Copy failed. Select the lessons instead.'); }
});

/* Command palette */
const kd = $('#kdlg'), kq = $('#kq'), kl = $('#klist');
const ITEMS = [
  ...LOG.map(p => ({ g: 'The 12', t: p.name, s: p.kind, img: `/assets/icons/${p.key}.webp`, run: () => openProduct(p.key) })),
  ...[['The log', 'log'], ['Field notes from Product Hunt', 'hunt'], ['SaaS is dead', 'saas'], ['Rent or build calculator', 'calc'], ['What it took', 'took'], ['Hire a CHO', 'cho'], ['Invest in Openline', 'invest'], ['Run your own marathon', 'builders'], ['Follow along', 'follow']]
    .map(([t, id]) => ({ g: 'Sections', t, ic: 'go', run: () => go(PAGES.includes(id) ? '#/' + id : '#' + id) })),
  { g: 'Sections', t: 'Boot TPHM OS', s: 'The Marathon as a desktop', ic: 'play', run: () => openOS() },
  { g: 'Read', t: 'What is a CHO?', ic: 'info', run: () => openText('cho') },
  { g: 'Read', t: 'The upvote black market', ic: 'info', run: () => openText('market') },
  { g: 'Read', t: 'The editors didn\u2019t pick it up', ic: 'info', run: () => openText('editors') },
  { g: 'Actions', t: 'Switch light or dark', ic: 'moon', run: () => $('.theme').click() },
  { g: 'Actions', t: 'Write to Paul', s: 'paulfleury.com/contact', ic: 'ext', run: () => open('https://paulfleury.com/contact', '_blank', 'noopener') },
  { g: 'Actions', t: 'Play Tetris', s: 'tetris.rocks', ic: 'play', run: () => open('https://tetris.rocks', '_blank', 'noopener') },
  { g: 'Actions', t: 'All the code on GitHub', ic: 'gh', run: () => open('https://github.com/paulfxyz', '_blank', 'noopener') }
];
let ksel = 0, kres = [];
const kRender = () => {
  const q = kq.value.trim().toLowerCase();
  kres = ITEMS.filter(x => !q || (x.t + ' ' + (x.s || '') + ' ' + x.g).toLowerCase().includes(q));
  ksel = Math.min(ksel, Math.max(0, kres.length - 1));
  let g = '', h = '';
  kres.forEach((x, i) => {
    if (x.g !== g) { g = x.g; h += `<li class="k-group" role="presentation">${g}</li>`; }
    h += `<li class="k-item" role="option" id="k${i}" data-i="${i}" aria-selected="${i === ksel}">${x.img ? `<img src="${x.img}" alt="">` : `<span class="k-ic">${ico(x.ic)}</span>`}<span>${x.t}</span>${x.s ? `<small>${x.s}</small>` : ''}</li>`;
  });
  kl.innerHTML = h || '<li class="k-empty">Nothing found. Try "mars" or "hire".</li>';
  kq.setAttribute('aria-activedescendant', kres.length ? 'k' + ksel : '');
  const s = $('[aria-selected=true]', kl); s && s.scrollIntoView({ block: 'nearest' });
};
const kOpen = () => { kq.value = ''; ksel = 0; kRender(); kd.showModal(); kq.focus(); };
const kRun = i => { const x = kres[i]; if (!x) return; kd.close(); setTimeout(x.run, 30); };
$('.k-open').addEventListener('click', kOpen);
kq.addEventListener('input', () => { ksel = 0; kRender(); });
kq.addEventListener('keydown', e => {
  if (e.key === 'ArrowDown') { e.preventDefault(); ksel = (ksel + 1) % Math.max(1, kres.length); kRender(); }
  else if (e.key === 'ArrowUp') { e.preventDefault(); ksel = (ksel - 1 + kres.length) % Math.max(1, kres.length); kRender(); }
  else if (e.key === 'Enter') { e.preventDefault(); kRun(ksel); }
});
kl.addEventListener('click', e => { const it = e.target.closest('.k-item'); if (it) kRun(+it.dataset.i); });
kl.addEventListener('mousemove', e => { const it = e.target.closest('.k-item'); if (it && +it.dataset.i !== ksel) { ksel = +it.dataset.i; $$('.k-item', kl).forEach(x => x.setAttribute('aria-selected', +x.dataset.i === ksel)); } });
kd.addEventListener('click', e => { if (e.target === kd) kd.close(); });
document.addEventListener('keydown', e => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); kd.open ? kd.close() : kOpen(); }
  else if (e.key === '/' && !e.target.closest('input,textarea,[contenteditable]') && !document.querySelector('dialog[open]')) { e.preventDefault(); kOpen(); }
});
if (!/Mac|iPhone|iPad/.test(navigator.platform)) $$('.k-open .kbd').forEach(k => { k.textContent = 'Ctrl K'; });

/* TPHM OS in a full-screen dialog */
const osd = $('#osdlg'), osf = $('#osframe');
let osReturn = null;
function openOS() {
  if (typeof osd.showModal !== 'function') { location.href = '/os/'; return; }
  osReturn = document.activeElement;
  if (kd.open) kd.close();
  osd.classList.remove('ready');
  osf.src = '/os/';
  osf.onload = () => { osd.classList.add('ready'); try { osf.contentWindow.focus(); } catch (e) {} };
  document.documentElement.classList.add('os-open');
  osd.showModal();
}
const closeOS = () => { if (osd.open) osd.close(); };
osd.addEventListener('close', () => { osf.src = 'about:blank'; document.documentElement.classList.remove('os-open'); osReturn && osReturn.focus && osReturn.focus({ preventScroll: true }); });
addEventListener('message', e => { if (e.origin === location.origin && e.data && e.data.tphm === 'exit-os') closeOS(); });
document.addEventListener('click', e => { const b = e.target.closest('[data-os]'); if (b) { e.preventDefault(); openOS(); } });

/* Chapter card: checklist progress */
const chDots = $('#chDots');
const paintDots = () => { let d = []; try { d = JSON.parse(localStorage.getItem('tphm-lessons') || '[]'); } catch (e) {} $$('i', chDots).forEach((x, k) => x.classList.toggle('on', k < d.length)); $('em', chDots).textContent = `${d.length} of 6 ticked`; };
paintDots(); addEventListener('storage', paintDots); document.addEventListener('change', paintDots); document.addEventListener('click', () => setTimeout(paintDots, 0));

})();
