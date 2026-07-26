-- Vadi Tahmini · Küresel Sıralama tablosu + güvenlik kuralları
-- Supabase panelinde: SQL Editor → New query → bunu yapıştır → Run
--
-- TEKRAR ÇALIŞTIRILABİLİR: tablo/indeks/politika `if not exists`/`drop if exists`,
-- fonksiyonlar `create or replace`. Mevcut skorlar SİLİNMEZ.
-- 2026-07-23 güncellemesi: fonksiyonlara `set search_path = ''` + skor akla
-- yatkınlık tavanı eklendi → bu dosyanın YENİDEN çalıştırılması gerekir.
-- 2026-07-24 güncellemesi: tabloyu anon istemciye doğrudan okutmak `player_id`
-- sızdırıyordu; okuma `get_leaderboard` RPC'sine taşındı ve satır başına yalnız
-- `nick`, `score`, `is_me` dönüyor. Bu güvenlik düzeltmesi için bu dosyanın
-- YENİDEN çalıştırılması gerekir.
--
-- 2026-07-26 düzeltmesi: canlıda Sıralama paneli
--   "structure of query does not match function result type"
-- hatası veriyordu. Sebep: `create or replace function` DÖNÜŞ TİPİNİ DEĞİŞTİREMEZ —
-- veritabanında farklı imzalı eski bir `get_leaderboard` varsa Postgres
-- "cannot change return type of existing function" der ve ESKİ TANIM YERİNDE KALIR;
-- uygulama da o eski fonksiyonu çağırmaya devam eder. Çözüm: fonksiyon önce
-- DÜŞÜRÜLÜP yeniden kuruluyor + dönen kolonlar açıkça tip dönüşümlü.
-- Bu dosyanın YENİDEN çalıştırılması gerekir. (Tabloya dokunulmaz, SKORLAR SİLİNMEZ.)
--
-- TEŞHİS (bir daha olursa önce bunu çalıştır — sebebi tek bakışta gösterir):
--   select pg_get_function_identity_arguments(p.oid) as parametreler,
--          pg_get_function_result(p.oid)             as donen_tip
--   from pg_proc p join pg_namespace n on n.oid = p.pronamespace
--   where n.nspname = 'public' and p.proname = 'get_leaderboard';
--   -- Birden çok satır dönerse ESKİ BİR AŞIRI YÜKLEME (overload) kalmıştır:
--   -- imzasını yukarıdaki `parametreler` sütunundan okuyup elle düşür, ör.
--   --   drop function public.get_leaderboard(text, text);
--
--   select column_name, data_type from information_schema.columns
--   where table_schema = 'public' and table_name = 'vt_leaderboard';
-- Beklenen: fonksiyon `TABLE(nick text, score integer, is_me boolean)`,
-- tablo kolonları `nick text` + `score integer`.

-- 1) Tablo
create table if not exists public.vt_leaderboard (
  id         uuid primary key default gen_random_uuid(),
  player_id  text not null,          -- cihaz başına üretilen kimlik (vt:player_id)
  nick       text not null,          -- oyuncunun takma adı
  mode       text not null,          -- "timed:classic:normal" ya da "daily:classic"
  score      integer not null,       -- Zamana Karşı: doğru sayısı · Günlük: tahmin sayısı
  date       text,                   -- yalnız Günlük'te dolu (YYYY-MM-DD), Zamana Karşı'da boş
  created_at timestamptz not null default now()
);

-- Aynı oyuncunun aynı mod (+ gün) için tek satırı olsun (mükerrer kayıt olmasın)
create unique index if not exists vt_leaderboard_unique
  on public.vt_leaderboard (player_id, mode, coalesce(date, ''));

-- 2) Satır güvenliği (RLS) aç
alter table public.vt_leaderboard enable row level security;

-- Eski doğrudan erişim politikalarını temizle (güvenlik için)
drop policy if exists "vt_insert" on public.vt_leaderboard;
drop policy if exists "vt_update" on public.vt_leaderboard;
drop policy if exists "vt_read" on public.vt_leaderboard;

-- 3) Güvenli Kurallar:
-- İstemciden doğrudan SELECT/INSERT/UPDATE/DELETE tamamen kapalıdır.
-- Skor ekleme/güncelleme işlemleri yalnızca aşağıdaki SECURITY DEFINER RPC fonksiyonları ile yapılabilir.

-- 4) Stored Procedure: Güvenli Skor Gönderimi (submit_score)
create or replace function public.submit_score(
  p_player_id text,
  p_nick      text,
  p_mode      text,
  p_score     integer,
  p_date      text default null
)
returns void
language plpgsql
security definer
-- search_path BOŞ: SECURITY DEFINER fonksiyon tablo sahibinin yetkisiyle çalışır;
-- arama yolu boşaltılmazsa çağıranın yoluna konmuş sahte bir tablo/fonksiyon adı
-- çözülebilir. Bu yüzden aşağıdaki tüm adlar tam nitelikli (public.…) yazılmıştır.
set search_path = ''
as $$
declare
  v_clean_nick text;
  v_existing record;
begin
  -- Temizlik ve temel doğrulamalar
  v_clean_nick := trim(p_nick);
  if v_clean_nick = '' or p_score <= 0 or p_player_id is null or trim(p_player_id) = '' then
    return;
  end if;

  -- Akla yatkınlık tavanı: istemci skoru kendi üretiyor, sunucu oyunu simüle etmiyor.
  -- Bu yüzden en azından FİZİKSEL OLARAK imkânsız değerler reddedilir.
  -- Zamana Karşı: en uzun tur 90 sn (Kolay). Saniyede bir doğru bile insanüstüyken
  -- 60'ın üstü mümkün değil. Günlük: en fazla 10 hak var, 20 üstü anlamsız.
  -- (Kararlı bir hile bunu aşamaz ama "konsoldan 9999 yaz" seviyesini keser.)
  if p_mode like 'timed:%' and p_score > 60 then
    return;
  end if;
  if p_mode like 'daily:%' and p_score > 20 then
    return;
  end if;

  -- Takma ad uzunluk kontrolü (maks 25 karakter)
  if length(v_clean_nick) > 25 then
    v_clean_nick := substring(v_clean_nick from 1 for 25);
  end if;

  -- Mevcut kaydı bul
  select id, score, nick into v_existing
  from public.vt_leaderboard
  where player_id = p_player_id
    and mode = p_mode
    and coalesce(date, '') = coalesce(p_date, '');

  if found then
    -- Zamana Karşı: Yalnızca daha yüksek skor güncelle
    -- Günlük: Yalnızca daha az tahmin sayısı güncelle
    if p_mode like 'timed:%' then
      if p_score > v_existing.score then
        update public.vt_leaderboard
        set score = p_score, nick = v_clean_nick
        where id = v_existing.id;
      elsif v_existing.nick <> v_clean_nick then
        update public.vt_leaderboard
        set nick = v_clean_nick
        where id = v_existing.id;
      end if;
    else
      -- Günlük oyun
      if p_score < v_existing.score then
        update public.vt_leaderboard
        set score = p_score, nick = v_clean_nick
        where id = v_existing.id;
      elsif v_existing.nick <> v_clean_nick then
        update public.vt_leaderboard
        set nick = v_clean_nick
        where id = v_existing.id;
      end if;
    end if;
  else
    -- Yeni kayıt ekle
    insert into public.vt_leaderboard (player_id, nick, mode, score, date)
    values (p_player_id, v_clean_nick, p_mode, p_score, p_date);
  end if;
end;
$$;

-- 5) Stored Procedure: Güvenli Sıralama Okuma (get_leaderboard)
--
-- ⚠ `create or replace` DEĞİL, önce DROP: replace dönüş tipini değiştiremediği için
-- veritabanında farklı imzalı eski bir sürüm varsa güncelleme sessizce yarım kalıyor
-- ve istemci eski (uyuşmayan) fonksiyonu çağırmayı sürdürüyor. Düşürüp yeniden
-- kurmak bu tuzağı yapısal olarak kapatır; fonksiyon durum tutmadığı için düşürmek
-- hiçbir veriyi kaybettirmez.
drop function if exists public.get_leaderboard(text, text, text);

create function public.get_leaderboard(
  p_mode text,
  p_date text default null,
  p_me   text default null
)
returns table (
  nick  text,
  score integer,
  is_me boolean
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_mode is null or trim(p_mode) = '' then
    return;
  end if;

  -- Kolonlar AÇIKÇA tip dönüşümlü: `returns table` bildirimi ile gövdenin sonucu
  -- birebir aynı tipte olmak ZORUNDA (yoksa "structure of query does not match
  -- function result type"). Cast'ler, tablo kolonu ileride sürüklense bile
  -- (ör. `nick` varchar'a çevrilirse) fonksiyonu ayakta tutar.
  if p_mode like 'daily:%' then
    return query
    select
      lb.nick::text,
      lb.score::integer,
      (p_me is not null and lb.player_id = p_me)::boolean
    from public.vt_leaderboard as lb
    where lb.mode = p_mode
      and coalesce(lb.date, '') = coalesce(p_date, '')
    order by lb.score asc, lb.created_at asc
    limit 50;
    return;
  end if;

  return query
  select
    lb.nick::text,
    lb.score::integer,
    (p_me is not null and lb.player_id = p_me)::boolean
  from public.vt_leaderboard as lb
  where lb.mode = p_mode
  order by lb.score desc, lb.created_at asc
  limit 50;
end;
$$;

-- 6) Stored Procedure: Oyuncu Takma Adı Güncelleme (update_player_nick)
create or replace function public.update_player_nick(
  p_player_id text,
  p_nick      text
)
returns void
language plpgsql
security definer
set search_path = '' -- gerekçesi submit_score'da yazılı
as $$
declare
  v_clean_nick text;
begin
  v_clean_nick := trim(p_nick);
  if v_clean_nick = '' or p_player_id is null or trim(p_player_id) = '' then
    return;
  end if;

  if length(v_clean_nick) > 25 then
    v_clean_nick := substring(v_clean_nick from 1 for 25);
  end if;

  update public.vt_leaderboard
  set nick = v_clean_nick
  where player_id = p_player_id;
end;
$$;

-- Fonksiyonları anon ve authenticated kullanıcılara aç
grant execute on function public.submit_score(text, text, text, integer, text) to anon, authenticated;
grant execute on function public.get_leaderboard(text, text, text) to anon, authenticated;
grant execute on function public.update_player_nick(text, text) to anon, authenticated;
