-- Vadi Tahmini · Küresel Sıralama tablosu + güvenlik kuralları
-- Supabase panelinde: SQL Editor → New query → bunu yapıştır → Run

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

-- 3) Kurallar
-- Herkes okuyabilir (sıralama listesi herkese açık)
create policy "vt_read" on public.vt_leaderboard
  for select using (true);

-- Herkes skor ekleyebilir
create policy "vt_insert" on public.vt_leaderboard
  for insert with check (true);

-- Herkes güncelleyebilir (uygulama skoru id üzerinden günceller)
create policy "vt_update" on public.vt_leaderboard
  for update using (true) with check (true);

-- NOT: Bilerek DELETE kuralı YOK.
-- Böylece anahtarı ele geçiren biri bile tabloyu silip temizleyemez.
