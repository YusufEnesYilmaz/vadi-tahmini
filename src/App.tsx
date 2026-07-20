import { useState } from 'react'
import GameScreen from './components/GameScreen'
import Menu from './components/Menu'
import Settings from './components/Settings'
import type { Difficulty, SubMode, TopMode } from './game/types'

type Screen =
  | { name: 'menu' }
  | { name: 'game'; top: TopMode; sub: SubMode; diff: Difficulty }
  | { name: 'settings' }

export default function App() {
  const [screen, setScreen] = useState<Screen>({ name: 'menu' })

  if (screen.name === 'game') {
    return (
      <GameScreen
        key={`${screen.top}:${screen.sub}:${screen.diff}`}
        top={screen.top}
        sub={screen.sub}
        diff={screen.diff}
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
