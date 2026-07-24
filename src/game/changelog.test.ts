import { beforeEach, describe, expect, it } from 'vitest'
import { CHANGELOG, hasUnseenChangelog, latestChangelogId, markChangelogSeen } from './changelog'

describe('changelog — veri bütünlüğü', () => {
  it('id benzersiz ve boş değil (görüldü takibi id ile çalışıyor)', () => {
    const ids = CHANGELOG.map((e) => e.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const e of CHANGELOG) {
      expect(e.id.length).toBeGreaterThan(0)
      expect(e.items.length).toBeGreaterThan(0)
      expect(e.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      for (const item of e.items) {
        expect(item.icon.length).toBeGreaterThan(0)
        expect(item.text.length).toBeGreaterThan(0)
      }
    }
  })

  it('en yeni en üstte (tarihler azalan sırada)', () => {
    for (let i = 1; i < CHANGELOG.length; i++) {
      expect(CHANGELOG[i - 1].date >= CHANGELOG[i].date).toBe(true)
    }
  })
})

describe('changelog — görüldü akışı', () => {
  beforeEach(() => localStorage.removeItem('vt:changelog:seen'))

  it('hiç görülmemişse bant yanar; işaretleyince söner', () => {
    expect(hasUnseenChangelog()).toBe(true)
    markChangelogSeen()
    expect(hasUnseenChangelog()).toBe(false)
    expect(localStorage.getItem('vt:changelog:seen')).toBe(latestChangelogId())
  })

  it('ESKİ bir girdi görülmüşken yeni girdi gelirse bant tekrar yanar', () => {
    localStorage.setItem('vt:changelog:seen', 'cok-eski-girdi')
    expect(hasUnseenChangelog()).toBe(true)
  })
})
