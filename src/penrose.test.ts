import { describe, expect, it, vi } from 'vitest'
import { getPenrosePatch, MAX_LEVEL, PHI, subdivideRobinson, type Point, type RobinsonTriangle } from './penrose'

const EPS = 1e-8
const dist = (u: Point, v: Point) => Math.hypot(u.x - v.x, u.y - v.y)
const cross = (a: Point, b: Point, c: Point) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x)
const key = ({ x, y }: Point) => `${Math.round(x / EPS)},${Math.round(y / EPS)}`
const around = (points: readonly Point[]) => points.map((p, i) => [p, points[(i + 1) % points.length]!] as const)
const area = (points: readonly Point[]) => around(points).reduce((sum, [a, b]) => sum + a.x * b.y - a.y * b.x, 0) / 2
const angle = (a: Point, b: Point, c: Point) =>
  Math.acos(((a.x - b.x) * (c.x - b.x) + (a.y - b.y) * (c.y - b.y)) / (dist(a, b) * dist(c, b))) * 180 / Math.PI
const seedOutline = Array.from({ length: 10 }, (_, i) => {
  const theta = -3 * Math.PI / 5 + i * Math.PI / 5
  return { x: Math.cos(theta), y: Math.sin(theta) }
})
const edgeList = around(seedOutline)

function insideSegment(a: Point, b: Point, p: Point) {
  return Math.abs(cross(a, b, p)) < EPS &&
    (p.x - a.x) * (p.x - b.x) + (p.y - a.y) * (p.y - b.y) <= EPS
}

function box(points: readonly Point[]) {
  const x = points.map(p => p.x)
  const y = points.map(p => p.y)
  return { points, x0: Math.min(...x), x1: Math.max(...x), y0: Math.min(...y), y1: Math.max(...y) }
}

function hasInteriorOverlap(a: readonly Point[], b: readonly Point[]) {
  // Convex separating axis test; touching at an edge or vertex is not overlap.
  for (const polygon of [a, b]) {
    for (const [u, v] of around(polygon)) {
      const nx = (u.y - v.y) / dist(u, v)
      const ny = (v.x - u.x) / dist(u, v)
      const pa = a.map(p => nx * p.x + ny * p.y)
      const pb = b.map(p => nx * p.x + ny * p.y)
      if (Math.min(Math.max(...pa), Math.max(...pb)) - Math.max(Math.min(...pa), Math.min(...pb)) <= EPS) return false
    }
  }
  return true
}

describe('Penrose P3 geometry', () => {
  it('uses the golden split and the correct two- or three-child Robinson rules', () => {
    expect(PHI * PHI - PHI).toBeCloseTo(1, 14)
    for (const [kind, apex, expected] of [
      ['thin', 36, ['thin', 'thick']],
      ['thick', 108, ['thick', 'thick', 'thin']],
    ] as const) {
      const t = apex * Math.PI / 360
      const parent: RobinsonTriangle = {
        kind, a: { x: 0, y: Math.cos(t) }, b: { x: -Math.sin(t), y: 0 }, c: { x: Math.sin(t), y: 0 },
      }
      const children = subdivideRobinson(parent)
      expect(children.map(c => c.kind)).toEqual(expected)
      const childrenPoints = children.map(({ a, b, c }) => [a, b, c])
      expect(childrenPoints.reduce((s, points) => s + Math.abs(area(points)), 0)).toBeCloseTo(Math.abs(area([parent.a, parent.b, parent.c])), 12)
      for (let i = 0; i < children.length; i++) {
        const child = children[i]!
        expect(angle(child.b, child.a, child.c)).toBeCloseTo(child.kind === 'thin' ? 36 : 108, 10)
        expect(dist(child.a, child.b)).toBeCloseTo(1 / PHI, 12)
        expect(dist(child.a, child.c)).toBeCloseTo(1 / PHI, 12)
        for (const p of childrenPoints[i]!) {
          for (const [u, v] of around([parent.a, parent.b, parent.c])) expect(cross(u, v, p)).toBeGreaterThanOrEqual(-EPS)
        }
        for (let j = 0; j < i; j++) expect(hasInteriorOverlap(childrenPoints[j]!, childrenPoints[i]!)).toBe(false)
      }
    }
  })

  it('makes an actual fivefold seed and preserves rotational symmetry at all levels', () => {
    const t = 2 * Math.PI / 5
    const rotate = ({ x, y }: Point) => ({ x: x * Math.cos(t) - y * Math.sin(t), y: x * Math.sin(t) + y * Math.cos(t) })
    const signature = (tile: { kind: string; points: readonly Point[] }, f: (p: Point) => Point) =>
      `${tile.kind}:${tile.points.map(f).map(key).sort().join('|')}`
    for (let level = 0; level <= MAX_LEVEL; level++) {
      const patch = getPenrosePatch(level)
      const tiles = [...patch.tiles, ...patch.boundary]
      expect(tiles.map(t => signature(t, rotate)).sort()).toEqual(tiles.map(t => signature(t, p => p)).sort())
    }
    const first = getPenrosePatch(0)
    expect(first.boundary).toHaveLength(0)
    expect(first.tiles.filter(t => t.kind === 'thick')).toHaveLength(5)
    expect(first.tiles.filter(t => t.kind === 'thin')).toHaveLength(5)
  })

  it('reconstructs equal-edge rhombs with 36° or 72° acute angles at each scale', () => {
    for (let level = 0; level <= MAX_LEVEL; level++) {
      const patch = getPenrosePatch(level)
      const side = PHI ** -(level + 1)
      let maxSideError = 0
      let maxAngleError = 0
      for (const { points, kind } of patch.tiles) {
        expect(points).toHaveLength(4)
        const acute = Math.min(...points.map((p, i) => angle(points[(i + 3) % 4]!, p, points[(i + 1) % 4]!)))
        maxAngleError = Math.max(maxAngleError, Math.abs(acute - (kind === 'thin' ? 36 : 72)))
        for (const [a, b] of around(points)) maxSideError = Math.max(maxSideError, Math.abs(dist(a, b) - side))
      }
      expect(maxSideError).toBeLessThan(EPS)
      expect(maxAngleError).toBeLessThan(EPS)
    }
  })

  it('partitions the decagon: full shared edges, crop-only boundary, and no interior overlap', () => {
    for (let level = 0; level <= MAX_LEVEL; level++) {
      const patch = getPenrosePatch(level)
      const tiles = [...patch.tiles, ...patch.boundary]
      expect(patch.tiles.map(tile => tile.id)).toEqual([...new Set(patch.tiles.map(tile => tile.id))])
      expect(tiles.reduce((sum, tile) => sum + area(tile.points), 0)).toBeCloseTo(5 * Math.sin(Math.PI / 5), 12)
      const edges = new Map<string, { u: Point; v: Point; signs: number[] }>()
      for (const tile of tiles) {
        if (tile.points.some(p => edgeList.some(([a, b]) => cross(a, b, p) < -EPS))) throw new Error('Vertex outside crop')
        for (const [u, v] of around(tile.points)) {
          const a = key(u), b = key(v)
          const label = [a, b].sort().join('/')
          const edge = edges.get(label) ?? { u, v, signs: [] }
          edge.signs.push(a < b ? 1 : -1)
          edges.set(label, edge)
        }
      }
      let perimeter = 0
      for (const { u, v, signs } of edges.values()) {
        if (signs.length === 1) {
          if (!edgeList.some(([a, b]) => insideSegment(a, b, u) && insideSegment(a, b, v))) throw new Error('Open interior edge')
          perimeter += dist(u, v)
        } else if (signs.length !== 2 || signs[0]! + signs[1]! !== 0) throw new Error('Inconsistent edge use')
      }
      expect(perimeter).toBeCloseTo(20 * Math.sin(Math.PI / 10), 11)
      for (const half of patch.boundary) {
        expect(half.points).toHaveLength(3)
        expect(around(half.points).some(([u, v]) =>
          edgeList.some(([a, b]) => insideSegment(a, b, u) && insideSegment(a, b, v)),
        )).toBe(true)
      }
      const sorted = tiles.map(tile => box(tile.points)).sort((a, b) => a.x0 - b.x0)
      for (let i = 0; i < sorted.length; i++) {
        const a = sorted[i]!
        for (let j = i + 1; j < sorted.length && sorted[j]!.x0 < a.x1 - EPS; j++) {
          const b = sorted[j]!
          if (Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0) <= EPS) continue
          if (hasInteriorOverlap(a.points, b.points)) throw new Error('Tile interiors intersect')
        }
      }
    }
  })

  it('checks the overlap oracle against both a valid shared edge and a coincident rhomb', () => {
    const square = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }]
    expect(hasInteriorOverlap(square, square.map(({ x, y }) => ({ x: x + 1, y })))).toBe(false)
    expect(hasInteriorOverlap(square, square)).toBe(true)
  })

  it('has bounded deterministic counts and preserves each half once', async () => {
    const full = [10, 20, 60, 160, 430, 1140, 3010]
    const clipped = [0, 10, 10, 20, 30, 50, 80]
    for (let level = MAX_LEVEL; level >= 0; level--) {
      const patch = getPenrosePatch(level)
      expect(getPenrosePatch(level)).toBe(patch)
      expect(patch.tiles).toHaveLength(full[level]!)
      expect(patch.boundary).toHaveLength(clipped[level]!)
      expect(patch.triangles).toHaveLength(2 * full[level]! + clipped[level]!)
    }
    // Independently generate in a fresh module, not merely compare cache reads.
    vi.resetModules()
    const fresh = await import('./penrose')
    expect(JSON.stringify(fresh.getPenrosePatch(MAX_LEVEL))).toBe(JSON.stringify(getPenrosePatch(MAX_LEVEL)))
    for (const level of [-1, 0.5, NaN, Infinity, MAX_LEVEL + 1]) expect(() => getPenrosePatch(level)).toThrow(RangeError)
  })
})
