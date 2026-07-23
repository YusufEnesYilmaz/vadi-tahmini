import { describe, expect, it } from 'vitest'
import { ITEMS, PARTS, partById } from './data'

describe('eşya havuzu', () => {
  it('aynı adlı eşya YOKTUR', () => {
    // Yaşandı: ddragon'un mod-özel kayıtları (Tam Gaz `32xxxx`, Arena `66xxxx`) havuza
    // sızmıştı → listede "Kefaret" iki kez çıkıyor, oyuncu yanlış satırı seçince DOĞRU
    // adı yazdığı hâlde kaybediyordu (tahmin `id` ile karşılaştırılıyor).
    const seen = new Map<string, string[]>()
    for (const i of ITEMS) seen.set(i.name, [...(seen.get(i.name) ?? []), i.id])
    const dupes = [...seen].filter(([, ids]) => ids.length > 1)
    expect(dupes, `çift ad: ${dupes.map(([n, ids]) => `${n} (${ids.join(', ')})`).join(' · ')}`).toEqual([])
  })

  it('tüm id\'ler kanonik SR biçiminde (4 hane)', () => {
    // Mod-özel sürümleri ayıran TEK güvenilir imza bu: ddragon'da ikisi de
    // `maps["11"]: true` diyor, harita alanı ayırt etmiyor.
    const yabanci = ITEMS.filter((i) => !/^\d{4}$/.test(i.id)).map((i) => `${i.id} ${i.name}`)
    expect(yabanci).toEqual([])
  })

  it('bileşen ipucu gerçekten çiziliyor — her bileşen sözlükte çözülüyor', () => {
    // Yaşandı: bileşenler `itemById` ile aranıyordu ama ucuz ara eşyalar havuzda yok →
    // 143 eşyanın 128'inde "Bileşenler:" satırı BOŞ çıkıyordu.
    const cozulmeyen = ITEMS.flatMap((i) => i.from.filter((f) => !partById(f)).map((f) => `${i.name} → ${f}`))
    expect(cozulmeyen).toEqual([])
  })

  it('havuz ve sözlük makul büyüklükte', () => {
    // Filtre fazla agresifleşirse (ör. id kuralı yanlış yazılırsa) mod boşalır
    expect(ITEMS.length).toBeGreaterThanOrEqual(100)
    expect(Object.keys(PARTS).length).toBeGreaterThanOrEqual(20)
    // NOT: havuz ile sözlüğün KESİŞMESİ normaldir ve beklenir — 1600+ altınlık bir eşya
    // daha büyüğünün bileşeni olabiliyor (Maceracının Pazubendi 1600g → Zhonya'nın
    // Kumsaati; Yeşil Bariyer 1600g → Banshee'nin Duvağı). Bu test önce "kesişmesin"
    // diye yazılmıştı, veri haklı çıktı: sözlüğün işi havuzu sınırlamak değil, HER
    // bileşen id'sinin çizilebilmesini garanti etmek.
  })

  it('her eşyanın ipucu verecek en az bir alanı var', () => {
    // Altın hep açık; ama etiket de bileşen de yoksa merdiven tek basamağa iner
    const bos = ITEMS.filter((i) => !i.tags.length && !i.from.length).map((i) => i.name)
    expect(bos).toEqual([])
  })
})
