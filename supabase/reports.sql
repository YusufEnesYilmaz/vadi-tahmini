-- Vadi Tahmini · "Hata bildir" raporları tablosu + güvenlik kuralları
-- Supabase panelinde: SQL Editor → New query → bunu yapıştır → Run
--
-- TEKRAR ÇALIŞTIRILABİLİR: tablo `if not exists`, fonksiyon `create or replace`.
-- Mevcut raporlar SİLİNMEZ.
--
-- Raporları OKUMAK: Supabase panelinde Table Editor → vt_reports (ya da
--   select * from public.vt_reports order by created_at desc;)
-- İstemci yalnızca `submit_report` RPC'siyle YAZABİLİR; okuma/silme kapalıdır.

-- 1) Tablo
create table if not exists public.vt_reports (
  id         uuid primary key default gen_random_uuid(),
  player_id  text,                    -- cihaz kimliği (vt:player_id) — kimin bildirdiği
  context    text not null,           -- "Ayarlar" / "Çöküş" — hangi ekrandan
  message    text not null default '',-- kullanıcının yazdığı açıklama
  diagnostic text not null default '',-- otomatik tanı (sürüm/tarayıcı/ekran/hata)
  created_at timestamptz not null default now()
);

create index if not exists vt_reports_created_at on public.vt_reports (created_at desc);

-- 2) Satır güvenliği (RLS) aç — doğrudan erişim politikası YOK
alter table public.vt_reports enable row level security;

drop policy if exists "vt_reports_insert" on public.vt_reports;
drop policy if exists "vt_reports_read" on public.vt_reports;

-- İstemciden doğrudan SELECT/INSERT/UPDATE/DELETE kapalıdır.
-- Yazma yalnızca aşağıdaki SECURITY DEFINER RPC ile yapılır.

-- 3) Güvenli rapor gönderimi (submit_report)
create or replace function public.submit_report(
  p_player_id  text,
  p_context    text,
  p_message    text,
  p_diagnostic text
)
returns void
language plpgsql
security definer
-- search_path BOŞ: SECURITY DEFINER fonksiyon tablo sahibinin yetkisiyle çalışır;
-- arama yolu boşaltılmazsa sahte tablo/fonksiyon adı çözülebilir. Adlar tam
-- nitelikli (public.…) yazılmıştır. (Gerekçe leaderboard.sql'de ayrıntılı.)
set search_path = ''
as $$
declare
  v_context    text;
  v_message    text;
  v_diagnostic text;
begin
  v_context    := coalesce(trim(p_context), '');
  v_message    := coalesce(p_message, '');
  v_diagnostic := coalesce(p_diagnostic, '');

  -- Tamamen boş rapor (ne mesaj ne tanı) reddedilir
  if trim(v_message) = '' and trim(v_diagnostic) = '' then
    return;
  end if;

  -- Uzunluk kapları (spam/aşırı yük koruması)
  if v_context = '' then v_context := 'bilinmiyor'; end if;
  v_context    := substring(v_context    from 1 for 80);
  v_message    := substring(v_message    from 1 for 2000);
  v_diagnostic := substring(v_diagnostic from 1 for 4000);

  insert into public.vt_reports (player_id, context, message, diagnostic)
  values (nullif(trim(coalesce(p_player_id, '')), ''), v_context, v_message, v_diagnostic);
end;
$$;

-- Fonksiyonu anon ve authenticated kullanıcılara aç
grant execute on function public.submit_report(text, text, text, text) to anon, authenticated;
