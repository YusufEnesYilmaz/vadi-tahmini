import { useState } from 'react'
import { emblemUrl, type SummonerTitle } from '../game/rank'

/**
 * Amblem PNG'leri 16:9 BOŞ ÇERÇEVE: taç görselin yalnız %15–25 genişliğini,
 * %17–33 yüksekliğini kaplıyor, gerisi şeffaf (10 lig de ölçüldü, hepsi ortalı).
 * Yani `<img width=44>` demek tacı ~13px çizmek demek — "amblemler çok küçük"
 * şikâyetinin sebebi buydu. Çözüm: kutu `size` kadar, görsel `size * ZOOM`
 * genişliğinde çizilip ortalanıyor ve taşan şeffaf çerçeve kırpılıyor.
 * ZOOM 3.8: en geniş taç (Şampiyon) kutunun ~%95'ini doldurur, taşma olmaz.
 * Dikey merkez %50 değil ~%47.5 (taçlar hafif yukarıda) — translate onu düzeltir.
 */
const ZOOM = 3.8

/**
 * Rank amblemi — gerçek LoL amblemini (CommunityDragon) gösterir; yüklenemezse
 * (offline/404) `onError` ile lige ait emoji'ye düşer. Böylece her zaman görünen
 * menü rozetinde asla kırık görsel olmaz.
 */
export default function RankEmblem({ tier, size = 24 }: { tier: SummonerTitle; size?: number }) {
  const [failed, setFailed] = useState(false)

  if (failed) {
    return <span aria-hidden style={{ fontSize: Math.round(size * 0.85), lineHeight: 1 }}>{tier.icon}</span>
  }
  return (
    <span
      aria-hidden
      style={{
        width: size,
        height: size,
        flexShrink: 0,
        display: 'inline-block',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/*
        `loading="lazy"` YOK (bilerek): görsel mutlak konumlu ve yükleninceye kadar
        yüksekliği 0 olduğu için tarayıcı onu "görünür alanda değil" sayıp isteği
        HİÇ atmıyordu — ağ kaydında sıfır istek, amblemler boş kalıyordu (ölçüldü).
        Yükseklik de açıkça veriliyor (16:9) ki yerleşim yüklemeden önce otursun.
      */}
      <img
        src={emblemUrl(tier.slug)}
        alt=""
        onError={() => setFailed(true)}
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: size * ZOOM,
          height: size * ZOOM * (720 / 1280),
          maxWidth: 'none',
          transform: 'translate(-50%, -47.5%)',
        }}
      />
    </span>
  )
}
