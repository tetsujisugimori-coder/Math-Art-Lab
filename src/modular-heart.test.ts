import { describe, expect, it } from 'vitest';
import { buildModularGeometry, openingFrame, rasterSize } from './modular-heart';

describe('modular string art geometry', () => {
  it('uses the directed map i → (2i) mod 280 for the default', () => {
    const { chords } = buildModularGeometry(280, 2);
    expect(chords).toHaveLength(280);
    for (const [i, j] of [[0,0], [1,2], [139,278], [140,0], [180,80], [279,278]]) {
      expect(chords[i]).toEqual({ from: i, to: j });
    }
  });
  it.each([24, 25, 99, 280, 719, 720])('matches independent repeated addition at N=%i', count => {
    for (const k of [2,3,4,5,6]) {
      const { chords, points } = buildModularGeometry(count,k);
      let expected = 0;
      for (let i = 0; i < count; i++) {
        expect(chords[i]).toEqual({ from: i, to: expected });
        expect(expected).toBeGreaterThanOrEqual(0);
        expect(expected).toBeLessThan(count);
        const {x,y} = points[i];
        expect(Number.isFinite(x) && Number.isFinite(y)).toBe(true);
        expect(x*x+y*y).toBeCloseTo(1, 13);
        expected += k;
        if (expected >= count) expected -= count;
      }
      expect(expected).toBe(0);
    }
  });
  it('shares the requested circle orientation at quarter turns', () => {
    const { points } = buildModularGeometry(280,2);
    for (const [i,x,y] of [[0,0,-1],[70,1,0],[140,0,1],[210,-1,0]]) {
      expect(points[i].x).toBeCloseTo(x,13);
      expect(points[i].y).toBeCloseTo(y,13);
    }
  });
  it('preserves opposite-direction duplicate chords and zero-length maps', () => {
    const { chords } = buildModularGeometry(27, 2);
    expect(chords[0]).toEqual({ from: 0, to: 0 });
    expect(chords[9]).toEqual({ from: 9, to: 18 });
    expect(chords[18]).toEqual({ from: 18, to: 9 });
  });
  it('resets the deterministic model without leaking prior input', () => {
    const initial = buildModularGeometry(280, 2);
    buildModularGeometry(720, 6);
    expect(buildModularGeometry(280, 2)).toEqual(initial);
  });
  it('does not accept non-integer, nonfinite or unbounded controls', () => {
    for (const count of [0,23,721,24.1,Infinity,NaN]) expect(() => buildModularGeometry(count,2)).toThrow(RangeError);
    for (const k of [1,7,2.5,NaN,Infinity]) expect(() => buildModularGeometry(280,k)).toThrow(RangeError);
  });
});

describe('presentation timeline, independent of the geometry', () => {
  it.each([
    [0,'dawn',0],[1999,'dawn',0],[2000,'threads',0],[6000,'bloom',50],
    [8000,'bloom',165],[10000,'form',280],[13000,'title',280],[15000,'complete',280],
  ] as const)('opens at %i ms', (time, phase, visible) => expect(openingFrame(time,280)).toMatchObject({phase,visible}));
  it('reveals only a nondecreasing prefix and fades the title in after 13 seconds', () => {
    let previous = 0;
    for (let ms = 0; ms <= 16_000; ms += 37) {
      const frame = openingFrame(ms, 720);
      expect(frame.visible).toBeGreaterThanOrEqual(previous);
      expect(frame.visible).toBeLessThanOrEqual(720);
      previous = frame.visible;
    }
    expect(openingFrame(12999,280).titleOpacity).toBe(0);
    expect(openingFrame(13600,280).titleOpacity).toBe(0.5);
    expect(openingFrame(14200,280).titleOpacity).toBe(1);
  });
  it('keeps a DPR/long-side bounded raster separate from animation state', () => {
    expect(rasterSize(350,380,3)).toEqual({width:700,height:760});
    expect(rasterSize(2500,500,2)).toEqual({width:2000,height:400});
  });
});
