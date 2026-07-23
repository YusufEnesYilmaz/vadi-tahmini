-- Vadi Tahmini · Küresel Sıralama tablosu + güvenlik kuralları
-- Supabase panelinde: SQL Editor → New query → bunu yapıştır → Run
--
-- TEKRAR ÇALIŞTIRILABİLİR: tablo/indeks/politika `if not exists`/`drop if exists`,
-- fonksiyonlar `create or replace`. Mevcut skorlar SİLİNMEZ.
-- 2026-07-23 güncellemesi: fonksiyonlara `set search_path = ''` + skor akla
-- yatkınlık tavanı eklendi → bu dosyanın YENİDEN çalıştırılması gerekir.

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
-- Yalnızca SELECT açık (herkes sıralamayı görebilir)
create policy "vt_read" on public.vt_leaderboard
  for select using (true);

-- İstemciden doğrudan INSERT/UPDATE/DELETE tamamen kapalıdır.
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

-- 5) Stored Procedure: Oyuncu Takma Adı Güncelleme (update_player_nick)
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
grant execute on function public.update_player_nick(text, text) to anon, authenticated;
