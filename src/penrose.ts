// Penrose P3 (Robinson halves). See de Bruijn, Updown generation of Penrose
// patterns (1990), §2, figs. 1–2, 5: https://doi.org/10.1016/0019-3577%2890%2990005-8
export const PHI = (1 + Math.sqrt(5)) / 2
export const MAX_LEVEL = 6

export type Point = Readonly<{ x: number; y: number }>
export type TileKind = 'thin' | 'thick'
export type RobinsonTriangle = Readonly<{ kind: TileKind; a: Point; b: Point; c: Point }>
export type Tile = Readonly<{ kind: TileKind; points: readonly Point[]; id: string }>
export type PenrosePatch = Readonly<{
  level: number
  radius: number
  triangles: readonly RobinsonTriangle[]
  tiles: readonly Tile[]
  boundary: readonly Tile[]
}>

const p = (x: number, y: number): Point => ({ x, y })
const split = (u: Point, v: Point) => p(u.x + (v.x - u.x) / PHI, u.y + (v.y - u.y) / PHI)
const triangle = (kind: TileKind, a: Point, b: Point, c: Point): RobinsonTriangle => ({ kind, a, b, c })

// a is the apex. Keep b and c ordered; interchanging them mirrors the
// substitution. On thin halves P lies on AB, On thick halves Q and R lie
// respectively on BA and BC. All children have 1/φ of the parent edge scale.
export function subdivideRobinson({ kind, a, b, c }: RobinsonTriangle): readonly RobinsonTriangle[] {
  if (kind === 'thin') {
    const P = split(a, b)
    return [triangle('thin', c, P, b), triangle('thick', P, c, a)]
  }
  const Q = split(b, a)
  const R = split(b, c)
  return [triangle('thick', R, c, a), triangle('thick', Q, R, b), triangle('thin', R, Q, a)]
}

const origin = p(0, 0)
const ring = Array.from({ length: 10 }, (_, i) => {
  const angle = (2 * i - 1) * Math.PI / 10 - Math.PI / 2
  return p(Math.cos(angle), Math.sin(angle))
})
// A chiral pair rotated by 72° five times. Pre-deflate once so that even
// displayed level 0 consists of actual rhombs, not ten clipped triangles.
function seed() {
  return ring.flatMap((u, i) => {
    const v = ring[(i + 1) % 10]!
    return subdivideRobinson(i % 2 ? triangle('thin', origin, v, u) : triangle('thin', origin, u, v))
  })
}

// The 1e-9 bin removes arithmetic noise in an independently subdivided
// shared edge. At the finite depth cap actual distinct vertices remain much
// farther apart. Positions used for drawing are not rounded to the bins.
const vertexKey = ({ x, y }: Point) => `${Math.round(x * 1e9)},${Math.round(y * 1e9)}`
const edgeKey = (a: Point, b: Point) => {
  const u = vertexKey(a)
  const v = vertexKey(b)
  return u < v ? `${u}|${v}` : `${v}|${u}`
}
const turn = (a: Point, b: Point, c: Point) =>
  (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x)

type EdgeUse = { useCount: number; arrow: string }
type Half = { tri: RobinsonTriangle; key: string }

function makePatch(level: number, triangles: readonly RobinsonTriangle[]): PenrosePatch {
  const edges = new Map<string, EdgeUse>()
  const bases = new Map<string, Half[]>()
  const addEdge = (from: Point, to: Point, mark: number) => {
    const key = edgeKey(from, to)
    const arrow = `${mark}:${vertexKey(from)}`
    const old = edges.get(key)
    if (old) {
      if (old.arrow !== arrow || old.useCount !== 1) throw new Error('Penrose edge marking mismatch')
      old.useCount++
    } else {
      edges.set(key, { useCount: 1, arrow })
    }
    return key
  }
  for (const tri of triangles) {
    const { kind, a, b, c } = tri
    if (kind === 'thin') addEdge(a, b, 1)
    else addEdge(b, a, 1)
    addEdge(a, c, 2)
    // These marked rhomb diagonals cannot match any ordinary tile edge.
    const key = addEdge(b, c, kind === 'thin' ? 4 : 3)
    const group = bases.get(key)
    if (group) group.push({ tri, key })
    else bases.set(key, [{ tri, key }])
  }

  const tiles: Tile[] = []
  const boundary: Tile[] = []
  for (const [key, [first, second]] of bases) {
    if (!first) throw new Error('Missing Penrose half')
    const { a, b, c, kind } = first.tri
    if (!second) {
      // An unpaired diagonal is only valid on the crop boundary.
      // Each side of the seed decagon has its endpoints in ring order.
      if (!ring.some((u, i) => {
        const v = ring[(i + 1) % 10]!
        return Math.abs(turn(u, v, b)) < 1e-10 && Math.abs(turn(u, v, c)) < 1e-10
      })) throw new Error('Unpaired interior Penrose diagonal')
      boundary.push({ kind, points: turn(a, b, c) > 0 ? [a, b, c] : [a, c, b], id: key })
      continue
    }
    const d = second.tri.a
    if (second.tri.kind !== kind || turn(b, c, a) * turn(b, c, d) >= 0) {
      throw new Error('Penrose diagonal has incompatible triangle halves')
    }
    tiles.push({ kind, points: turn(a, b, d) > 0 ? [a, b, d, c] : [a, c, d, b], id: key })
  }
  return { level, radius: 1, triangles, tiles, boundary }
}

const patches: PenrosePatch[] = []
export function getPenrosePatch(level: number): PenrosePatch {
  if (!Number.isInteger(level) || level < 0 || level > MAX_LEVEL) {
    throw new RangeError(`Penrose level must be an integer from 0 to ${MAX_LEVEL}`)
  }
  for (let i = patches.length; i <= level; i++) {
    const triangles = i === 0 ? seed() : patches[i - 1]!.triangles.flatMap(subdivideRobinson)
    patches.push(makePatch(i, triangles))
  }
  return patches[level]!
}
