// app/js/kart.js — Kelime kartı ortak parçaları (Öğren · Akış · Sözlük): seviye/tür/biçim çipleri,
// örnek bloğu (ana örnek + "biçim" notu + açılır ek örnekler). Saf HTML üretir; esc/ornekHTML dışarıdan gelir.
export const SEVIYE_AD = { 1: 'Temel', 2: 'Sık', 3: 'Orta', 4: 'İleri', 5: 'Akademik' };
const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z]/g, '');

// Örnekte vurgulanan biçim kart başlığından farklıysa ("begin" → "begun") o biçimi döndür
export function vurguBicimi(w, tokenlar) {
  const toks = tokenlar || w.ornek_tokenlar || [];
  if (/\s/.test(String(w.en).trim())) return '';
  const v = toks.filter(t => t.vurgu).map(t => String(t.k).replace(/[.,!?;:"'’)(]+$/g, ''));
  if (!v.length) return '';
  const bas = norm(w.en);
  const farkli = v.find(k => norm(k) !== bas);
  return farkli && v.length === 1 ? farkli : '';
}

// Çip satırı: S-seviye · tür · biçimler (accepted · accepting)
export function kartCiplerHTML(w, esc, opt = {}) {
  const parca = [];
  if (w.sv) parca.push(`<span class="kart-cip sv s${w.sv}">S${w.sv} ${SEVIYE_AD[w.sv] || ''}</span>`);
  if (w.tur && !opt.tursuz) parca.push(`<span class="kart-cip tur">${esc(w.tur)}</span>`);
  if (Array.isArray(w.bicimler) && w.bicimler.length) parca.push(`<span class="kart-cip bicim" title="Diğer biçimler">${w.bicimler.map(esc).join(' · ')}</span>`);
  return parca.length ? `<div class="kart-cipler">${parca.join('')}</div>` : '';
}

// Örnek bloğu. opt.hepsi: ek örnekler açık gelsin; opt.etiketsiz: "Örnek · dokun" etiketi yazılmasın
export function ornekBlokHTML(w, esc, ornekHTML, opt = {}) {
  if (!w.ornek_tokenlar) return '';
  const bicim = vurguBicimi(w);
  const ek = Array.isArray(w.ornekler) ? w.ornekler : [];
  let h = opt.etiketsiz ? '' : `<div class="kart-ornek-etiket">Örnek · kelimeye dokun, çeviri için kaydır</div>`;
  h += ornekHTML({ tokenlar: w.ornek_tokenlar, tr: w.ornek_tr });
  if (bicim) h += `<div class="kart-bicim-not">Cümledeki biçim: <b>${esc(bicim)}</b> — kart başlığı <b>${esc(w.en)}</b></div>`;
  if (ek.length) {
    const liste = ek.map(o => `<div class="kart-ek-ornek">${o.bicim ? `<span class="kart-ek-bicim">${esc(o.bicim)}</span>` : ''}${ornekHTML({ tokenlar: o.tokenlar, tr: o.tr })}</div>`).join('');
    h += opt.hepsi
      ? `<div class="kart-ek-baslik">${ek.length} ek örnek</div>${liste}`
      : `<button class="kart-ek-ac" type="button">+ ${ek.length} örnek daha</button><div class="kart-ek-liste" hidden>${liste}</div>`;
  }
  return h;
}

// "+ N örnek daha" düğmelerini bağla (root içinde); açılınca wireOrnekler yeniden çağrılır
export function wireEkOrnek(root, wireOrnekler) {
  root.querySelectorAll('.kart-ek-ac').forEach(b => b.onclick = (e) => {
    e.stopPropagation();
    const l = b.nextElementSibling; if (!l) return;
    l.hidden = false; b.remove();
    if (wireOrnekler) wireOrnekler(l);
  });
}
