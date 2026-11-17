-- Misafir sıralaması (Kelimetre 1.7.0+). Kayıt gerektirmez.
-- Kimlik: cihazda saklanan rastgele gizli anahtar; sunucuda yalnızca SHA-256 özeti tutulur.
-- Ad: sunucuda sabit kelime listelerinden üretilir; kullanıcı serbest metin giremez (uygunsuz ad / içerik denetimi yükü yok).
-- Tablolara doğrudan erişim yoktur (RLS açık, politika yok); istemci yalnızca aşağıdaki fonksiyonları çağırır.

create table if not exists public.oyuncular (
  id uuid primary key default gen_random_uuid(),
  anahtar_ozet text not null unique,
  ad text not null unique,
  olusturma timestamptz not null default now(),
  ad_degisimi timestamptz
);

create table if not exists public.oyun_skorlari (
  id bigint generated always as identity primary key,
  oyuncu uuid not null references public.oyuncular(id) on delete cascade,
  oyun text not null check (oyun in ('gunluk', 'bolum', 'av', 'karisik')),
  puan integer not null check (puan >= 0),
  gun date not null,
  zaman timestamptz not null default now()
);
-- Günün Eşleştirmesi: oyuncu başına günde tek skor (ilk gönderilen geçerli)
create unique index if not exists oyun_skorlari_gunluk_tek on public.oyun_skorlari (oyuncu, gun) where oyun = 'gunluk';
create index if not exists oyun_skorlari_gun_oyun on public.oyun_skorlari (gun, oyun);
create index if not exists oyun_skorlari_oyuncu_zaman on public.oyun_skorlari (oyuncu, zaman desc);

alter table public.oyuncular enable row level security;
alter table public.oyun_skorlari enable row level security;
revoke all on public.oyuncular from anon, authenticated;
revoke all on public.oyun_skorlari from anon, authenticated;

-- Türkiye günü (gece yarısı yerel saate göre)
create or replace function public._sira_gun() returns date
language sql stable set search_path = '' as $$ select (now() at time zone 'Europe/Istanbul')::date $$;

-- Anahtar → oyuncu kimliği (anahtar biçimi denetlenir)
create or replace function public._sira_oyuncu(p_anahtar text) returns uuid
language plpgsql stable security definer set search_path = '' as $$
declare v uuid;
begin
  if p_anahtar is null or p_anahtar !~ '^[0-9a-f]{32,64}$' then raise exception 'gecersiz anahtar'; end if;
  select id into v from public.oyuncular where anahtar_ozet = encode(extensions.digest(p_anahtar, 'sha256'), 'hex');
  return v;
end $$;

-- Rastgele misafir adı: "Sıfat Hayvan 10-99"
create or replace function public._sira_ad_uret() returns text
language plpgsql volatile set search_path = '' as $$
declare
  s text[] := array['Hızlı','Neşeli','Cesur','Bilge','Sakin','Parlak','Çevik','Meraklı','Zeki','Kararlı','Sabırlı','Uyanık','Atik','Becerikli','Usta','Hevesli','Yaratıcı','Şanslı','Dikkatli','Azimli'];
  h text[] := array['Baykuş','Tilki','Kartal','Yunus','Panda','Kaplan','Sincap','Penguen','Ceylan','Şahin','Kunduz','Zürafa','Leylek','Martı','Kedi','Kirpi','Turna','Atmaca','Geyik','Aslan'];
begin
  return s[1 + floor(random() * array_length(s, 1))::int] || ' ' || h[1 + floor(random() * array_length(h, 1))::int] || ' ' || (10 + floor(random() * 90))::int;
end $$;

-- Kayıt (varsa mevcut adı döndürür)
create or replace function public.oyuncu_kaydet(p_anahtar text) returns text
language plpgsql volatile security definer set search_path = '' as $$
declare v_id uuid := public._sira_oyuncu(p_anahtar); v_ad text;
begin
  if v_id is not null then select ad into v_ad from public.oyuncular where id = v_id; return v_ad; end if;
  for i in 1..25 loop
    v_ad := public._sira_ad_uret();
    begin
      insert into public.oyuncular (anahtar_ozet, ad) values (encode(extensions.digest(p_anahtar, 'sha256'), 'hex'), v_ad);
      return v_ad;
    exception when unique_violation then
      -- aynı ad (ya da aynı anda iki kayıt): tekrar dene
      v_id := public._sira_oyuncu(p_anahtar);
      if v_id is not null then select ad into v_ad from public.oyuncular where id = v_id; return v_ad; end if;
    end;
  end loop;
  raise exception 'ad uretilemedi';
end $$;

-- Yeni ad çek (dakikada en fazla bir kez)
create or replace function public.ad_yenile(p_anahtar text) returns text
language plpgsql volatile security definer set search_path = '' as $$
declare v_id uuid := public._sira_oyuncu(p_anahtar); v_son timestamptz; v_ad text;
begin
  if v_id is null then raise exception 'oyuncu yok'; end if;
  select ad_degisimi, ad into v_son, v_ad from public.oyuncular where id = v_id;
  if v_son is not null and v_son > now() - interval '1 minute' then return v_ad; end if;
  for i in 1..25 loop
    v_ad := public._sira_ad_uret();
    begin
      update public.oyuncular set ad = v_ad, ad_degisimi = now() where id = v_id;
      return v_ad;
    exception when unique_violation then null;
    end;
  end loop;
  raise exception 'ad uretilemedi';
end $$;

-- Skor gönder: oyun türüne göre üst sınır, dakikada en fazla 10, günde en fazla 300 gönderim
create or replace function public.skor_gonder(p_anahtar text, p_oyun text, p_puan integer) returns boolean
language plpgsql volatile security definer set search_path = '' as $$
declare v_id uuid := public._sira_oyuncu(p_anahtar); v_gun date := public._sira_gun(); v_ust integer;
begin
  if v_id is null then return false; end if;
  v_ust := case p_oyun when 'gunluk' then 300 when 'bolum' then 1500 when 'av' then 100 when 'karisik' then 60 else null end;
  if v_ust is null or p_puan is null or p_puan < 0 or p_puan > v_ust then return false; end if;
  if (select count(*) from public.oyun_skorlari where oyuncu = v_id and zaman > now() - interval '1 minute') >= 10 then return false; end if;
  if (select count(*) from public.oyun_skorlari where oyuncu = v_id and gun = v_gun) >= 300 then return false; end if;
  if p_oyun = 'gunluk' then
    insert into public.oyun_skorlari (oyuncu, oyun, puan, gun) values (v_id, p_oyun, p_puan, v_gun)
      on conflict (oyuncu, gun) where oyun = 'gunluk' do nothing;
  else
    insert into public.oyun_skorlari (oyuncu, oyun, puan, gun) values (v_id, p_oyun, p_puan, v_gun);
  end if;
  return true;
end $$;

-- Sıralama: 'gun' = bugünün Günün Eşleştirmesi, 'hafta' = bu hafta (Pazartesi'den) tüm oyunların toplamı.
-- İlk 20 + (listede yoksa) çağıranın kendi satırı. Yalnızca ad ve puan döner.
create or replace function public.siralama(p_anahtar text, p_donem text) returns table (sira integer, ad text, puan integer, ben boolean, toplam integer)
language plpgsql stable security definer set search_path = '' as $$
declare v_id uuid; v_gun date := public._sira_gun(); v_bas date;
begin
  v_id := case when p_anahtar is null then null else public._sira_oyuncu(p_anahtar) end;
  v_bas := case when p_donem = 'hafta' then v_gun - (extract(isodow from v_gun)::int - 1) else v_gun end;
  return query
  with t as (
    select s.oyuncu, sum(s.puan)::int as p
    from public.oyun_skorlari s
    where s.gun between v_bas and v_gun and (p_donem = 'hafta' or s.oyun = 'gunluk')
    group by s.oyuncu
  ), r as (
    select t.oyuncu, t.p, (rank() over (order by t.p desc))::int as rk, (count(*) over ())::int as n from t
  )
  select r.rk, o.ad, r.p, coalesce(r.oyuncu = v_id, false), r.n
  from r join public.oyuncular o on o.id = r.oyuncu
  where r.rk <= 20 or r.oyuncu = v_id
  order by r.rk, o.ad
  limit 21;
end $$;

-- Sıralamadan çık: oyuncu ve tüm skorları silinir
create or replace function public.siralamadan_cik(p_anahtar text) returns void
language plpgsql volatile security definer set search_path = '' as $$
declare v_id uuid := public._sira_oyuncu(p_anahtar);
begin
  if v_id is not null then delete from public.oyuncular where id = v_id; end if;
end $$;

revoke all on function public._sira_gun() from public, anon, authenticated;
revoke all on function public._sira_oyuncu(text) from public, anon, authenticated;
revoke all on function public._sira_ad_uret() from public, anon, authenticated;
revoke all on function public.oyuncu_kaydet(text) from public;
revoke all on function public.ad_yenile(text) from public;
revoke all on function public.skor_gonder(text, text, integer) from public;
revoke all on function public.siralama(text, text) from public;
revoke all on function public.siralamadan_cik(text) from public;
grant execute on function public.oyuncu_kaydet(text) to anon, authenticated;
grant execute on function public.ad_yenile(text) to anon, authenticated;
grant execute on function public.skor_gonder(text, text, integer) to anon, authenticated;
grant execute on function public.siralama(text, text) to anon, authenticated;
grant execute on function public.siralamadan_cik(text) to anon, authenticated;

-- hesabimi_sil yalnızca giriş yapmış kullanıcılar içindir
revoke execute on function public.hesabimi_sil() from anon, public;
grant execute on function public.hesabimi_sil() to authenticated;
