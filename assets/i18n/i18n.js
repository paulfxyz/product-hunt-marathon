/* TPHM i18n: element-level translation from an English-keyed dictionary.
   A "unit" is an element holding text plus inline markup. Its key is the text
   with inline elements written as <tN>…</tN> (or <tN/> when they hold no text),
   and any number written as {0}, {1}… so one entry covers every count. */
(() => {
'use strict';
const D = window.TPHM_DICT || {};
const H = window.TPHM_HARVEST ? (window.__tphmKeys = window.__tphmKeys || new Set()) : null;
if (!H && !Object.keys(D).length) { window.T = s => s; return; }
const INLINE = new Set(['A','B','I','EM','STRONG','SPAN','SMALL','CODE','KBD','BR','SUP','SUB','MARK','U','S','ABBR','TIME','Q','CITE','BUTTON','IMG','SVG','LABEL','INS','DEL','svg']);
const SKIP = new Set(['SCRIPT','STYLE','NOSCRIPT','TEXTAREA','INPUT','SELECT','OPTION','svg','SVG','CANVAS','VIDEO','AUDIO','IFRAME','TEMPLATE','PRE']);
const ATTRS = ['aria-label','alt','title','placeholder','data-tip','data-t','aria-roledescription'];
const NUM = /\d+(?:[.,]\d+)*/g;
const norm = s => s.replace(/\s+/g, ' ').trim();
const hasWord = s => /\p{L}{2,}/u.test(s);
const TOK = /<\/?t\d+\/?>|\d+(?:[.,]\d+)*/g;
const tmpl = s => { const n = []; const k = s.replace(TOK, m => m[0] === '<' ? m : '{' + (n.push(m) - 1) + '}'); return [k, n]; };
const fill = (s, n) => s.replace(/\{(\d+)\}/g, (m, i) => n[+i] !== undefined ? n[+i] : m);
const look = s => {
  const [k, n] = tmpl(s);
  if (H) { H.add(k); return null; }
  const v = D[k];
  if (v == null) (window.__tphmMiss = window.__tphmMiss || new Set()).add(k);
  return v == null || v === k ? null : fill(v, n);
};
window.T = s => { if (typeof s !== 'string' || !hasWord(s)) return s; const v = look(norm(s)); return v == null ? s : v; };

const isInline = el => INLINE.has(el.tagName) && !el.hasAttribute('data-i18n-block');
const inlineOnly = el => { for (const c of el.childNodes) { if (c.nodeType === 1 && (!isInline(c) || (c.tagName !== 'svg' && c.tagName !== 'SVG' && !inlineOnly(c)))) return false; } return true; };
const textOf = el => el.textContent;
const keyOf = (el, list) => {
  let out = '';
  const walk = p => {
    for (const c of p.childNodes) {
      if (c.nodeType === 3) out += c.nodeValue.replace(/[<>]/g, '');
      else if (c.nodeType === 1) {
        const i = list.push(c) - 1;
        const atomic = c.tagName === 'svg' || c.tagName === 'SVG' || c.tagName === 'IMG' || c.tagName === 'BR' || !hasWord(c.textContent);
        if (atomic) out += `<t${i}/>`; else { out += `<t${i}>`; walk(c); out += `</t${i}>`; }
      }
    }
  };
  walk(el);
  return norm(out);
};
const apply = (el, list, tr) => {
  const lead = /^\s/.test(el.firstChild && el.firstChild.nodeType === 3 ? el.firstChild.nodeValue : '') ? ' ' : '';
  const trail = /\s$/.test(el.lastChild && el.lastChild.nodeType === 3 ? el.lastChild.nodeValue : '') ? ' ' : '';
  const used = new Set();
  const take = i => { let n = list[i]; if (!n) return null; if (used.has(i)) return n.cloneNode(true); used.add(i); return n; };
  const frag = document.createDocumentFragment();
  const stack = [frag];
  const re = /<t(\d+)\/>|<t(\d+)>|<\/t(\d+)>|([^<]+|<)/g;
  let m; const s = lead + tr + trail;
  while ((m = re.exec(s))) {
    const top = stack[stack.length - 1];
    if (m[1] !== undefined) { const n = take(+m[1]); n && top.appendChild(n); }
    else if (m[2] !== undefined) { const n = take(+m[2]); if (n) { while (n.firstChild) n.removeChild(n.firstChild); top.appendChild(n); stack.push(n); } else stack.push(top); }
    else if (m[3] !== undefined) { if (stack.length > 1) stack.pop(); }
    else top.appendChild(document.createTextNode(m[4]));
  }
  el.replaceChildren(frag);
};
const skip = el => SKIP.has(el.tagName) || el.closest('[translate=no],.notranslate');
const attrs = el => {
  for (const a of ATTRS) {
    const v = el.getAttribute(a);
    if (v && hasWord(v)) { const t = look(norm(v)); if (t != null) el.setAttribute(a, t); }
  }
};
const unit = el => {
  if (!hasWord(textOf(el))) return;
  const list = []; const k = keyOf(el, list);
  const t = look(k);
  if (t != null) apply(el, list, t);
};
const textNode = n => {
  const v = n.nodeValue; if (!hasWord(v)) return;
  const t = look(norm(v));
  if (t != null) n.nodeValue = (/^\s/.test(v) ? ' ' : '') + t + (/\s$/.test(v) ? ' ' : '');
};
const run = root => {
  if (root.nodeType === 3) { const p = root.parentElement; if (p && !skip(p)) run(p); return; }
  if (root.nodeType !== 1 && root.nodeType !== 11) return;
  if (root.nodeType === 1) {
    if (skip(root)) return;
    attrs(root);
    if (root.tagName === 'TEMPLATE') { run(root.content); return; }
    if (inlineOnly(root) && hasWord(root.textContent) && !isInline(root)) { root.querySelectorAll('*').forEach(attrs); unit(root); return; }
  }
  for (const c of [...root.childNodes]) {
    if (c.nodeType === 3) textNode(c);
    else if (c.nodeType === 1) {
      if (c.tagName === 'TEMPLATE') { attrs(c); run(c.content); continue; }
      if (isInline(c) && !skip(c) && inlineOnly(c) && hasWord(c.textContent)) { c.querySelectorAll('*').forEach(attrs); attrs(c); if (c.tagName === 'BUTTON' || c.tagName === 'A' || c.tagName === 'LABEL' || c.tagName === 'SPAN') unit(c); else unit(c); }
      else run(c);
    } else if (c.nodeType === 11) run(c);
  }
};
window.TPHM_I18N_RUN = run;
let busy = false;
const mo = new MutationObserver(ms => {
  if (busy) return; busy = true;
  try {
    for (const m of ms) {
      if (m.type === 'attributes') { attrs(m.target); continue; }
      if (m.type === 'characterData') { const p = m.target.parentElement; if (p && !skip(p)) textNode(m.target); continue; }
      for (const n of m.addedNodes) { if (n.isConnected) run(n.nodeType === 3 ? n : n); }
    }
  } finally { mo.takeRecords(); busy = false; }
});
const start = () => {
  busy = true; run(document.body); if (document.title) document.title = window.T(document.title); mo.takeRecords(); busy = false;
};
mo.observe(document.documentElement, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });
if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
})();
