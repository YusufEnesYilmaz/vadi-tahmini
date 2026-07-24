import { useState, useEffect } from 'react'
import GameScreen from './components/GameScreen'
import Menu from './components/Menu'
import Settings from './components/Settings'
import WordleGame from './components/WordleGame'
import BingoGame from './components/BingoGame'
import TimelineGame from './components/TimelineGame'
import HuntGame from './components/HuntGame'
import GridGame from './components/GridGame'
import ConnectionsGame from './components/ConnectionsGame'
import CounterGame from './components/CounterGame'
import CounterMulti from './components/CounterMulti'
import type { PoolFilter } from './game/filter'
import type { Difficulty, PlaySub, TopMode } from './game/types'

type Screen =
  | { name: 'menu' }
  | { name: 'game'; top: TopMode; sub: PlaySub; diff: Difficulty; filter: PoolFilter }
  | { name: 'settings' }
  | { name: 'wordle'; daily: boolean }
  | { name: 'bingo'; daily: boolean }
  | { name: 'timeline'; daily: boolean }
  | { name: 'hunt'; daily: boolean }
  | { name: 'grid'; daily: boolean }
  | { name: 'connections'; daily: boolean }
  | { name: 'counter' }
  | { name: 'counterMulti' }

/**
 * Eski link tabanlı meydan okuma (?c=...) KALDIRILDI (Faz 1b, 2026-07-24) —
 * yerini Kaç Tane? multiplayer aldı. Hâlâ dolaşan eski linkler patlamasın:
 * parametre sessizce temizlenir, oyuncu menüye düşer.
 */
function initialScreen(): Screen {
  if (new URLSearchParams(location.search).get('c')) {
    history.replaceState(null, '', location.pathname)
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
        key={`${screen.top}:${screen.sub}:${screen.diff}`}
        top={screen.top}
        sub={screen.sub}
        diff={screen.diff}
        filter={screen.filter}
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
  if (screen.name === 'timeline') {
    return <TimelineGame daily={screen.daily} onExit={navigateMenu} />
  }
  if (screen.name === 'hunt') {
    return <HuntGame daily={screen.daily} onExit={navigateMenu} />
  }
  if (screen.name === 'grid') {
    return <GridGame daily={screen.daily} onExit={navigateMenu} />
  }
  if (screen.name === 'connections') {
    return <ConnectionsGame daily={screen.daily} onExit={navigateMenu} />
  }
  if (screen.name === 'counter') {
    return <CounterGame onExit={navigateMenu} />
  }
  if (screen.name === 'counterMulti') {
    return <CounterMulti onExit={navigateMenu} />
  }
  if (screen.name === 'settings') {
    return <Settings onExit={navigateMenu} />
  }
  return (
    <Menu
      onPlay={(top, sub, diff, filter) => navigateTo({ name: 'game', top, sub, diff, filter })}
      onSettings={() => navigateTo({ name: 'settings' })}
      onMiniGame={(g, d) => {
        if (g === 'wordle') navigateTo({ name: 'wordle', daily: d })
        else if (g === 'bingo') navigateTo({ name: 'bingo', daily: d })
        else if (g === 'timeline') navigateTo({ name: 'timeline', daily: d })
        else if (g === 'hunt') navigateTo({ name: 'hunt', daily: d })
        else if (g === 'grid') navigateTo({ name: 'grid', daily: d })
        else if (g === 'connections') navigateTo({ name: 'connections', daily: d })
      }}
      onCounter={() => navigateTo({ name: 'counter' })}
      onCounterMulti={() => navigateTo({ name: 'counterMulti' })}
    />
  )
}
