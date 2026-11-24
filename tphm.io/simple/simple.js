// tphm.io/simple: narration player (1.1x, pitch kept) and theme toggle.
const $ = s => document.querySelector(s);
const root = document.documentElement;
const audio = new Audio();
const btn = $('#play'), label = $('#play-label'), time = $('#play-time'), bar = $('#play-bar'), err = $('#play-error');
const SPEED = 1.1;
let loaded = false;
const fmt = s => isFinite(s) ? Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0') : '';
const set = on => { btn.setAttribute('aria-pressed', String(on)); label.textContent = on ? btn.dataset.lPause : (audio.currentTime > 0 && !audio.ended ? btn.dataset.lResume : btn.dataset.lListen); };
audio.preload = 'none'; audio.preservesPitch = true;
audio.addEventListener('loadedmetadata', () => { audio.playbackRate = SPEED; time.textContent = fmt(audio.duration / SPEED); });
audio.addEventListener('timeupdate', () => { if (audio.duration) { bar.style.width = (audio.currentTime / audio.duration * 100) + '%'; time.textContent = fmt((audio.duration - audio.currentTime) / SPEED); } });
audio.addEventListener('ended', () => { audio.currentTime = 0; set(false); bar.style.width = '0'; time.textContent = fmt(audio.duration / SPEED); });
audio.addEventListener('error', () => { set(false); err.hidden = false; });
async function start() {
  err.hidden = true;
  if (!loaded) { audio.preload = 'auto'; audio.src = btn.dataset.src; audio.load(); loaded = true; }
  audio.playbackRate = SPEED;
  try { await audio.play(); set(true); } catch { set(false); err.hidden = false; }
}
btn.addEventListener('click', () => { if (audio.paused) start(); else { audio.pause(); set(false); } });
$('.theme').addEventListener('click', () => {
  const t = root.dataset.theme === 'dark' ? 'light' : 'dark';
  root.dataset.theme = t; try { localStorage.setItem('tphm-theme', t); } catch (e) {}
});
