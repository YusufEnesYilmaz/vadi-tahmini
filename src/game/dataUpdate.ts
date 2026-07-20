import { byId, cmpVersion, DATA, saveUpdatedData } from './data'
import type { Champion, ChampionData } from './types'

/**
 * Ayarlar > "Veriyi Güncelle": ddragon'da daha yeni patch varsa
 * güncel şampiyon+kostüm verisini çekip cihaza kaydeder.
 *
 * Mevcut şampiyonların bölge/cinsiyet/yıl bilgisi ESKİ veriden taşınır
 * (değişmezler); sadece YENİ şampiyonlar için Meraki'den bölge/yıl çekilir.
 * Not: rol/bölge eşleme tabloları scripts/build-data.mjs ile bilinçli olarak
 * senkron tutulmalı (küçük ve nadiren değişirler).
 */

const ROLE_TR: Record<string, string> = {
  Fighter: 'Savaşçı', Tank: 'Tank', Mage: 'Büyücü',
  Assassin: 'Suikastçı', Marksman: 'Nişancı', Support: 'Destek',
}

const LANE_TR: Record<string, string> = {
  TOP: 'Üst', JUNGLE: 'Orman', MIDDLE: 'Orta', BOTTOM: 'Alt', SUPPORT: 'Destek',
}

const FACTION_TR: Record<string, string> = {
  unaffiliated: 'Runeterra', runeterra: 'Runeterra', 'bandle-city': 'Bandle Şehri',
  bilgewater: 'Bilgewater', demacia: 'Demacia', freljord: 'Freljord', ionia: 'Ionia',
  ixtal: 'Ixtal', noxus: 'Noxus', piltover: 'Piltover', 'shadow-isles': 'Gölge Adaları',
  shurima: 'Shurima', 'mount-targon': 'Targon', targon: 'Targon', void: 'Boşluk',
  'the-void': 'Boşluk', zaun: 'Zaun', icathia: 'Icathia', camavor: 'Camavor',
}

export type UpdateResult =
  | { status: 'uptodate'; version: string }
  | { status: 'updated'; from: string; to: string; newChampions: string[] }
  | { status: 'error'; message: string }

export async function checkAndUpdateData(): Promise<UpdateResult> {
  try {
    const versions: string[] = await (await fetch('https://ddragon.leagueoflegends.com/api/versions.json')).json()
    const latest = versions[0]
    if (cmpVersion(latest, DATA.version) <= 0) {
      return { status: 'uptodate', version: DATA.version }
    }

    const full = await (
      await fetch(`https://ddragon.leagueoflegends.com/cdn/${latest}/data/tr_TR/championFull.json`)
    ).json()

    const ids = Object.keys(full.data)
    const newIds = ids.filter((id) => !byId(id))

    // Yeni şampiyonlar için Meraki'den bölge + çıkış yılı dene
    const merakiNew: Record<string, { faction?: string; releaseDate?: string; attackType?: string; positions?: string[] } | null> = {}
    await Promise.all(
      newIds.map(async (id) => {
        try {
          const m = await (
            await fetch(`https://cdn.merakianalytics.com/riot/lol/resources/latest/en-US/champions/${id}.json`)
          ).json()
          merakiNew[id] = { faction: m.faction, releaseDate: m.releaseDate, attackType: m.attackType, positions: m.positions }
        } catch {
          merakiNew[id] = null
        }
      }),
    )

    const champions: Champion[] = ids.map((id) => {
      const c = full.data[id]
      const old = byId(id)
      const m = merakiNew[id]

      let resource = (c.partype || '').trim()
      if (!resource || resource.toLowerCase() === 'yok') resource = 'Kaynaksız'

      return {
        id,
        key: Number(c.key),
        name: c.name,
        title: c.title,
        roles: c.tags.map((t: string) => ROLE_TR[t] ?? t),
        lanes: old?.lanes ?? (m?.positions ?? []).map((p) => LANE_TR[p] ?? p),
        resource,
        rangeType: old?.rangeType ??
          ((m?.attackType ?? (c.stats.attackrange >= 350 ? 'RANGED' : 'MELEE')) === 'MELEE'
            ? 'Yakın Dövüş' : 'Menzilli'),
        region: old?.region ?? FACTION_TR[m?.faction ?? ''] ?? 'Runeterra',
        gender: old?.gender ?? 'Bilinmiyor',
        year: old?.year ?? (m?.releaseDate ? Number(m.releaseDate.slice(0, 4)) : null),
        skins: c.skins
          .filter((s: { name: string }) => s.name !== 'default' && !s.name.trim().endsWith(')'))
          .map((s: { num: number; name: string }) => ({ num: s.num, name: s.name.trim() })),
        spells: c.spells.map((s: { name: string; image: { full: string } }, i: number) => ({
          slot: (['Q', 'W', 'E', 'R'] as const)[i],
          name: s.name,
          img: s.image.full,
        })),
        passive: { name: c.passive.name, img: c.passive.image.full },
      }
    })

    champions.sort((a, b) => a.name.localeCompare(b.name, 'tr'))

    const data: ChampionData = {
      version: latest,
      generatedAt: new Date().toISOString().slice(0, 10),
      champions,
    }
    saveUpdatedData(data)

    return {
      status: 'updated',
      from: DATA.version,
      to: latest,
      newChampions: newIds.map((id) => full.data[id].name),
    }
  } catch (e) {
    return { status: 'error', message: e instanceof Error ? e.message : 'Bilinmeyen hata' }
  }
}
