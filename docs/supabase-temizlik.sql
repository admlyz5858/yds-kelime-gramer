-- Eşleştirme ligi kaldırıldığı için kullanılmayan lig nesneleri (proje: yds-lig).
-- Uygulama bu nesneleri artık çağırmıyor. Yalnızca Supabase SQL Editor'da, bilerek çalıştırın.
-- Bu dosya yedekler tablosuna, yedek_kontrol fonksiyonuna ve auth tablolarına dokunmaz.
-- Sırası önemli: önce tablo (trigger'ı ile birlikte düşer), sonra fonksiyonlar.

drop table if exists public.skorlar;
drop function if exists public.lider(text, text, date);
drop function if exists public.ligden_ayril(text);
drop function if exists public.takma_ad_degistir(text, text);
drop function if exists public.skor_hiz_siniri();
