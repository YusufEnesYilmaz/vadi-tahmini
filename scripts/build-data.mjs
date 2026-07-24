// Veri pipeline: ddragon (tr_TR) + Meraki Analytics → src/data/champions.json
// Çalıştır: node scripts/build-data.mjs
// Yeni patch çıktığında tekrar çalıştırılır; oyun içi "Güncelle" düğmesi de
// aynı birleştirme mantığının runtime versiyonunu kullanır (src/game/dataUpdate.ts).

import { CHAMPION_SPECIES, SPECIES_FALLBACK } from './species.mjs'
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

// ---- Statik tablolar ----------------------------------------------------

// ddragon'da cinsiyet yok; elle bakım gerektiren TEK tablo bu.
// Yeni şampiyon çıkınca buraya bir satır eklenir (script eksikleri raporlar).
// E = Erkek, K = Kadın, D = Diğer/İkisi de değil
const GENDER = {
  Aatrox: 'E', Ahri: 'K', Akali: 'K', Akshan: 'E', Alistar: 'E', Ambessa: 'K',
  Amumu: 'E', Anivia: 'K', Annie: 'K', Aphelios: 'E', Ashe: 'K',
  AurelionSol: 'E', Aurora: 'K', Azir: 'E', Bard: 'D', Belveth: 'K',
  Blitzcrank: 'D', Brand: 'E', Braum: 'E', Briar: 'K', Caitlyn: 'K',
  Camille: 'K', Cassiopeia: 'K', Chogath: 'E', Corki: 'E', Darius: 'E',
  Diana: 'K', Draven: 'E', DrMundo: 'E', Ekko: 'E', Elise: 'K', Evelynn: 'K',
  Ezreal: 'E', Fiddlesticks: 'D', Fiora: 'K', Fizz: 'E', Galio: 'E',
  Gangplank: 'E', Garen: 'E', Gnar: 'E', Gragas: 'E', Graves: 'E', Gwen: 'K',
  Hecarim: 'E', Heimerdinger: 'E', Hwei: 'E', Illaoi: 'K', Irelia: 'K',
  Ivern: 'E', Janna: 'K', JarvanIV: 'E', Jax: 'E', Jayce: 'E', Jhin: 'E',
  Jinx: 'K', Kaisa: 'K', Kalista: 'K', Karma: 'K', Karthus: 'E',
  Kassadin: 'E', Katarina: 'K', Kayle: 'K', Kayn: 'E', Kennen: 'E',
  Khazix: 'E', Kindred: 'D', Kled: 'E', KogMaw: 'E', KSante: 'E',
  Leblanc: 'K', LeeSin: 'E', Leona: 'K', Lillia: 'K', Lissandra: 'K',
  Lucian: 'E', Lulu: 'K', Lux: 'K', Malphite: 'E', Malzahar: 'E', Maokai: 'E',
  MasterYi: 'E', Mel: 'K', Milio: 'E', MissFortune: 'K', MonkeyKing: 'E',
  Mordekaiser: 'E', Morgana: 'K', Naafiri: 'K', Nami: 'K', Nasus: 'E',
  Nautilus: 'E', Neeko: 'K', Nidalee: 'K', Nilah: 'K', Nocturne: 'E',
  Nunu: 'E', Olaf: 'E', Orianna: 'K', Ornn: 'E', Pantheon: 'E', Poppy: 'K',
  Pyke: 'E', Qiyana: 'K', Quinn: 'K', Rakan: 'E', Rammus: 'E', RekSai: 'K',
  Rell: 'K', Renata: 'K', Renekton: 'E', Rengar: 'E', Riven: 'K', Rumble: 'E',
  Ryze: 'E', Samira: 'K', Sejuani: 'K', Senna: 'K', Seraphine: 'K', Sett: 'E',
  Shaco: 'E', Shen: 'E', Shyvana: 'K', Singed: 'E', Sion: 'E', Sivir: 'K',
  Skarner: 'E', Smolder: 'E', Sona: 'K', Soraka: 'K', Swain: 'E', Sylas: 'E',
  Syndra: 'K', TahmKench: 'E', Taliyah: 'K', Talon: 'E', Taric: 'E',
  Teemo: 'E', Thresh: 'E', Tristana: 'K', Trundle: 'E', Tryndamere: 'E',
  TwistedFate: 'E', Twitch: 'E', Udyr: 'E', Urgot: 'E', Varus: 'E',
  Vayne: 'K', Veigar: 'E', Velkoz: 'E', Vex: 'K', Vi: 'K', Viego: 'E',
  Viktor: 'E', Vladimir: 'E', Volibear: 'E', Warwick: 'E', Xayah: 'K',
  Xerath: 'E', XinZhao: 'E', Yasuo: 'E', Yone: 'E', Yorick: 'E', Yunara: 'K',
  Yuumi: 'K', Zaahen: 'E', Zac: 'E', Zed: 'E', Zeri: 'K', Ziggs: 'E',
  Zilean: 'E', Zoe: 'K', Zyra: 'K', Locke: 'E',
}

// Meraki'de henüz olmayan yeni şampiyonlar için elle doldurma.
// Meraki güncellenince bu kayıtlar otomatik yok sayılır (Meraki verisi öncelikli).
const NEW_CHAMP_FALLBACK = {
  Yunara: { faction: 'ionia', releaseDate: '2025-06-25', positions: ['BOTTOM'] },
  Zaahen: { faction: 'runeterra', releaseDate: '2025-11-19', positions: ['TOP', 'JUNGLE'] }, // Darkin → Runeterra
  Locke: { faction: 'demacia', releaseDate: '2026-06-24', positions: ['MIDDLE'] },
}

// Meraki position → TR koridor
const LANE_TR = {
  TOP: 'Üst', JUNGLE: 'Orman', MIDDLE: 'Orta', BOTTOM: 'Alt', SUPPORT: 'Destek',
}
const GENDER_TR = { E: 'Erkek', K: 'Kadın', D: 'Diğer' }

// Meraki faction slug → TR bölge adı
const FACTION_TR = {
  unaffiliated: 'Runeterra',
  runeterra: 'Runeterra',
  'bandle-city': 'Bandle Şehri',
  bilgewater: 'Bilgewater',
  demacia: 'Demacia',
  freljord: 'Freljord',
  ionia: 'Ionia',
  ixtal: 'Ixtal',
  noxus: 'Noxus',
  piltover: 'Piltover',
  'shadow-isles': 'Gölge Adaları',
  shurima: 'Shurima',
  'mount-targon': 'Targon',
  targon: 'Targon',
  void: 'Boşluk',
  'the-void': 'Boşluk',
  zaun: 'Zaun',
  icathia: 'Icathia',
  camavor: 'Camavor',
}

// ddragon tag → TR rol
const ROLE_TR = {
  Fighter: 'Savaşçı', Tank: 'Tank', Mage: 'Büyücü',
  Assassin: 'Suikastçı', Marksman: 'Nişancı', Support: 'Destek',
}

// ---- Yardımcılar --------------------------------------------------------

async function getJson(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${res.status} ${url}`)
  return res.json()
}

// ---- Ana akış -----------------------------------------------------------

console.log('ddragon sürümü alınıyor...')
const versions = await getJson('https://ddragon.leagueoflegends.com/api/versions.json')
const version = versions[0]
console.log(`  patch: ${version}`)

console.log('championFull (tr_TR) indiriliyor...')
const full = await getJson(
  `https://ddragon.leagueoflegends.com/cdn/${version}/data/tr_TR/championFull.json`,
)

console.log('Meraki verileri indiriliyor (bölge + çıkış tarihi)...')
// Tek büyük dosya yerine şampiyon başına küçük dosyalar, 10'arlı gruplarla
const ids = Object.keys(full.data)
const meraki = {}
for (let i = 0; i < ids.length; i += 10) {
  const batch = ids.slice(i, i + 10)
  await Promise.all(
    batch.map(async (id) => {
      try {
        const m = await getJson(
          `https://cdn.merakianalytics.com/riot/lol/resources/latest/en-US/champions/${id}.json`,
        )
        meraki[id] = { faction: m.faction, releaseDate: m.releaseDate, attackType: m.attackType, positions: m.positions }
      } catch {
        meraki[id] = null // raporda görünür
      }
    }),
  )
  process.stdout.write(`\r  ${Math.min(i + 10, ids.length)}/${ids.length}`)
}
console.log()

// ---- Birleştirme --------------------------------------------------------

const warn = { gender: [], meraki: [], faction: [], resource: [], species: [] }

const champions = ids.map((id) => {
  const c = full.data[id]
  const m = meraki[id] ?? NEW_CHAMP_FALLBACK[id] ?? null

  if (!m) warn.meraki.push(id)
  if (!GENDER[id]) warn.gender.push(id)
  if (!CHAMPION_SPECIES[id]) warn.species.push(id)
  const factionSlug = m?.faction ?? ''
  if (factionSlug && !FACTION_TR[factionSlug]) warn.faction.push(`${id}:${factionSlug}`)

  let resource = (c.partype || '').trim()
  if (!resource || resource.toLowerCase() === 'yok') resource = 'Kaynaksız'

  return {
    id,                                  // ddragon ID (görsel yolları için) — MonkeyKing vb.
    key: Number(c.key),
    name: c.name,                        // TR görünen ad (Wukong vb.)
    title: c.title,                      // TR unvan
    roles: c.tags.map((t) => ROLE_TR[t] ?? t),
    lanes: (m?.positions ?? []).map((p) => LANE_TR[p] ?? p),
    resource,
    rangeType: (m?.attackType ?? (c.stats.attackrange >= 350 ? 'RANGED' : 'MELEE')) === 'MELEE'
      ? 'Yakın Dövüş' : 'Menzilli',
    region: FACTION_TR[factionSlug] ?? 'Runeterra',
    gender: GENDER_TR[GENDER[id]] ?? 'Bilinmiyor',
    species: CHAMPION_SPECIES[id] ?? SPECIES_FALLBACK,
    year: m?.releaseDate ? Number(m.releaseDate.slice(0, 4)) : null,
    skins: c.skins
      // 'default' = base skin; parantezle biten adlar = kroma (ayrı splash'ı yok, CDN 403 veriyor)
      // trim şart: bazı adların sonunda boşluk var ("... (Kumtaşı) ")
      .filter((s) => s.name !== 'default' && !s.name.trim().endsWith(')'))
      .map((s) => ({ num: s.num, name: s.name.trim() })),
    spells: c.spells.map((s, i) => ({
      slot: ['Q', 'W', 'E', 'R'][i],
      name: s.name,
      img: s.image.full,
    })),
    passive: { name: c.passive.name, img: c.passive.image.full },
  }
})

champions.sort((a, b) => a.name.localeCompare(b.name, 'tr'))

const out = { version, generatedAt: new Date().toISOString().slice(0, 10), champions }
const outPath = join(ROOT, 'src', 'data', 'champions.json')
mkdirSync(dirname(outPath), { recursive: true })
writeFileSync(outPath, JSON.stringify(out, null, 1), 'utf8')

// ---- Şampiyon bilgi kartı (ayrı dosya, tembel yüklenir) ------------------

/** ddragon açıklamaları hafif HTML içerir: <br> satır sonu, kalanı temizlenir */
function stripHtml(s) {
  return (s ?? '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/[ \t]+\n/g, '\n')
    .trim()
}

// Lore + yetenek açıklamaları ANA veriye konmuyor: ~200 KB tutuyor ve oyun
// oynanırken hiç gerekmiyor. Bilgi kartı açıldığında dinamik import ile iner.
const info = {}
for (const id of ids) {
  const c = full.data[id]
  info[id] = {
    lore: stripHtml(c.lore),
    passive: { name: c.passive.name, desc: stripHtml(c.passive.description) },
    spells: c.spells.map((s, i) => ({
      slot: ['Q', 'W', 'E', 'R'][i],
      name: s.name,
      desc: stripHtml(s.description),
    })),
  }
}
const infoPath = join(ROOT, 'src', 'data', 'champion-info.json')
writeFileSync(infoPath, JSON.stringify(info, null, 1), 'utf8')

// ---- Eşyalar (Eşya modu) ------------------------------------------------

// ddragon etiketleri İngilizce; ipucu olarak gösterileceği için TR'ye çevriliyor.
// Listede olmayan etiket sessizce atlanır (ipucu gürültüsü olmasın).
const ITEM_TAG_TR = {
  Damage: 'Saldırı Gücü', SpellDamage: 'Yetenek Gücü', Armor: 'Zırh',
  SpellBlock: 'Büyü Direnci', Health: 'Can', HealthRegen: 'Can Yenilenmesi',
  Mana: 'Mana', ManaRegen: 'Mana Yenilenmesi', AttackSpeed: 'Saldırı Hızı',
  CriticalStrike: 'Kritik', LifeSteal: 'Can Çalma', SpellVamp: 'Büyü Emme',
  ArmorPenetration: 'Zırh Delme', MagicPenetration: 'Büyü Delme',
  CooldownReduction: 'Bekleme Süresi', AbilityHaste: 'Yetenek Hızı',
  NonbootsMovement: 'Hareket Hızı', Boots: 'Ayakkabı', Tenacity: 'Sağlamlık',
  Slow: 'Yavaşlatma', Active: 'Aktif Kullanım', Aura: 'Aura', OnHit: 'Vuruşta',
}

console.log('\nEşya verisi indiriliyor...')
const itemRaw = await getJson(
  `https://ddragon.leagueoflegends.com/cdn/${version}/data/tr_TR/item.json`,
)

// Havuz: Summoner's Rift'te satılan, 1600+ altınlık, şampiyona özel olmayan
// tam eşyalar. Bileşenler/iksirler/mücevherler tahmin oyununu sulandırırdı.
//
// `/^\d{4}$/` ŞART: ddragon aynı eşyanın mod-özel sürümlerini AYRI kayıt olarak
// veriyor ve hepsi `maps['11']: true` diyor — yani harita alanı bunları ayıramaz.
// Kanonik SR eşyaları 4 haneli id taşıyor; 6 haneli olanlar `32xxxx` = Tam Gaz
// (fiyat/stat farklı, ör. Kefaret 2300 yerine 2800) ve `66xxxx` = Arena'ya özel.
// Bunlar havuza girdiğinde otomatik tamamlamada aynı ad İKİ KEZ çıkıyor ve
// oyuncu yanlış satırı seçince doğru adı yazdığı hâlde kaybediyordu.
const items = Object.entries(itemRaw.data)
  .filter(([id, i]) =>
    /^\d{4}$/.test(id) &&
    i.maps?.['11'] &&
    i.gold?.purchasable &&
    i.gold.total >= 1600 &&
    !i.requiredChampion &&
    i.inStore !== false &&
    !(i.tags ?? []).includes('Consumable') &&
    !(i.tags ?? []).includes('Trinket'),
  )
  .map(([id, i]) => ({
    id,
    name: i.name.trim(),
    gold: i.gold.total,
    img: i.image.full,
    tags: (i.tags ?? []).map((t) => ITEM_TAG_TR[t]).filter(Boolean),
    from: i.from ?? [], // bileşen id'leri — ipucu olarak ikonları gösterilir
  }))
  .sort((a, b) => a.name.localeCompare(b.name, 'tr'))

// Bileşen sözlüğü: ipucu olarak ikonları gösterilen ara eşyalar (Şeytani Kodeks,
// Yasak Totem…). Havuz filtrelerinden BAĞIMSIZ ham veriden alınır — bunlar ucuz
// olduğu için havuzda yoklar; `itemById` ile aranınca bulunamıyor ve bileşen
// ipucu 143 eşyanın 128'inde BOŞ çıkıyordu. Tahmin havuzuna girmez, yalnız çizim için.
const partIds = [...new Set(items.flatMap((i) => i.from))]
const parts = Object.fromEntries(
  partIds
    .filter((id) => itemRaw.data[id])
    .map((id) => [id, { name: itemRaw.data[id].name.trim(), img: itemRaw.data[id].image.full }]),
)
const partsMissing = partIds.filter((id) => !itemRaw.data[id])

// Aynı ad iki kez kalırsa oyuncu doğru adı yazıp kaybedebilir — sessizce geçmesin
const itemDupes = Object.entries(
  items.reduce((acc, i) => ((acc[i.name] = (acc[i.name] ?? 0) + 1), acc), {}),
).filter(([, n]) => n > 1)

const itemsPath = join(ROOT, 'src', 'data', 'items.json')
writeFileSync(itemsPath, JSON.stringify({ version, items, parts }, null, 1), 'utf8')

// ---- Rapor --------------------------------------------------------------

const totalSkins = champions.reduce((n, c) => n + c.skins.length, 0)
const itemsNoTag = items.filter((i) => i.tags.length === 0).map((i) => i.name)
const noYear = champions.filter((c) => c.year === null).map((c) => c.id)
const noLane = champions.filter((c) => !c.lanes.length).map((c) => c.id)
console.log('\n===== RAPOR =====')
console.log(`Şampiyon: ${champions.length}`)
console.log(`Skin (base hariç): ${totalSkins}`)
console.log(`Eşya (SR, 1600+ altın): ${items.length} · bileşen sözlüğü: ${Object.keys(parts).length}`)
console.log(`Çıktı: ${outPath}`)
console.log(`Çıktı: ${itemsPath}`)
console.log(`Çıktı: ${infoPath} (${Math.round(JSON.stringify(info).length / 1024)} KB, tembel yüklenir)`)
if (itemsNoTag.length) console.log(`⚠ Etiketsiz eşya (ipucu zayıf olur): ${itemsNoTag.join(', ')}`)
// Aynı ad iki kez = oyuncu doğru adı yazıp kaybedebilir (bir kez yaşandı, mod-özel
// sürümler havuza sızmıştı). Filtre delinirse burada görülsün.
if (itemDupes.length) console.log(`⚠ AYNI ADLI EŞYA (tahmin bozulur!): ${itemDupes.map(([n, c]) => `${n} ×${c}`).join(', ')}`)
if (partsMissing.length) console.log(`⚠ Bileşen ham veride bulunamadı (ipucu eksik çizilir): ${partsMissing.join(', ')}`)
if (warn.meraki.length) console.log(`⚠ Meraki verisi yok (bölge/yıl eksik): ${warn.meraki.join(', ')}`)
if (warn.gender.length) console.log(`⚠ Cinsiyet tablosunda YOK (script'e ekle): ${warn.gender.join(', ')}`)
if (warn.species.length) console.log(`⚠ Tür tablosunda YOK (scripts/species.mjs'e ekle): ${warn.species.join(', ')}`)
if (warn.faction.length) console.log(`⚠ Bilinmeyen bölge slug'ı (FACTION_TR'ye ekle): ${warn.faction.join(', ')}`)
if (noYear.length) console.log(`⚠ Yıl bilgisi eksik: ${noYear.join(', ')}`)
if (noLane.length) console.log(`⚠ Koridor bilgisi eksik: ${noLane.join(', ')}`)
if (!warn.meraki.length && !warn.gender.length && !warn.species.length && !warn.faction.length && !noYear.length && !noLane.length)
  console.log('✓ Tüm alanlar eksiksiz.')

// Eksik zorunlu sınıflandırma ya da mükerrer eşya tahmini bozabilir; uyarıyla başarılı çıkma.
if (warn.gender.length || warn.species.length || itemDupes.length) process.exitCode = 1
