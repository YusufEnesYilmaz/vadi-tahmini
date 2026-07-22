import { beforeEach } from 'vitest'

/** Node ortamında localStorage yok — bellekte basit bir taklit yeterli */
class MemoryStorage implements Storage {
  private map = new Map<string, string>()
  get length() { return this.map.size }
  clear() { this.map.clear() }
  getItem(k: string) { return this.map.get(k) ?? null }
  key(i: number) { return [...this.map.keys()][i] ?? null }
  removeItem(k: string) { this.map.delete(k) }
  setItem(k: string, v: string) { this.map.set(k, String(v)) }
}

globalThis.localStorage = new MemoryStorage()

// Her test temiz kayıtla başlasın — testler birbirinin serisini/destesini görmesin
beforeEach(() => localStorage.clear())
