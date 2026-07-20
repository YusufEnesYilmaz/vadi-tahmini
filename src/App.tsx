import { useState } from 'react'
import GameScreen from './components/GameScreen'
import Menu from './components/Menu'
import Settings from './components/Settings'
import { parseChallenge, type Challenge } from './game/challenge'
import type { Difficulty, PlaySub, TopMode } from './game/types'

type Screen =
  | { name: 'menu' }
  | { name: 'game'; top: TopMode; sub: PlaySub; diff: Difficulty; challenge?: Challenge }
  | { name: 'settings' }

/** URL'de ?c=... varsa meydan okumayı çöz, adres çubuğunu temizle */
function initialScreen(): Screen {
  const code = new URLSearchParams(location.search).get('c')
  if (code) {
    const ch = parseChallenge(code)
    history.replaceState(null, '', location.pathname) // linki paylaşınca tekrar tetiklenmesin
    if (ch) return { name: 'game', top: 'timed', sub: ch.sub, diff: ch.diff, challenge: ch }
  }
  return { name: 'menu' }
}

export default function App() {
  const [screen, setScreen] = useState<Screen>(initialScreen)

  if (screen.name === 'game') {
    return (
      <GameScreen
        key={`${screen.top}:${screen.sub}:${screen.diff}${screen.challenge ? ':ch' + screen.challenge.seed : ''}`}
        top={screen.top}
        sub={screen.sub}
        diff={screen.diff}
        challenge={screen.challenge}
        onExit={() => setScreen({ name: 'menu' })}
      />
    )
  }
  if (screen.name === 'settings') {
    return <Settings onExit={() => setScreen({ name: 'menu' })} />
  }
  return (
    <Menu
      onPlay={(top, sub, diff) => setScreen({ name: 'game', top, sub, diff })}
      onSettings={() => setScreen({ name: 'settings' })}
    />
  )
}
