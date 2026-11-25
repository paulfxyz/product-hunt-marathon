/* Language picker: 31 languages, the ready ones link to the same page in that language. */
(() => {
'use strict';
const LANGS = window.TPHM_LANGS || [], MAP = window.TPHM_SLUGMAP || {};
const html = document.documentElement;
const CUR = html.dataset.lang || 'en', BASE = html.dataset.base || '';
const T = s => (window.T ? window.T(s) : s);
const here = () => {
  let rest = decodeURIComponent(location.pathname.slice(BASE.length)).replace(/^\/|\/$/g, '');
  const first = rest.split('/')[0];
  const rev = Object.fromEntries(Object.entries(MAP[CUR] || {}).map(([k, v]) => [v, k]));
  return { key: rev[first] || first, hash: location.hash };
};
const urlFor = c => {
  const L = LANGS.find(x => x.c === c); if (!L) return '/';
  const { key, hash } = here();
  const slug = key ? ((MAP[c] || {})[key] || key) : '';
  const b = L.c === 'en' ? '' : '/' + L.c;
  return (slug ? b + '/' + slug : (b || '/')) + (hash && !/^#\//.test(hash) ? hash : '');
};
const cur = LANGS.find(x => x.c === CUR) || LANGS[0];
const globe = '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M3 12h18M12 3c2.6 2.6 3.8 5.6 3.8 9s-1.2 6.4-3.8 9c-2.6-2.6-3.8-5.6-3.8-9S9.4 5.6 12 3Z" fill="none" stroke="currentColor" stroke-width="2"/></svg>';
const short = { en: 'EN', fr: 'FR', cmn: '中文', he: 'עב' }[CUR] || CUR.toUpperCase();

const dlg = document.createElement('dialog');
dlg.className = 'ldlg'; dlg.id = 'ldlg'; dlg.setAttribute('aria-labelledby', 'l-title');
dlg.innerHTML = `<div class="ldlg-in">
  <div class="ldlg-top"><h2 id="l-title">${T('Choose your language')}</h2><button class="ldlg-x" type="button" aria-label="${T('Close')}"><svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg></button></div>
  <p class="ldlg-p">${T('Every language below is ready to read.')}</p>
  <label class="ldlg-q"><svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="m20 20-3.5-3.5" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg><input type="search" placeholder="${T('Search languages')}" aria-label="${T('Search languages')}" autocomplete="off" spellcheck="false" dir="auto"></label>
  <ul class="ldlg-list notranslate">${LANGS.map(L => {
    const inner = `<span class="lf" aria-hidden="true">${L.f}</span><span class="ln" lang="${L.l}" dir="${L.d}">${L.n}</span><span class="le">${T(L.e)}</span>`;
    return `<li data-s="${(L.n + ' ' + L.e + ' ' + T(L.e) + ' ' + L.c).toLowerCase()}">${L.on
      ? `<a href="${L.c === 'en' ? '/' : '/' + L.c}" data-lang="${L.c}" hreflang="${L.l}"${L.c === CUR ? ' aria-current="true"' : ''}>${inner}${L.c === CUR ? '<span class="lck" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m5 12.5 4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg></span>' : ''}</a>`
      : `<span class="l-off" aria-disabled="true">${inner}<span class="ls">${T('Coming soon')}</span></span>`}</li>`;
  }).join('')}</ul>
  <p class="ldlg-none" hidden>${T('No languages found')}</p>
</div>`;
document.body.appendChild(dlg);
const q = dlg.querySelector('input'), none = dlg.querySelector('.ldlg-none');
q.addEventListener('input', () => {
  const v = q.value.trim().toLowerCase(); let n = 0;
  dlg.querySelectorAll('li').forEach(li => { const ok = !v || li.dataset.s.includes(v) || li.textContent.toLowerCase().includes(v); li.hidden = !ok; n += ok; });
  none.hidden = n > 0;
});
dlg.querySelector('.ldlg-x').addEventListener('click', () => dlg.close());
dlg.addEventListener('click', e => {
  if (e.target === dlg) return dlg.close();
  const a = e.target.closest('a[data-lang]'); if (!a) return;
  e.preventDefault(); e.stopPropagation();
  try { localStorage.setItem('tphm-lang', a.dataset.lang); } catch (x) {}
  location.href = urlFor(a.dataset.lang);
}, true);
const open = () => { q.value = ''; q.dispatchEvent(new Event('input')); dlg.showModal(); if (matchMedia('(pointer:fine)').matches) q.focus(); };
const btn = `<button class="tool lang-b" type="button" data-lang-open aria-label="${T('Language')}: ${T(cur.e)}">${globe}<span>${short}</span></button>`;
const tools = document.querySelector('.top-tools');
if (tools) tools.insertAdjacentHTML('afterbegin', btn);
document.addEventListener('click', e => { if (e.target.closest('[data-lang-open]')) { e.preventDefault(); open(); } });
window.TPHM_OPEN_LANG = open;
})();
