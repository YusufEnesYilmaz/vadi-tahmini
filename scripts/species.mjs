/**
 * Şampiyon TÜRÜ — elle yazılan veri.
 *
 * Hiçbir kaynakta yok: ddragon'da, Meraki'de ve CommunityDragon'da tür alanı
 * bulunmuyor (2026-07-21'de üçü de kontrol edildi). Cinsiyet tablosu gibi burada
 * tutuluyor; `build-data.mjs` bunu champions.json'a yazıyor.
 *
 * Sınıflandırma TARTIŞMALI olabilir (Cassiopeia insan mı canavar mı, Sion ölümsüz
 * mü dirilmiş insan mı...). Gözden geçirmek için: node scripts/species-review.mjs
 */

/** Geçerli türler — Klasik tablodaki "Tür" sütununda görünecek değerler */
export const SPECIES = [
  'İnsan', 'Yordle', 'Vastaya', 'Boşluk', 'Darkin', 'İblis', 'Ruh', 'Semavi',
  'Yükselmiş', 'Makine', 'Siborg', 'Canavar', 'Ölümsüz', 'Ejderha', 'Bitki', 'Element', 'Bilinmiyor',
]

/** ddragon id → tür */
export const CHAMPION_SPECIES = {
  Aatrox: 'Darkin', Ahri: 'Vastaya', Akali: 'İnsan', Akshan: 'İnsan', Alistar: 'Canavar',
  Ambessa: 'İnsan', Amumu: 'Yordle', Anivia: 'Semavi', Annie: 'İnsan', Aphelios: 'İnsan',
  Ashe: 'İnsan', AurelionSol: 'Ejderha', Aurora: 'Vastaya', Azir: 'Yükselmiş', Bard: 'Semavi',
  Belveth: 'Boşluk', Blitzcrank: 'Makine', Brand: 'Element', Braum: 'İnsan', Briar: 'Canavar',
  Caitlyn: 'İnsan', Camille: 'Siborg', Cassiopeia: 'Canavar', Chogath: 'Boşluk', Corki: 'Yordle',
  Darius: 'İnsan', Diana: 'Semavi', DrMundo: 'Canavar', Draven: 'İnsan', Ekko: 'İnsan',
  Elise: 'Canavar', Evelynn: 'İblis', Ezreal: 'İnsan', Fiddlesticks: 'İblis', Fiora: 'İnsan',
  Fizz: 'Yordle', Galio: 'Element', Gangplank: 'İnsan', Garen: 'İnsan', Gnar: 'Yordle',
  Gragas: 'İnsan', Graves: 'İnsan', Gwen: 'Ruh', Hecarim: 'Ölümsüz', Heimerdinger: 'Yordle',
  Hwei: 'İnsan', Illaoi: 'İnsan', Irelia: 'İnsan', Ivern: 'Bitki', Janna: 'Ruh',
  JarvanIV: 'İnsan', Jax: 'Bilinmiyor', Jayce: 'İnsan', Jhin: 'İnsan', Jinx: 'İnsan',
  KSante: 'İnsan', Kaisa: 'İnsan', Kalista: 'Ölümsüz', Karma: 'İnsan', Karthus: 'Ölümsüz',
  Kassadin: 'İnsan', Katarina: 'İnsan', Kayle: 'Semavi', Kayn: 'İnsan', Kennen: 'Yordle',
  Khazix: 'Boşluk', Kindred: 'Ruh', Kled: 'Yordle', KogMaw: 'Boşluk', Leblanc: 'İnsan',
  LeeSin: 'İnsan', Leona: 'Semavi', Lillia: 'Ruh', Lissandra: 'İnsan', Locke: 'İnsan',
  Lucian: 'İnsan', Lulu: 'Yordle', Lux: 'İnsan', Malphite: 'Element', Malzahar: 'İnsan',
  Maokai: 'Bitki', MasterYi: 'İnsan', Mel: 'İnsan', Milio: 'İnsan', MissFortune: 'İnsan',
  Mordekaiser: 'Ölümsüz', Morgana: 'Semavi', Naafiri: 'Darkin', Nami: 'Vastaya', Nasus: 'Yükselmiş',
  Nautilus: 'Ölümsüz', Neeko: 'Vastaya', Nidalee: 'İnsan', Nilah: 'İnsan', Nocturne: 'İblis',
  Nunu: 'Canavar', Olaf: 'İnsan', Orianna: 'Makine', Ornn: 'Semavi', Pantheon: 'Semavi',
  Poppy: 'Yordle', Pyke: 'Ölümsüz', Qiyana: 'İnsan', Quinn: 'İnsan', Rakan: 'Vastaya',
  Rammus: 'Canavar', RekSai: 'Boşluk', Rell: 'İnsan', Renata: 'İnsan', Renekton: 'Yükselmiş',
  Rengar: 'Vastaya', Riven: 'İnsan', Rumble: 'Yordle', Ryze: 'İnsan', Samira: 'İnsan',
  Sejuani: 'İnsan', Senna: 'İnsan', Seraphine: 'İnsan', Sett: 'Vastaya', Shaco: 'Canavar',
  Shen: 'İnsan', Shyvana: 'Ejderha', Singed: 'İnsan', Sion: 'Ölümsüz', Sivir: 'İnsan',
  Skarner: 'Canavar', Smolder: 'Ejderha', Sona: 'İnsan', Soraka: 'Semavi', Swain: 'İnsan',
  Sylas: 'İnsan', Syndra: 'İnsan', TahmKench: 'İblis', Taliyah: 'İnsan', Talon: 'İnsan',
  Taric: 'Semavi', Teemo: 'Yordle', Thresh: 'Ölümsüz', Tristana: 'Yordle', Trundle: 'Canavar',
  Tryndamere: 'İnsan', TwistedFate: 'İnsan', Twitch: 'Canavar', Udyr: 'İnsan', Urgot: 'Siborg',
  Varus: 'Darkin', Vayne: 'İnsan', Veigar: 'Yordle', Velkoz: 'Boşluk', Vex: 'Yordle',
  Vi: 'İnsan', Viego: 'Ölümsüz', Viktor: 'Siborg', Vladimir: 'İnsan', Volibear: 'Semavi',
  Warwick: 'Siborg', MonkeyKing: 'Vastaya', Xayah: 'Vastaya', Xerath: 'Yükselmiş', XinZhao: 'İnsan',
  Yasuo: 'İnsan', Yone: 'Ruh', Yorick: 'İnsan', Yunara: 'Ruh', Yuumi: 'Canavar',
  Zaahen: 'Darkin', Zac: 'Element', Zed: 'İnsan', Zeri: 'İnsan', Ziggs: 'Yordle',
  Zilean: 'İnsan', Zoe: 'Semavi', Zyra: 'Bitki',
}

/** Yeni şampiyonda tablo unutulursa oyun durmasın — rapor uyarır */
export const SPECIES_FALLBACK = 'İnsan'
