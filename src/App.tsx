import { useState, useEffect } from 'react'
import GameScreen from './components/GameScreen'
import Menu from './components/Menu'
import Settings from './components/Settings'
import WordleGame from './components/WordleGame'
import BingoGame from './components/BingoGame'
import { parseChallenge, type Challenge } from './game/challenge'
import { parseFilterKey, type PoolFilter } from './game/filter'
import type { Difficulty, PlaySub, TopMode } from './game/types'

type Screen =
  | { name: 'menu' }
  | { name: 'game'; top: TopMode; sub: PlaySub; diff: Difficulty; filter: PoolFilter; challenge?: Challenge }
  | { name: 'settings' }
  | { name: 'wordle'; daily: boolean }
  | { name: 'bingo'; daily: boolean }

/** URL'de ?c=... varsa meydan okumayı çöz, adres çubuğunu temizle */
function initialScreen(): Screen {
  const code = new URLSearchParams(location.search).get('c')
  if (code) {
    const ch = parseChallenge(code)
    history.replaceState({ screen: 'game' }, '', location.pathname) // linki paylaşınca tekrar tetiklenmesin
    if (ch) {
      // Havuz filtresi de linkten gelir — iki oyuncu aynı havuzdan oynasın
      return { name: 'game', top: 'timed', sub: ch.sub, diff: ch.diff, filter: parseFilterKey(ch.filter), challenge: ch }
    }
  }
  return { name: 'menu' }
}

export default function App() {
  const [screen, setScreen] = useState<Screen>(initialScreen)

  // Mobil / Tarayıcı Geri Tuşu (popstate) dinleyicisi
  useEffect(() => {
    const handlePopState = () => {
      if (screen.name !== 'menu') {
        setScreen({ name: 'menu' })
      }
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [screen.name])

  const navigateTo = (newScreen: Screen) => {
    if (newScreen.name !== 'menu' && screen.name === 'menu') {
      window.history.pushState({ screen: newScreen.name }, '')
    }
    setScreen(newScreen)
  }

  const navigateMenu = () => {
    if (screen.name !== 'menu') {
      if (window.history.state?.screen) {
        window.history.back()
      } else {
        setScreen({ name: 'menu' })
      }
    }
  }

  if (screen.name === 'game') {
    return (
      <GameScreen
        key={`${screen.top}:${screen.sub}:${screen.diff}${screen.challenge ? ':ch' + screen.challenge.seed : ''}`}
        top={screen.top}
        sub={screen.sub}
        diff={screen.diff}
        filter={screen.filter}
        challenge={screen.challenge}
        // Günlük'te bir modu bitirince menüye dönmeden sıradaki moda geç
        onPlaySub={(sub) => navigateTo({ name: 'game', top: screen.top, sub, diff: screen.diff, filter: screen.filter })}
        onExit={navigateMenu}
      />
    )
  }
  if (screen.name === 'wordle') {
    return <WordleGame daily={screen.daily} onExit={navigateMenu} />
  }
  if (screen.name === 'bingo') {
    return <BingoGame daily={screen.daily} onExit={navigateMenu} />
  }
  if (screen.name === 'settings') {
    return <Settings onExit={navigateMenu} />
  }
  return (
    <Menu
      onPlay={(top, sub, diff, filter) => navigateTo({ name: 'game', top, sub, diff, filter })}
      onSettings={() => navigateTo({ name: 'settings' })}
      onMiniGame={(g, d) => navigateTo(g === 'wordle' ? { name: 'wordle', daily: d } : { name: 'bingo', daily: d })}
    />
  )
}
