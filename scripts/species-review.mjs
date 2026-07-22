// Tür (species) gözden geçirme aracı.
// Çalıştır: node scripts/species-review.mjs  →  tools/species-review.html üretir, tarayıcıda aç.
// Düzenle → "Tabloyu kopyala" → scripts/species.mjs içindeki CHAMPION_SPECIES'in üzerine yapıştır.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { CHAMPION_SPECIES, SPECIES } from './species.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const champs = JSON.parse(readFileSync(join(ROOT, 'src/data/champions.json'), 'utf8'))
const info = JSON.parse(readFileSync(join(ROOT, 'src/data/champion-info.json'), 'utf8'))

const rows = champs.champions.map((c) => ({
  id: c.id,
  name: c.name,
  title: c.title,
  region: c.region,
  species: CHAMPION_SPECIES[c.id] ?? '',
  lore: (info[c.id]?.lore ?? '').slice(0, 320),
}))
const version = champs.version

const html = `<!doctype html>
<html lang="tr"><head><meta charset="utf-8">
<title>Tür gözden geçirme — Vadi Tahmini</title>
<style>
  :root { --bg:#0a0e1a; --card:#111827; --border:#2a3648; --gold:#c8aa6e; --dim:#9ca3af; --warn:#b8912f; }
  body { margin:0; background:var(--bg); color:#e5e7eb; font:15px/1.5 system-ui, sans-serif; padding:16px 16px 140px; }
  h1 { color:var(--gold); margin:0 0 4px; }
  p.sub { color:var(--dim); margin:0 0 16px; max-width:70ch; }
  .bar { position:fixed; left:0; right:0; bottom:0; background:var(--card); border-top:1px solid var(--border);
         padding:12px 16px; display:flex; gap:12px; align-items:center; flex-wrap:wrap; }
  button { background:var(--gold); color:#0a0e1a; border:0; border-radius:10px; padding:10px 18px; font-weight:700; cursor:pointer; }
  input.filter, select.filter { background:#1a2332; border:1px solid var(--border); color:inherit; border-radius:8px; padding:8px 12px; }
  .grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(330px,1fr)); gap:10px; }
  .row { display:flex; gap:10px; align-items:flex-start; background:var(--card); border:1px solid var(--border); border-radius:12px; padding:8px; }
  .lore { color:var(--dim); font-size:12px; line-height:1.45; margin-top:6px; max-height:3.2em; overflow:hidden; cursor:pointer; }
  .lore.acik { max-height:none; }
  .row img { width:44px; height:44px; border-radius:8px; flex:none; }
  .meta { flex:1; min-width:0; }
  .meta b { display:block; }
  .meta small { color:var(--dim); display:block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  select.tur { background:#1a2332; border:1px solid var(--border); color:inherit; border-radius:8px; padding:6px; min-width:120px; }
  .count { color:var(--dim); font-size:13px; }
  .dagilim { color:var(--dim); font-size:13px; margin:0 0 12px; }
</style></head><body>
<h1>Tür gözden geçirme</h1>
<p class="sub">Sınıflandırma tartışmalı olabilir — Cassiopeia insan mı canavar mı, Sion ölümsüz mü dirilmiş
insan mı gibi kararlar burada verilir. Değiştirdiklerin oyunu doğrudan etkiler: Klasik tablodaki "Tür"
sütunu bu veriden gelir. Bitince <b>Tabloyu kopyala</b> deyip <code>scripts/species.mjs</code> içindeki
<code>CHAMPION_SPECIES</code>'in üzerine yapıştır, sonra <code>node scripts/build-data.mjs</code> çalıştır.</p>
<p class="dagilim" id="dagilim"></p>

<div class="bar">
  <input class="filter" id="f" placeholder="Şampiyon ara...">
  <select class="filter" id="turFiltre"><option value="">Tüm türler</option></select>
  <span class="count" id="count"></span>
  <button onclick="kopyala()">Tabloyu kopyala</button>
</div>

<div class="grid" id="grid"></div>

<script>
const DATA = ${JSON.stringify(rows)};
const TURLER = ${JSON.stringify(SPECIES)};
const PATCH = ${JSON.stringify(version)};
const grid = document.getElementById('grid');

const turFiltre = document.getElementById('turFiltre');
for (const t of TURLER) {
  const o = document.createElement('option'); o.value = t; o.textContent = t; turFiltre.appendChild(o);
}

function render() {
  const q = document.getElementById('f').value.toLocaleLowerCase('tr');
  const tf = turFiltre.value;
  grid.innerHTML = '';
  for (const r of DATA) {
    if (q && !r.name.toLocaleLowerCase('tr').includes(q)) continue;
    if (tf && r.species !== tf) continue;
    const div = document.createElement('div');
    div.className = 'row';
    div.innerHTML =
      '<img src="https://ddragon.leagueoflegends.com/cdn/' + PATCH + '/img/champion/' + r.id + '.png" alt="">' +
      '<span class="meta"><b>' + r.name + '</b><small>' + r.title + ' · ' + r.region + '</small>' +
      // Hikâye kararın kanıtı — kısa gösterilir, tıklayınca açılır
      '<span class="lore" onclick="this.classList.toggle(\\'acik\\')">' + r.lore + '…</span></span>';
    const sel = document.createElement('select');
    sel.className = 'tur';
    for (const t of TURLER) {
      const o = document.createElement('option');
      o.value = t; o.textContent = t; o.selected = t === r.species;
      sel.appendChild(o);
    }
    sel.onchange = () => { r.species = sel.value; dagilimGoster(); };
    div.appendChild(sel);
    grid.appendChild(div);
  }
  document.getElementById('count').textContent = grid.children.length + ' / ' + DATA.length + ' gösteriliyor';
  dagilimGoster();
}

function dagilimGoster() {
  const say = {};
  for (const r of DATA) say[r.species] = (say[r.species] ?? 0) + 1;
  document.getElementById('dagilim').textContent =
    TURLER.map(t => t + ': ' + (say[t] ?? 0)).join(' · ');
}

/** species.mjs'e yapıştırılacak biçimde üret — beşerli satırlar, okunur kalsın */
function tabloMetni() {
  const satirlar = [];
  for (let i = 0; i < DATA.length; i += 5) {
    satirlar.push('  ' + DATA.slice(i, i + 5).map(r => r.id + ": '" + r.species + "'").join(', ') + ',');
  }
  return 'export const CHAMPION_SPECIES = {\\n' + satirlar.join('\\n') + '\\n}';
}

async function kopyala() {
  await navigator.clipboard.writeText(tabloMetni());
  alert('Tablo panoya kopyalandı — scripts/species.mjs içindeki CHAMPION_SPECIES\\'in üzerine yapıştır.');
}

document.getElementById('f').oninput = render;
turFiltre.onchange = render;
render();
</script>
</body></html>
`

mkdirSync(join(ROOT, 'tools'), { recursive: true })
const out = join(ROOT, 'tools/species-review.html')
writeFileSync(out, html)
console.log(`✓ ${out}`)
const say = {}
for (const r of rows) say[r.species] = (say[r.species] ?? 0) + 1
console.log('  dağılım:', SPECIES.map((t) => `${t} ${say[t] ?? 0}`).join(' · '))
