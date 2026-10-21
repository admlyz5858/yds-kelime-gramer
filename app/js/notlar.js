// app/js/notlar.js — Kelime başına kişisel hafıza ipucu (Memrise "mem" fikri): { en(küçük): metin }
import { loadNot, saveNot } from './storage.js';
const notlar = loadNot();
export const notAl = (en) => notlar[String(en).toLowerCase()] || '';
export function notKaydet(en, metin) {
  const k = String(en).toLowerCase();
  if (metin && metin.trim()) notlar[k] = metin.trim(); else delete notlar[k];
  saveNot(notlar);
}
export const notSayisi = () => Object.keys(notlar).length;
