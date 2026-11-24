// Accessibility menu for tphm.io, adapted from paulfleury.com/linkedin. No network calls; settings stay in localStorage.
import { A11Y_STRINGS } from './a11y-strings.js';
const KEY = 'pf-a11y-v1';
const DEFAULTS = { size: 0, font: false, space: false, contrast: false, links: false, motion: false, cursor: false, guide: false };
const root = document.documentElement;
const lang = (root.lang || 'en').toLowerCase();
// tphm.io switches language in place (window 'ph-languagechange'); 'zh' maps to 'cmn'.
const pick = () => { const l = root.dataset.language || (root.lang || 'en').toLowerCase().split('-')[0]; const c = l === 'zh' ? 'cmn' : l; return A11Y_STRINGS[c] ? c : 'en'; };
let code = pick();
let t = A11Y_STRINGS[code];
let state = { ...DEFAULTS };
try { state = { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch {}
const SIZES = [100, 115, 130, 150, 175];
state.size = Math.max(0, Math.min(SIZES.length - 1, Number(state.size) || 0));
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {} };
const canZoom = typeof CSS !== 'undefined' && CSS.supports && CSS.supports('zoom', '1.2');
let ruler;
function apply() {
  const scale = SIZES[state.size] / 100;
  // zoom scales every pixel-based size on the page; the menu itself is counter-scaled so it stays usable.
  if (canZoom) { root.style.zoom = scale === 1 ? '' : String(scale); root.style.setProperty('--a11y-inv', String(1 / scale)); }
  else root.style.fontSize = scale === 1 ? '' : SIZES[state.size] + '%';
  for (const [k, c] of [['font', 'a11y-font'], ['space', 'a11y-space'], ['contrast', 'a11y-contrast'], ['links', 'a11y-links'], ['motion', 'a11y-motion'], ['cursor', 'a11y-cursor']]) root.classList.toggle(c, !!state[k]);
  if (state.guide && !ruler && document.body) { ruler = document.createElement('div'); ruler.className = 'a11y-ruler'; ruler.setAttribute('aria-hidden', 'true'); document.body.append(ruler); }
  if (!state.guide && ruler) { ruler.remove(); ruler = null; }
  document.dispatchEvent(new CustomEvent('a11y-change', { detail: { ...state } }));
}
const I = {
  person: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="4.6" r="1.9"/><path d="M5 8.6l7 1.6 7-1.6M12 10.2v4.6m0 0-3.4 5.8m3.4-5.8 3.4 5.8"/></svg>',
  close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>',
  font: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 19 8.5 5 14 19M5 14.5h7M15.5 19v-7.5m0 1.6a2.6 2.6 0 1 1 0 .1M21 19v-7.5"/></svg>',
  space: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/><path d="M20 3v6M20 15v6M2 3v6M2 15v6" opacity=".0"/></svg>',
  contrast: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M12 3.5v17a8.5 8.5 0 0 0 0-17z" fill="currentColor"/></svg>',
  links: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3A4 4 0 0 0 11 18.700l1-1"/></svg>',
  motion: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M10 9v6M14 9v6"/></svg>',
  cursor: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 3l14 7.500-6 1.800L10.500 19z"/></svg>',
  guide: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 17h16"/><rect x="3" y="10.500" width="18" height="3" rx="1.500" fill="currentColor"/></svg>',
  headphones: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 14v-2a8 8 0 0 1 16 0v2"/><rect x="3" y="14" width="4.500" height="6.500" rx="2"/><rect x="16.500" y="14" width="4.500" height="6.500" rx="2"/></svg>',
  reset: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12a8 8 0 1 0 2.600-5.900M4 4v4.500h4.500"/></svg>',
  check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.500 10 17.500 19 7"/></svg>'
};
function build() {
  document.querySelectorAll('.a11y-fab, dialog.a11y-modal').forEach(el => el.remove());
  const fab = document.createElement('button');
  fab.type = 'button'; fab.className = 'a11y-fab'; fab.innerHTML = I.person;
  fab.setAttribute('aria-label', t.button); fab.title = t.button; fab.setAttribute('aria-haspopup', 'dialog');
  const dlg = document.createElement('dialog');
  dlg.className = 'a11y-modal'; dlg.setAttribute('aria-labelledby', 'a11y-title'); dlg.dir = root.dir || 'ltr'; dlg.lang = root.lang || 'en';
  const opts = [['font', t.font, I.font], ['space', t.spacing, I.space], ['contrast', t.contrast, I.contrast], ['links', t.links, I.links], ['motion', t.motion, I.motion], ['cursor', t.cursor, I.cursor], ['guide', t.guide, I.guide]];
  const simpleHref = (root.lang || 'en').toLowerCase().startsWith('fr') ? '/fr/simple/' : '/simple/';
  const rows = opts.map(([k, label, icon]) => `<li><button type="button" role="switch" class="a11y-row" data-key="${k}" aria-checked="false"><span class="a11y-ico">${icon}</span><span class="a11y-label"></span><span class="a11y-switch">${I.check}</span></button></li>`).join('');
  dlg.innerHTML = `<div class="a11y-box">
    <div class="a11y-top"><span class="a11y-badge">${I.person}</span><h2 id="a11y-title"></h2><button type="button" class="a11y-x" data-close>${I.close}</button></div>
    <div class="a11y-scroll">
      <p class="a11y-group-label" id="a11y-size-label"></p>
      <div class="a11y-size" role="group" aria-labelledby="a11y-size-label">
        <button type="button" class="a11y-step" data-size="-1"><span>A</span></button>
        <div class="a11y-level" aria-live="polite"><strong></strong><span class="a11y-dots">${SIZES.map(() => '<i></i>').join('')}</span></div>
        <button type="button" class="a11y-step" data-size="1"><b>A</b></button>
      </div>
      <ul class="a11y-list">${rows}</ul>
    </div>
    <div class="a11y-foot">${simpleHref ? `<a class="a11y-primary" href="${simpleHref}">${I.headphones}<span></span></a>` : ''}<button type="button" class="a11y-ghost" data-reset>${I.reset}<span></span></button><p class="a11y-note"></p></div>
  </div>`;
  dlg.querySelector('#a11y-title').textContent = t.title;
  dlg.querySelector('[data-close]').setAttribute('aria-label', t.close);
  dlg.querySelector('#a11y-size-label').textContent = t.textSize;
  const minus = dlg.querySelector('[data-size="-1"]'), plus = dlg.querySelector('[data-size="1"]');
  minus.setAttribute('aria-label', t.smaller); plus.setAttribute('aria-label', t.larger); minus.title = t.smaller; plus.title = t.larger;
  const rowEls = [...dlg.querySelectorAll('.a11y-row')];
  rowEls.forEach((el, i) => { el.querySelector('.a11y-label').textContent = opts[i][1]; });
  const link = dlg.querySelector('.a11y-primary span'); if (link) link.textContent = t.simple;
  dlg.querySelector('[data-reset] span').textContent = t.reset; dlg.querySelector('.a11y-note').textContent = t.note;
  const level = dlg.querySelector('.a11y-level strong'), dots = [...dlg.querySelectorAll('.a11y-dots i')];
  const refresh = () => {
    level.textContent = SIZES[state.size] + '%'; minus.disabled = state.size === 0; plus.disabled = state.size === SIZES.length - 1;
    dots.forEach((d, i) => d.classList.toggle('on', i <= state.size));
    rowEls.forEach(el => el.setAttribute('aria-checked', String(!!state[el.dataset.key])));
  };
  dlg.addEventListener('click', e => {
    if (e.target === dlg) return dlg.close();
    const b = e.target.closest('button'); if (!b) return;
    if (b.hasAttribute('data-close')) return dlg.close();
    if (b.dataset.size) state.size = Math.max(0, Math.min(SIZES.length - 1, state.size + Number(b.dataset.size)));
    else if (b.dataset.key) state[b.dataset.key] = !state[b.dataset.key];
    else if (b.hasAttribute('data-reset')) state = { ...DEFAULTS };
    else return;
    save(); apply(); refresh();
  });
  dlg.addEventListener('close', () => fab.focus());
  fab.addEventListener('click', () => { refresh(); dlg.showModal(); });
  document.addEventListener('mousemove', e => { if (ruler) ruler.style.top = Math.max(0, e.clientY / (canZoom ? SIZES[state.size] / 100 : 1) - 23) + 'px'; });
  document.addEventListener('touchmove', e => { if (ruler && e.touches[0]) ruler.style.top = Math.max(0, e.touches[0].clientY / (canZoom ? SIZES[state.size] / 100 : 1) - 23) + 'px'; }, { passive: true });
  document.body.append(fab, dlg);
}
apply();
if (document.body) build(); else document.addEventListener('DOMContentLoaded', build);
window.addEventListener('ph-languagechange', () => {
  const next = pick(); if (next === code && document.querySelector('.a11y-fab')) return;
  code = next; t = A11Y_STRINGS[code]; if (document.body) build();
});
