import { describe, expect, test } from 'vitest'
import {
  COMPOSITE, createPrimeDataset, createPrimeLayout, createSieveTrace, NEITHER,
  PRIME, PRIME_CONSTELLATION_DURATION_MS, primeConstellationFrame, ulamCoordinate,
} from './prime-constellation'

function isPrimeByTrialDivision(n: number): boolean {
  if (n < 2) return false
  for (let d = 2; d <= n / d; d++) if (n % d === 0) return false
  return true
}

describe('021 prime constellation mathematical dataset', () => {
  test('0 and 1 are neither prime nor composite; 2 alone is an even prime', () => {
    const data = createPrimeDataset(100)
    expect(Array.from(data.kinds.slice(0, 7))).toEqual([NEITHER, NEITHER, PRIME, PRIME, COMPOSITE, PRIME, COMPOSITE])
    expect(data.primes.filter(n => n % 2 === 0)).toEqual([2])
    expect(Array.from(createPrimeDataset(0).kinds)).toEqual([NEITHER])
    expect(Array.from(createPrimeDataset(1).kinds)).toEqual([NEITHER, NEITHER])
  })

  test.each([[100, 25], [1000, 168], [10_000, 1229], [100_000, 9592]])('inclusive count up to %i is %i', (n, count) => {
    expect(createPrimeDataset(n).primes).toHaveLength(count)
  })

  test('agrees with independent trial division at every integer through 100,000', () => {
    const data = createPrimeDataset(100_000)
    const expectedPrimes: number[] = []
    const expectedPairs: [number, number][] = []
    const expectedKinds = new Uint8Array(data.limit + 1)
    for (let n = 2; n <= data.limit; n++) {
      const prime = isPrimeByTrialDivision(n)
      expectedKinds[n] = prime ? PRIME : COMPOSITE
      if (!prime) continue
      expectedPrimes.push(n)
      if (n + 2 <= data.limit && isPrimeByTrialDivision(n + 2)) expectedPairs.push([n, n + 2])
    }
    expect(data.kinds).toEqual(expectedKinds)
    expect(data.primes).toEqual(expectedPrimes)
    expect(data.twinPairs).toEqual(expectedPairs)
    const marked = new Set(expectedPairs.flat())
    expect(data.twins).toEqual(Uint8Array.from({ length: data.limit + 1 }, (_, n) => Number(marked.has(n))))
  })

  test('only complete twin pairs count and 5 belongs to both consecutive pairs', () => {
    expect(createPrimeDataset(4).twinPairs).toEqual([])
    expect(createPrimeDataset(5).twinPairs).toEqual([[3, 5]])
    expect(createPrimeDataset(6).twinPairs).toEqual([[3, 5]])
    expect(createPrimeDataset(7).twinPairs).toEqual([[3, 5], [5, 7]])
    expect(createPrimeDataset(100_000).twinPairs).toHaveLength(1224)
  })

  test('teaching trace identifies the first prime divisor of composite cells', () => {
    const data = createPrimeDataset(100)
    const trace = createSieveTrace(100)
    expect(trace.steps).toEqual([2, 3, 5, 7])
    expect(Array.from(trace.firstFactor.slice(0, 10))).toEqual([0, 0, 0, 0, 2, 0, 2, 0, 2, 3])
    for (let n = 2; n <= 100; n++) {
      if (data.kinds[n] === PRIME) expect(trace.firstFactor[n]).toBe(0)
      else expect(trace.firstFactor[n]).toBe(trace.steps.find(d => n % d === 0 && n !== d))
    }
  })

  test.each([-1, 100_001, 1.5, Infinity, NaN])('rejects invalid bound %s', n => {
    expect(() => createPrimeDataset(n)).toThrow(RangeError)
  })
})

describe('021 prime constellation layouts', () => {
  test('the first ring starts east, turns north and closes south-east', () => {
    expect(Array.from({ length: 10 }, (_, i) => ulamCoordinate(i + 1))).toEqual([
      [0, 0], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1], [2, -1],
    ])
  })

  test('Ulam ring arithmetic agrees with an independent step-by-step walk for all 100,000 cells', () => {
    const map = createPrimeLayout('ulam', 100_000)
    const directions = [[1, 0], [0, 1], [-1, 0], [0, -1]] as const
    const seen = new Set<string>()
    let x = 0
    let y = 0
    let direction = 0
    let remaining = 1
    let segment = 0
    for (let n = 1; n <= 100_000; n++) {
      if (map.x[n] !== x || map.y[n] !== y) throw new Error(`Independent walk disagrees at n=${n}`)
      seen.add(`${x},${y}`)
      const [dx, dy] = directions[direction]
      x += dx
      y += dy
      if (--remaining === 0) {
        direction = (direction + 1) % 4
        remaining = 1 + Math.floor(++segment / 2)
      }
    }
    expect(seen.size).toBe(100_000)
    expect(createPrimeLayout('ulam', 25)).toMatchObject({ minX: -2, maxX: 2, minY: -2, maxY: 2 })
  })

  test('polar uses radians and the radius sqrt(n); a fixed 4-column grid wraps after 4', () => {
    const polar = createPrimeLayout('polar', 100)
    const grid = createPrimeLayout('grid', 10, 4)
    expect(grid.columns).toBe(4)
    expect(Array.from(grid.x.slice(1))).toEqual([0, 1, 2, 3, 0, 1, 2, 3, 0, 1])
    expect(Array.from(grid.y.slice(1))).toEqual([0, 0, 0, 0, -1, -1, -1, -1, -2, -2])
    for (const n of [1, 2, 3, 11, 97, 100]) {
      expect(polar.x[n]).toBeCloseTo(Math.sqrt(n) * Math.cos(n), 12)
      expect(polar.y[n]).toBeCloseTo(Math.sqrt(n) * Math.sin(n), 12)
      expect(Math.hypot(polar.x[n], polar.y[n])).toBeCloseTo(Math.sqrt(n), 12)
    }
  })

  test('all three layouts preserve prime identities and distinct positions through 100,000', () => {
    const { primes, limit } = createPrimeDataset(100_000)
    const expected = new Set(primes)
    for (const layout of ['ulam', 'grid', 'polar'] as const) {
      const map = createPrimeLayout(layout, limit)
      const seenPoints = new Set<string>()
      const actual = new Set<number>()
      for (let n = 1; n <= limit; n++) {
        const x = map.x[n]
        const y = map.y[n]
        if (!(x >= map.minX && x <= map.maxX && y >= map.minY && y <= map.maxY)) throw new Error(`Out of bounds in ${layout}, n=${n}`)
        seenPoints.add(`${x},${y}`)
        if (isPrimeByTrialDivision(n)) actual.add(n)
      }
      expect(actual).toEqual(expected)
      expect(seenPoints.size).toBe(limit)
    }
  })
})

describe('021 prime constellation frame clock', () => {
  test('uses four exact stage boundaries and reaches a complete title at 15 seconds', () => {
    const inspect = (t: number) => primeConstellationFrame(t, 10_000)
    expect([0, 2999, 3000, 6999, 7000, 11999, 12_000, 15_000].map(ms => inspect(ms).stage))
      .toEqual([1, 1, 2, 2, 3, 3, 4, 4])
    expect(inspect(0).visibleLimit).toBe(0)
    expect(inspect(1500).visibleLimit).toBeGreaterThanOrEqual(2)
    expect(inspect(12_000)).toEqual({ visibleLimit: 10_000, zoom: 1, titleOpacity: 0, stage: 4 })
    expect(inspect(13_500).titleOpacity).toBe(0.5)
    expect(inspect(PRIME_CONSTELLATION_DURATION_MS)).toEqual({ visibleLimit: 10_000, zoom: 1, titleOpacity: 1, stage: 4 })
  })

  test('number visibility cannot retreat, even for small or capped bounds', () => {
    for (const limit of [1, 2, 19, 100_000]) {
      let last = 0
      for (let t = 0; t <= 15_000; t += 17) {
        const frame = primeConstellationFrame(t, limit)
        if (frame.visibleLimit < last || frame.visibleLimit > limit) throw new Error(`Invalid visibility at ${t} / ${limit}`)
        last = frame.visibleLimit
      }
    }
  })

  test('artwork time and final visible prime set are independent of playback rate', () => {
    const data = createPrimeDataset(10_000)
    const renderedPrimes = (wallMs: number, rate: number) => {
      const frame = primeConstellationFrame(wallMs * rate, data.limit)
      return data.primes.filter(n => n <= frame.visibleLimit)
    }
    for (const rate of [0.5, 1, 1.5, 2]) {
      expect(renderedPrimes(8000 / rate, rate)).toEqual(renderedPrimes(8000, 1))
      expect(renderedPrimes(PRIME_CONSTELLATION_DURATION_MS / rate, rate)).toEqual(data.primes)
    }
  })
})
