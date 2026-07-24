import type { ReactNode } from 'react'

/**
 * Mini oyun kabuğu — içeriği viewport'ta DİKEY ortalar (üste yapışıp altta boşluk
 * bırakmasın). İçerik viewport'tan uzunsa `margin:auto` flex'te 0'a düşer ve sayfa
 * ÜSTTEN kaydırılır — `justify-center`/`items-center`'ın aksine tepeyi KIRPMAZ.
 * Genişlik/aralık/padding tek kaynak burada.
 */
export default function GameShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-[100dvh] w-full flex-col">
      <div className="m-auto flex w-full max-w-xl flex-col items-center gap-4 px-3 py-6 sm:gap-5">
        {children}
      </div>
    </div>
  )
}
