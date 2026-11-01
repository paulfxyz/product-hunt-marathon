// ph.paulfleury.com/simple: language switch, theme, and narration player.
import { SIMPLE } from './data.js?v=e5fbcd9f2a68';
const root = document.documentElement, RTL = new Set(['ar', 'he']), SPEED = 1.1, LANGS = Object.keys(SIMPLE);
const store = (k, v) => { try { localStorage.setItem('ph-' + k, v); } catch (_) {} try { document.cookie = `ph-${k}=${encodeURIComponent(v)}; Max-Age=31536000; Path=/; SameSite=Lax; Secure`; } catch (_) {} };
const read = k => { try { return localStorage.getItem('ph-' + k) || document.cookie.split('; ').find(c => c.startsWith('ph-' + k + '='))?.split('=')[1]; } catch (_) { return null; } };
const fromNav = () => (navigator.languages || [navigator.language]).map(l => (l || '').toLowerCase().split('-')[0]).find(l => LANGS.includes(l));
let lang = [new URLSearchParams(location.search).get('lang'), read('language'), fromNav(), 'en'].find(l => LANGS.includes(l));
const audio = document.querySelector('audio'), play = document.querySelector('.play'), bar = document.querySelector('.progress i'), time = document.querySelector('.time'), err = document.querySelector('.err');
const fmt = s => isFinite(s) ? `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}` : '';
const esc = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
function setPlaying(on) { play.setAttribute('aria-pressed', String(on)); play.querySelector('.player-text').textContent = on ? SIMPLE[lang].pause : SIMPLE[lang].listen; }
function apply(next, user) {
  lang = next; const d = SIMPLE[lang];
  root.lang = lang === 'zh' ? 'zh-Hans' : lang; root.dataset.language = lang; root.dir = RTL.has(lang) ? 'rtl' : 'ltr';
  document.title = d.metaTitle; document.querySelector('meta[name=description]').content = d.metaDescription;
  document.querySelectorAll('[data-t]').forEach(el => { el.textContent = d[el.dataset.t]; });
  document.querySelector('.cards').innerHTML = d.sections.map(s => `<section class="card"><h2>${esc(s.heading)}</h2><p>${esc(s.text)}</p></section>`).join('');
  document.querySelector('.dd-text').textContent = d.name;
  document.querySelector('.dd-btn').setAttribute('aria-label', `${d.language}: ${d.name}`);
  document.querySelectorAll('.dd-list li').forEach(li => li.setAttribute('aria-selected', String(li.dataset.lang === lang)));
  audio.pause(); audio.src = `/simple/audio/voice-${lang}.mp3?v=e5fbcd9f2a68`; audio.load(); setPlaying(false); bar.style.width = '0'; time.textContent = ''; err.hidden = true;
  if (user) { store('language', lang); const u = new URL(location.href); u.searchParams.set('lang', lang); history.replaceState(null, '', u); }
  window.dispatchEvent(new CustomEvent('ph-languagechange', { detail: { language: lang } }));
}
// Language menu
const list = document.querySelector('.dd-list'), ddBtn = document.querySelector('.dd-btn');
list.innerHTML = LANGS.map(l => `<li role="option" tabindex="-1" data-lang="${l}" lang="${l}" dir="${RTL.has(l) ? 'rtl' : 'ltr'}">${SIMPLE[l].name}</li>`).join('');
const close = focus => { list.hidden = true; ddBtn.setAttribute('aria-expanded', 'false'); if (focus) ddBtn.focus(); };
ddBtn.addEventListener('click', () => { const open = list.hidden; list.hidden = !open; ddBtn.setAttribute('aria-expanded', String(open)); if (open) list.querySelector('[aria-selected=true]')?.focus(); });
list.addEventListener('click', e => { const li = e.target.closest('li'); if (li) { apply(li.dataset.lang, true); close(true); } });
list.addEventListener('keydown', e => {
  const items = [...list.children], i = items.indexOf(document.activeElement);
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); items[(i + (e.key === 'ArrowDown' ? 1 : items.length - 1)) % items.length].focus(); }
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); document.activeElement.click(); }
  if (e.key === 'Escape') close(true);
});
document.addEventListener('click', e => { if (!e.target.closest('.dd')) close(false); });
// Theme
document.querySelector('.theme').addEventListener('click', () => { const t = root.dataset.theme === 'dark' ? 'light' : 'dark'; root.dataset.theme = t; store('theme', t); });
// Player
audio.preservesPitch = true;
play.addEventListener('click', async () => {
  if (!audio.paused) { audio.pause(); return; }
  try { audio.playbackRate = SPEED; await audio.play(); audio.playbackRate = SPEED; err.hidden = true; } catch (_) { err.hidden = false; setPlaying(false); }
});
audio.addEventListener('play', () => setPlaying(true));
audio.addEventListener('pause', () => setPlaying(false));
audio.addEventListener('ended', () => { setPlaying(false); bar.style.width = '100%'; });
audio.addEventListener('error', () => { if (audio.currentSrc && audio.networkState === 3) { err.hidden = false; setPlaying(false); } });
audio.addEventListener('timeupdate', () => { if (audio.duration) { bar.style.width = (audio.currentTime / audio.duration * 100) + '%'; time.textContent = fmt(audio.duration - audio.currentTime); } });
audio.addEventListener('loadedmetadata', () => { time.textContent = fmt(audio.duration); });
apply(lang, false);
