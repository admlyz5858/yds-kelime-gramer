// app/js/efekt.js — modern dokunuş: titreşim (haptics), ses efektleri, konfeti, paylaşım.
// Bağımsız, kütüphanesiz. Capacitor eklentileri varsa onları kullanır; yoksa web API'lerine düşer.

let _sesAcik = true;
let _titresimAcik = true;
export function efektAyarla({ ses, titresim } = {}) {
  if (typeof ses === 'boolean') _sesAcik = ses;
  if (typeof titresim === 'boolean') _titresimAcik = titresim;
}

// ---- Titreşim ----
export function titre(tip = 'hafif') {
  if (!_titresimAcik) return;
  try {
    const H = window.Capacitor?.Plugins?.Haptics;
    if (H) {
      if (tip === 'basari') H.notification?.({ type: 'SUCCESS' });
      else if (tip === 'hata') H.notification?.({ type: 'ERROR' });
      else H.impact?.({ style: tip === 'guclu' ? 'HEAVY' : tip === 'orta' ? 'MEDIUM' : 'LIGHT' });
      return;
    }
    if (navigator.vibrate) {
      navigator.vibrate(tip === 'hata' ? [25, 40, 25] : tip === 'basari' ? [12, 24, 12] : tip === 'guclu' ? 28 : 11);
    }
  } catch (_) {}
}

// ---- Ses (Web Audio; kısa tonlar) ----
let _actx = null;
function actx() { try { _actx = _actx || new (window.AudioContext || window.webkitAudioContext)(); return _actx; } catch (_) { return null; } }
export function ses(tip) {
  if (!_sesAcik) return;
  const ctx = actx(); if (!ctx) return;
  try {
    if (ctx.state === 'suspended') ctx.resume();
    const now = ctx.currentTime;
    const desen = tip === 'dogru' ? [[660, 0], [880, 0.09]]
      : tip === 'yanlis' ? [[196, 0]]
      : tip === 'kutlama' ? [[523, 0], [659, 0.1], [784, 0.2], [1047, 0.32]]
      : tip === 'seviye' ? [[523, 0], [784, 0.12], [1047, 0.24]]
      : [[523, 0]];
    for (const [f, t] of desen) {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = tip === 'yanlis' ? 'sawtooth' : 'sine';
      o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, now + t);
      g.gain.exponentialRampToValueAtTime(0.14, now + t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, now + t + 0.24);
      o.connect(g); g.connect(ctx.destination);
      o.start(now + t); o.stop(now + t + 0.26);
    }
  } catch (_) {}
}

// ---- Telaffuz (İngilizce; Web Speech API) ----
export function seslendir(text) {
  try {
    if (!window.speechSynthesis) return;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-US'; u.rate = 0.92;
    speechSynthesis.cancel(); speechSynthesis.speak(u);
  } catch (_) {}
}

// ---- Konfeti (canvas, kütüphanesiz) ----
export function konfeti(opt = {}) {
  try {
    const sure = opt.sure || 1400;
    const c = document.createElement('canvas');
    c.className = 'konfeti-katman';
    Object.assign(c.style, { position: 'fixed', inset: '0', width: '100%', height: '100%', pointerEvents: 'none', zIndex: '9999' });
    document.body.appendChild(c);
    const ctx = c.getContext('2d');
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = window.innerWidth, Hh = window.innerHeight;
    c.width = W * dpr; c.height = Hh * dpr; ctx.scale(dpr, dpr);
    const renkler = ['#c2542f', '#2f7d56', '#e0a92e', '#2f6f69', '#e8764d', '#d9b24e'];
    const N = opt.adet || 130, P = [];
    for (let i = 0; i < N; i++) P.push({
      x: W / 2 + (Math.random() - 0.5) * 80, y: Hh * 0.32,
      vx: (Math.random() - 0.5) * 11, vy: Math.random() * -10 - 3,
      g: 0.22 + Math.random() * 0.16, r: Math.random() * 6 + 3,
      c: renkler[i % renkler.length], rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.35,
    });
    const bas = performance.now();
    (function tik(now) {
      const gecen = now - bas;
      ctx.clearRect(0, 0, W, Hh);
      const a = Math.max(0, 1 - gecen / sure);
      for (const p of P) {
        p.vy += p.g; p.x += p.vx; p.y += p.vy; p.rot += p.vr;
        ctx.save(); ctx.globalAlpha = a; ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        ctx.fillStyle = p.c; ctx.fillRect(-p.r / 2, -p.r / 2, p.r, p.r * 0.62); ctx.restore();
      }
      if (gecen < sure) requestAnimationFrame(tik); else c.remove();
    })(bas);
  } catch (_) {}
}

// ---- Paylaşım (Web Share / Capacitor Share / panoya kopyala) ----
export async function paylas({ baslik, metin, url } = {}) {
  try {
    const S = window.Capacitor?.Plugins?.Share;
    if (S) { await S.share({ title: baslik, text: metin, url, dialogTitle: baslik }); return 'paylasildi'; }
    if (navigator.share) { await navigator.share({ title: baslik, text: metin, url }); return 'paylasildi'; }
    if (navigator.clipboard) { await navigator.clipboard.writeText(metin + (url ? '\n' + url : '')); return 'kopyalandi'; }
  } catch (e) {
    if (e && e.name === 'AbortError') return 'iptal';
  }
  return false;
}
