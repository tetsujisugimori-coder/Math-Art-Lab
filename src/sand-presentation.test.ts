import { describe, expect, it } from 'vitest';
import { initial } from './sand';
import { modeAllowed, presentation, symbolAllowed } from './sand-presentation';
describe('sand display/highlight teaching contract', () => {
    it('does not mutate particles, rng, progress or phase when resolving presentation', () => {
        const s = initial(); s.mode = 'first'; s.symbol = 'F'; s.t = 1.2;
        const before = structuredClone(s), p = presentation(s);
        expect(p.nodeTarget).toBe('F'); expect(p.mode).toBe('first');
        expect(p.difference).toContain('背景は第一成分 C₁のまま');
        expect(p.nodeLabel).toContain('F=0'); expect(s).toEqual(before);
    });
    it('distinguishes the ordinary C2 zeros from an F/a overlay and its cache identity', () => {
        const s = initial(); s.mode = 'second'; s.nodes = true;
        expect(presentation(s).nodeLabel).toContain('C₂=0');
        const ordinary = presentation(s).cacheShape;
        s.symbol = 'a'; expect(presentation(s).cacheShape).not.toBe(ordinary);
        expect(presentation(s).nodeLabel).toContain('F=0');
        s.symbol = ''; s.nodes = false; expect(presentation(s).nodeTarget).toBeNull();
    });
    it('limits modes and symbols in lessons 1/2 without exposing full-F overlays', () => {
        for (const symbol of ['F', 'a', 'u', 't']) for (const stage of [0, 1]) expect(symbolAllowed(symbol, stage)).toBe(false);
        expect(symbolAllowed('n', 0)).toBe(false); expect(symbolAllowed('n', 1)).toBe(true);
        expect(modeAllowed('first', 0)).toBe(false); expect(modeAllowed('first', 1)).toBe(true);
        for (const stage of [2, 3]) { expect(symbolAllowed('F', stage)).toBe(true); expect(modeAllowed('second', stage)).toBe(true); }
    });
    it('maps swapped component axes and identifies the combined-u ring separately', () => {
        const s = initial(); s.mode = 'second'; s.symbol = 'm'; expect(presentation(s).axes).toEqual(['y']);
        s.symbol = 'n'; expect(presentation(s).axes).toEqual(['x']);
        s.mode = 'factorX'; expect(presentation(s).axes).toEqual([]);
        s.symbol = 'u'; expect(presentation(s).ringLabel).toContain('背景の成分・因子の変位ではありません');
        expect(presentation(s, 0).ring).toBe(false);
    });
});
