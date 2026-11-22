// Easter egg: a small floating button that plays the Free Software Song (free recording by Julian Coccia, GFDL 1.3+).
import { SONG_LABELS } from './song-strings.js';
const label = () => { const r = document.documentElement; const l = r.dataset.language || (r.lang || 'en').toLowerCase().split('-')[0]; return SONG_LABELS[l === 'zh' ? 'cmn' : l] || SONG_LABELS.en; };
function build() {
  const btn = document.createElement('button');
  btn.type = 'button'; btn.className = 'song-fab'; btn.setAttribute('aria-pressed', 'false');
  const setLabel = () => { btn.setAttribute('aria-label', label()); btn.title = label(); }; setLabel();
  window.addEventListener('ph-languagechange', setLabel);
  btn.innerHTML = '<svg class="song-play" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18V6l10-2v12"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="16.5" cy="16" r="2.5"/></svg>' +
    '<span class="song-bars" aria-hidden="true"><i></i><i></i><i></i></span>';
  let audio = null;
  const set = on => btn.setAttribute('aria-pressed', String(on));
  btn.addEventListener('click', async () => {
    if (!audio) {
      audio = new Audio('/assets/a11y/free-software-song.mp3'); audio.preload = 'auto';
      audio.addEventListener('ended', () => set(false));
      audio.addEventListener('error', () => { set(false); audio = null; });
    }
    if (audio.paused) { try { await audio.play(); set(true); } catch { set(false); } }
    else { audio.pause(); set(false); }
  });
  document.body.append(btn);
}
if (document.body) build(); else document.addEventListener('DOMContentLoaded', build);
