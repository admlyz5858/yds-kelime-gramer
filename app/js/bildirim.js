// app/js/bildirim.js — günlük çalışma hatırlatması (Capacitor Local Notifications).
// Sadece Android uygulamasında çalışır; PWA/tarayıcıda sessizce devre dışıdır.

const BILDIRIM_ID = 4021;   // sabit id → her planlama öncekini değiştirir

export function bildirimVarMi() {
  return !!window.Capacitor?.Plugins?.LocalNotifications;
}

async function izinAl(LN) {
  try {
    let d = await LN.checkPermissions();
    if (d.display !== 'granted') d = await LN.requestPermissions();
    return d.display === 'granted';
  } catch (_) { return false; }
}

// saat: "HH:MM" — her gün o saatte tekrar eden hatırlatma kur
export async function gunlukKur(saat, mesaj) {
  const LN = window.Capacitor?.Plugins?.LocalNotifications;
  if (!LN) return { ok: false, sebep: 'yok' };
  const izin = await izinAl(LN);
  if (!izin) return { ok: false, sebep: 'izin' };
  const [sa, dk] = String(saat || '20:00').split(':').map(Number);
  try {
    await LN.cancel({ notifications: [{ id: BILDIRIM_ID }] }).catch(() => {});
    await LN.schedule({
      notifications: [{
        id: BILDIRIM_ID,
        title: 'YDS Çalışma Defteri',
        body: mesaj || 'Bugünkü kelimeler seni bekliyor 🌱 Serini koru!',
        schedule: { on: { hour: sa, minute: dk }, repeats: true, allowWhileIdle: true },
        smallIcon: 'ic_launcher',
      }],
    });
    return { ok: true };
  } catch (_) { return { ok: false, sebep: 'hata' }; }
}

export async function iptalEt() {
  const LN = window.Capacitor?.Plugins?.LocalNotifications;
  if (!LN) return;
  try { await LN.cancel({ notifications: [{ id: BILDIRIM_ID }] }); } catch (_) {}
}
