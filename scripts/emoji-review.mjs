// Emoji ipuçlarını gözden geçirme aracı.
// Çalıştır: node scripts/emoji-review.mjs  →  tools/emoji-review.html üretir, tarayıcıda aç.
// Düzenle → "JSON'u indir" → inen dosyayı src/data/emoji.json üzerine yaz.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const champs = JSON.parse(readFileSync(join(ROOT, 'src/data/champions.json'), 'utf8'))
const emojiFile = JSON.parse(readFileSync(join(ROOT, 'src/data/emoji.json'), 'utf8'))

const rows = champs.champions.map((c) => ({
  id: c.id,
  name: c.name,
  title: c.title,
  emoji: emojiFile.emoji[c.id] ?? [],
}))
const missing = rows.filter((r) => !r.emoji.length)
const version = champs.version

const html = `<!doctype html>
<html lang="tr"><head><meta charset="utf-8">
<title>Emoji gözden geçirme — Vadi Tahmini</title>
<style>
  :root { --bg:#0a0e1a; --card:#111827; --border:#2a3648; --gold:#c8aa6e; --dim:#9ca3af; --warn:#b8912f; }
  body { margin:0; background:var(--bg); color:#e5e7eb; font:15px/1.5 system-ui, sans-serif; padding:16px 16px 120px; }
  h1 { color:var(--gold); margin:0 0 4px; }
  p.sub { color:var(--dim); margin:0 0 16px; }
  .bar { position:fixed; left:0; right:0; bottom:0; background:var(--card); border-top:1px solid var(--border);
         padding:12px 16px; display:flex; gap:12px; align-items:center; flex-wrap:wrap; }
  button { background:var(--gold); color:#0a0e1a; border:0; border-radius:10px; padding:10px 18px; font-weight:700; cursor:pointer; }
  button.ghost { background:transparent; color:var(--gold); border:1px solid var(--gold); }
  input.filter { background:#1a2332; border:1px solid var(--border); color:inherit; border-radius:8px; padding:8px 12px; min-width:200px; }
  .grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(320px,1fr)); gap:10px; }
  .row { display:flex; gap:10px; align-items:center; background:var(--card); border:1px solid var(--border); border-radius:12px; padding:8px; }
  .row.missing { border-color:var(--warn); }
  .row img { width:44px; height:44px; border-radius:8px; flex:none; }
  .meta { flex:1; min-width:0; }
  .meta b { display:block; }
  .meta small { color:var(--dim); display:block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .emo { width:150px; font-size:20px; text-align:center; background:#1a2332; border:1px solid var(--border);
         color:inherit; border-radius:8px; padding:6px; }
  .count { color:var(--dim); font-size:13px; }
</style></head><body>
<h1>Emoji gözden geçirme</h1>
<p class="sub">Sıra önemli: <b>soldan sağa belirginleşir</b> — ilk iki emoji baştan açık, sonrakiler yanlış tahminlerde açılır.
Emojileri boşluksuz arka arkaya yaz. Boş bırakırsan o şampiyon emoji modunda çıkmaz.</p>

<div class="bar">
  <input class="filter" id="f" placeholder="Şampiyon ara...">
  <label><input type="checkbox" id="onlyMissing"> Sadece eksikler</label>
  <span class="count" id="count"></span>
  <button onclick="download()">JSON'u indir</button>
  <button class="ghost" onclick="copyJson()">Panoya kopyala</button>
</div>

<div class="grid" id="grid"></div>

<script>
const DATA = ${JSON.stringify(rows)};
const PATCH = ${JSON.stringify(version)};
const grid = document.getElementById('grid');

function render() {
  const q = document.getElementById('f').value.toLocaleLowerCase('tr');
  const onlyMissing = document.getElementById('onlyMissing').checked;
  grid.innerHTML = '';
  let missing = 0;
  for (const r of DATA) {
    if (!r.emoji.length) missing++;
    if (q && !r.name.toLocaleLowerCase('tr').includes(q)) continue;
    if (onlyMissing && r.emoji.length) continue;
    const div = document.createElement('div');
    div.className = 'row' + (r.emoji.length ? '' : ' missing');
    div.innerHTML =
      '<img src="https://ddragon.leagueoflegends.com/cdn/' + PATCH + '/img/champion/' + r.id + '.png" alt="">' +
      '<span class="meta"><b>' + r.name + '</b><small>' + r.title + '</small></span>';
    const input = document.createElement('input');
    input.className = 'emo';
    input.value = r.emoji.join('');
    input.oninput = () => {
      r.emoji = [...input.value.trim()].length ? splitEmoji(input.value.trim()) : [];
      div.className = 'row' + (r.emoji.length ? '' : ' missing');
    };
    div.appendChild(input);
    grid.appendChild(div);
  }
  document.getElementById('count').textContent = missing + ' eksik / ' + DATA.length;
}

/** Emoji dizisini grafem kümelerine böler (bayrak, ZWJ ve renk tonlarını bozmadan) */
function splitEmoji(s) {
  if (typeof Intl !== 'undefined' && Intl.Segmenter) {
    return [...new Intl.Segmenter('tr', { granularity: 'grapheme' }).segment(s)].map(x => x.segment).filter(x => x.trim());
  }
  return [...s].filter(x => x.trim());
}

function buildJson() {
  const out = {};
  for (const r of DATA) if (r.emoji.length) out[r.id] = r.emoji;
  return JSON.stringify({
    _not: ${JSON.stringify(emojiFile._not)},
    emoji: out
  }, null, 2) + '\\n';
}

function download() {
  const blob = new Blob([buildJson()], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'emoji.json';
  a.click();
}

async function copyJson() {
  await navigator.clipboard.writeText(buildJson());
  alert('JSON panoya kopyalandı — src/data/emoji.json içine yapıştır.');
}

document.getElementById('f').oninput = render;
document.getElementById('onlyMissing').onchange = render;
render();
</script>
</body></html>
`

mkdirSync(join(ROOT, 'tools'), { recursive: true })
const out = join(ROOT, 'tools/emoji-review.html')
writeFileSync(out, html)
console.log(`✓ ${out}`)
console.log(`  ${rows.length - missing.length}/${rows.length} şampiyonun emojisi var`)
if (missing.length) console.log(`  Eksik: ${missing.map((m) => m.name).join(', ')}`)
