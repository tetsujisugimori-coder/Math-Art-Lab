/** Pure mathematical data. The playback and display never determine primality. */
export const PRIME_CONSTELLATION_LIMIT = 100_000
export const PRIME_CONSTELLATION_DURATION_MS = 15_000

export const NEITHER = 0
export const PRIME = 1
export const COMPOSITE = 2

export type PrimeLayout = 'ulam' | 'polar' | 'grid'
export type TwinPair = readonly [number, number]

function requiredInteger(value: number, min: number, max: number): number {
  if (!Number.isSafeInteger(value) || value < min || value > max) {
    throw new RangeError(`Expected an integer from ${min} to ${max}`)
  }
  return value
}

export function createPrimeDataset(limit: number) {
  requiredInteger(limit, 0, PRIME_CONSTELLATION_LIMIT)
  const kinds = new Uint8Array(limit + 1)
  kinds.fill(PRIME, 2)
  for (let p = 2; p * p <= limit; p++) {
    if (kinds[p] !== PRIME) continue
    for (let n = p * p; n <= limit; n += p) kinds[n] = COMPOSITE
  }

  const primes: number[] = []
  const twinPairs: TwinPair[] = []
  const twins = new Uint8Array(limit + 1)
  for (let n = 2; n <= limit; n++) {
    if (kinds[n] !== PRIME) continue
    primes.push(n)
    if (n + 2 <= limit && kinds[n + 2] === PRIME) {
      twinPairs.push([n, n + 2])
      twins[n] = twins[n + 2] = 1
    }
  }
  return { limit, kinds, primes, twinPairs, twins }
}

/** Mathematical y points up. The spiral starts east and turns counterclockwise. */
export function ulamCoordinate(n: number): readonly [number, number] {
  requiredInteger(n, 1, PRIME_CONSTELLATION_LIMIT)
  if (n === 1) return [0, 0]
  const ring = Math.ceil((Math.sqrt(n) - 1) / 2)
  const side = 2 * ring
  const distance = (side + 1) ** 2 - n
  if (distance < side) return [ring - distance, -ring]
  if (distance < 2 * side) return [-ring, distance - 3 * ring]
  if (distance < 3 * side) return [distance - 5 * ring, ring]
  return [ring, 7 * ring - distance]
}

export function createPrimeLayout(layout: PrimeLayout, limit: number, gridColumns = Math.ceil(Math.sqrt(limit))) {
  requiredInteger(limit, 1, PRIME_CONSTELLATION_LIMIT)
  if (layout !== 'ulam' && layout !== 'polar' && layout !== 'grid') throw new RangeError('Unknown prime layout')
  if (layout === 'grid') requiredInteger(gridColumns, 1, PRIME_CONSTELLATION_LIMIT)
  const x = new Float64Array(limit + 1)
  const y = new Float64Array(limit + 1)
  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity
  for (let n = 1; n <= limit; n++) {
    if (layout === 'ulam') {
      ;[x[n], y[n]] = ulamCoordinate(n)
    } else if (layout === 'polar') {
      const radius = Math.sqrt(n)
      x[n] = radius * Math.cos(n)
      y[n] = radius * Math.sin(n)
    } else {
      x[n] = (n - 1) % gridColumns
      y[n] = -Math.floor((n - 1) / gridColumns) || 0
    }
    minX = Math.min(minX, x[n])
    maxX = Math.max(maxX, x[n])
    minY = Math.min(minY, y[n])
    maxY = Math.max(maxY, y[n])
  }
  return { x, y, minX, maxX, minY, maxY, columns: layout === 'grid' ? gridColumns : undefined }
}

/** First marking step for each number; an already crossed-out value is not crossed out again. */
export function createSieveTrace(limit: number) {
  requiredInteger(limit, 2, PRIME_CONSTELLATION_LIMIT)
  const firstFactor = new Uint16Array(limit + 1)
  const steps: number[] = []
  for (let p = 2; p * p <= limit; p++) {
    if (firstFactor[p]) continue
    steps.push(p)
    for (let n = p * p; n <= limit; n += p) if (!firstFactor[n]) firstFactor[n] = p
  }
  return { firstFactor, steps }
}

/** The timeline takes artwork time (after playback-rate conversion), never frame count. */
export function primeConstellationFrame(elapsedMs: number, limit: number) {
  requiredInteger(limit, 1, PRIME_CONSTELLATION_LIMIT)
  if (!Number.isFinite(elapsedMs)) throw new RangeError('Invalid artwork time')
  const ms = Math.max(0, Math.min(PRIME_CONSTELLATION_DURATION_MS, elapsedMs))
  const stage = ms < 3000 ? 1 : ms < 7000 ? 2 : ms < 12_000 ? 3 : 4
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t
  const smooth = (t: number) => t * t * (3 - 2 * t)
  const initial = Math.min(19, limit)
  const reveal = Math.max(initial, Math.ceil(limit * 0.32))
  let visibleLimit: number
  if (stage === 1) visibleLimit = Math.floor(lerp(0, initial, ms / 3000))
  else if (stage === 2) visibleLimit = Math.floor(lerp(initial, reveal, ((ms - 3000) / 4000) ** 1.7))
  else if (stage === 3) visibleLimit = Math.floor(lerp(reveal, limit, (ms - 7000) / 5000))
  else visibleLimit = limit
  const zoom = stage < 3 ? 3 : stage === 3 ? lerp(3, 1, smooth((ms - 7000) / 5000)) : 1
  const titleOpacity = stage === 4 ? smooth((ms - 12_000) / 3000) : 0
  return { visibleLimit, zoom, titleOpacity, stage }
}
