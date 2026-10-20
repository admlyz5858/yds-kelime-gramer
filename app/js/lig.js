// app/js/lig.js — Eşleştirme çevrimiçi ligi (Supabase REST, SDK'sız).
// Sunucuya giden tek şey: rastgele cihaz kimliği + takma ad + skor. Kişisel veri yok.
// Publishable anahtar herkese açık tasarlanmıştır; yazma kuralları sunucu tarafında (RLS) uygulanır.
const URL = 'https://thftjeecotladgnuqwhd.supabase.co';
const KEY = 'sb_publishable_Up8BuFFjwR-nNFlyyGpmzA_ns50xFAU';
const CKEY = 'yds-cihaz-v1';

export function cihazId() {
  try {
    let c = localStorage.getItem(CKEY);
    if (!c) {
      c = (globalThis.crypto && crypto.randomUUID) ? crypto.randomUUID() : 'c-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 12);
      localStorage.setItem(CKEY, c);
    }
    return c;
  } catch { return 'c-anonim-cihaz'; }
}

// Takma ad: 2–16 karakter; harf, rakam, boşluk, _ . -
export function adGecerli(ad) {
  const a = String(ad || '').trim().replace(/\s+/g, ' ');
  return /^[\p{L}\p{N} _.-]{2,16}$/u.test(a) ? a : null;
}

async function istek(yol, govde, { json = false, prefer = 'return=minimal' } = {}) {
  const ac = new AbortController();
  const zaman = setTimeout(() => ac.abort(), 9000);
  try {
    const r = await fetch(URL + yol, {
      method: 'POST', signal: ac.signal,
      headers: { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json', Prefer: prefer },
      body: JSON.stringify(govde),
    });
    if (!r.ok) { const e = new Error('lig ' + r.status); e.status = r.status; throw e; }
    return json ? r.json() : null;
  } finally { clearTimeout(zaman); }
}

export const skorGonder = (kayit) => istek('/rest/v1/skorlar', kayit);
export const liderAl = (tur, cihaz, tarih = null) => istek('/rest/v1/rpc/lider', { p_tur: tur, p_cihaz: cihaz, p_tarih: tarih }, { json: true });
export const takmaAdDegistir = (cihaz, ad) => istek('/rest/v1/rpc/takma_ad_degistir', { p_cihaz: cihaz, p_ad: ad }, { json: true });
export const ligdenAyril = (cihaz) => istek('/rest/v1/rpc/ligden_ayril', { p_cihaz: cihaz }, { json: true });
