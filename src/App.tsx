import { useState } from 'react'
import GameScreen from './components/GameScreen'
import Menu from './components/Menu'
import Settings from './components/Settings'
import type { SubMode, TopMode } from './game/types'

type Screen =
  | { name: 'menu' }
  | { name: 'game'; top: TopMode; sub: SubMode }
  | { name: 'settings' }

export default function App() {
  const [screen, setScreen] = useState<Screen>({ name: 'menu' })

  if (screen.name === 'game') {
    return (
      <GameScreen
        key={`${screen.top}:${screen.sub}`}
        top={screen.top}
        sub={screen.sub}
        onExit={() => setScreen({ name: 'menu' })}
      />
    )
  }
  if (screen.name === 'settings') {
    return <Settings onExit={() => setScreen({ name: 'menu' })} />
  }
  return (
    <Menu
      onPlay={(top, sub) => setScreen({ name: 'game', top, sub })}
      onSettings={() => setScreen({ name: 'settings' })}
    />
  )
}
