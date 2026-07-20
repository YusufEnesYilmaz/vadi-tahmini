import type { Champion } from './types'

export type CellResult = 'correct' | 'partial' | 'wrong'
export type YearHint = 'equal' | 'earlier' | 'later'

export interface ClassicRow {
  champion: Champion
  cells: {
    gender: CellResult
    lanes: CellResult
    resource: CellResult
    rangeType: CellResult
    region: CellResult
    year: CellResult
  }
  yearHint: YearHint // yanlışsa: hedef daha mı eski (earlier) yeni mi (later)
}

/** İki liste kesişimine göre: hepsi aynı → correct, kesişim var → partial */
function compareList(guess: string[], target: string[]): CellResult {
  const g = new Set(guess)
  const t = new Set(target)
  const inter = [...g].filter((x) => t.has(x))
  if (inter.length === g.size && g.size === t.size) return 'correct'
  return inter.length > 0 ? 'partial' : 'wrong'
}

function compareScalar(a: string, b: string): CellResult {
  return a === b ? 'correct' : 'wrong'
}

export function evaluateGuess(guess: Champion, target: Champion, showPartial = true): ClassicRow {
  const yearCell: CellResult = guess.year === target.year ? 'correct' : 'wrong'
  // Aşırı Zor: kısmi eşleşme gizlenir — sarı hücreler "yanlış" gibi görünür
  const hide = (c: CellResult): CellResult => (!showPartial && c === 'partial' ? 'wrong' : c)
  return {
    champion: guess,
    cells: {
      gender: compareScalar(guess.gender, target.gender),
      lanes: hide(compareList(guess.lanes, target.lanes)),
      resource: compareScalar(guess.resource, target.resource),
      rangeType: compareScalar(guess.rangeType, target.rangeType),
      region: compareScalar(guess.region, target.region),
      year: yearCell,
    },
    yearHint:
      guess.year === target.year
        ? 'equal'
        : (target.year ?? 0) < (guess.year ?? 0)
          ? 'earlier'
          : 'later',
  }
}
