import { describe, it, expect } from 'vitest';
import { advance, apply, components, displacement, gradient, initial, nearNode, presets, reflect, restore, scatter, statistics, tick, validate, type Settings } from './sand';
describe('Neumann square: independent identities and known points', () => {
    it('a=0: known cos(pi/3)*cos(pi/4) = sqrt(2)/4', () => { expect(components({ m: 1, n: 2, a: 0 }, 1 / 3, 1 / 8).F).toBeCloseTo(Math.SQRT2 / 4, 14); });
    it('a=1: antisymmetry, diagonal cancellation for all supported pairs', () => {
        for (let m = 1; m <= 8; m++)
            for (let n = 1; n <= 8; n++)
                if (m !== n) {
                    const p = { m, n, a: 1 };
                    for (const [x, y] of [[.17, .39], [.23, .82], [0, 1]]) {
                        expect(components(p, x, y).F).toBeCloseTo(-components(p, y, x).F, 13);
                        expect(components(p, x, x).F).toBe(0);
                    }
                }
    });
    it('orthogonality gives integral F² = (1+a²)/4 (independent midpoint quadrature)', () => {
        for (const p of [{ m: 1, n: 3, a: 0 }, { m: 2, n: 7, a: .55 }, { m: 8, n: 5, a: 2 }]) {
            let integral = 0;
            const N = 160;
            for (let i = 0; i < N; i++)
                for (let j = 0; j < N; j++)
                    integral += components(p, (i + .5) / N, (j + .5) / N).F ** 2 / N ** 2;
            expect(integral).toBeCloseTo((1 + p.a ** 2) / 4, 11);
        }
    });
    it('Neumann normal derivative vanishes on each boundary', () => { const p = { m: 2, n: 7, a: .6 }; for (const z of [0, .13, .7, 1]) {
        expect(gradient(p, 0, z).x).toBeCloseTo(0, 12);
        expect(gradient(p, 1, z).x).toBeCloseTo(0, 12);
        expect(gradient(p, z, 0).y).toBeCloseTo(0, 12);
        expect(gradient(p, z, 1).y).toBeCloseTo(0, 12);
    } });
    it('stationary nodes differ from instantaneous zeros', () => { const p = { m: 1, n: 2, a: 1 }; for (const t of [0, .37, Math.PI / 2, 18])
        expect(displacement(components(p, .2, .2).F, t)).toBe(0); const f = components(p, 0, 1).F; expect(f).toBe(2); expect(displacement(f, Math.PI / 2)).toBeCloseTo(0, 14); expect(nearNode(f, 1)).toBe(false); });
    it('rejects degeneracy, non-finite and invalid values', () => { for (const p of [{ m: 2, n: 2, a: 1 }, { m: 0, n: 1, a: 1 }, { m: 1.5, n: 2, a: 1 }, { m: 9, n: 2, a: 1 }, { m: 1, n: 2, a: NaN }, { m: Infinity, n: 2, a: 1 }, { m: 1, n: 2, a: -1 }, { m: 1, n: 2, a: Infinity }])
        expect(validate(p)).toBe(false); expect(() => scatter(0)).toThrow(); expect(() => scatter(1, 3001)).toThrow(); });
    it('a=1, m=1,n=3: center axes and both diagonals (triple angle identity)', () => { const p = { m: 1, n: 3, a: 1 }; for (const x of [.12, .3, .7]) {
        expect(components(p, .5, x).F).toBeCloseTo(0, 14);
        expect(components(p, x, .5).F).toBeCloseTo(0, 14);
        expect(components(p, x, 1 - x).F).toBeCloseTo(0, 14);
    } });
});
describe('deterministic artificial sand', () => {
    it('fixed seed + settings + step count reproduce bitwise positions and rng', () => { const a = scatter(42, 100), b = scatter(42, 100); for (let i = 0; i < 70; i++) {
        advance(a, presets[2]);
        advance(b, presets[2]);
    } expect(a).toEqual(b); });
    it('bounded reflected candidates stay in square; F² never increases', () => { const a = scatter(73, 100), p = presets[3]; for (let k = 0; k < 40; k++) {
        const old = new Float64Array(a.positions);
        advance(a, p);
        for (let i = 0; i < a.positions.length; i += 2) {
            expect(a.positions[i]).toBeGreaterThanOrEqual(0);
            expect(a.positions[i + 1]).toBeLessThanOrEqual(1);
            expect(components(p, a.positions[i], a.positions[i + 1]).F ** 2).toBeLessThanOrEqual(components(p, old[i], old[i + 1]).F ** 2 + 1e-15);
        }
    } expect(reflect(-.1)).toBeCloseTo(.1); expect(reflect(1.1)).toBeCloseTo(.9); });
    it('non-nodal stationary corner can escape with stochastic candidate', () => { const a = scatter(1, 1); a.positions.set([0, 1]); const p = { m: 1, n: 2, a: 1 }; expect(gradient(p, 0, 1).x).toBeCloseTo(0, 12); for (let i = 0; i < 100; i++)
        advance(a, p); expect(Math.abs(components(p, a.positions[0], a.positions[1]).F)).toBeLessThan(.1); });
    for (const p of presets)
        for (const seed of [1, 42, 12012, 987654321])
            it(`${p.name}, seed ${seed}: aggregate trend over 320 steps`, () => { const a = scatter(seed, 300), before = statistics(a, p); for (let k = 0; k < 320; k++)
                advance(a, p); const after = statistics(a, p); expect(after.mean).toBeLessThan(before.mean * .15); expect(after.fraction).toBeGreaterThan(.85); });
    it('automatic tick and manual steps use same update', () => { const a = initial(), b = structuredClone(a); a.sand = scatter(4, 100); b.sand = scatter(4, 100); for (let i = 0; i < 40; i++) {
        tick(a, true, true);
        advance(b.sand, b.settings);
        tick(b, false, true);
    } expect(a).toEqual(b); });
    it('setting transaction rejects invalid state without mutation', () => { const s = initial(), before = structuredClone(s); expect(apply(s, { m: 1, n: 1, a: 1 }, 1)).toBe(false); expect(s).toEqual(before); expect(apply(s, { m: 1, n: 2, a: .5 }, 42)).toBe(true); expect(s.sand.step).toBe(0); expect(s.t).toBe(0); expect(s.sand.seed).toBe(42); });
    it('restores all state and rng, with safety stop overriding playing flags', () => { const s = initial(); s.sandPlaying = true; s.wavePlaying = true; tick(s, true, true); s.symbol = 'x'; s.mode = 'F'; s.point = { x: .7, y: .9 }; expect(restore(s, false)).toEqual(s); const safe = restore(s, true); expect(safe.sandPlaying || safe.wavePlaying).toBe(false); expect(safe.sand).toEqual(s.sand); expect(safe.point).toEqual(s.point); });
});
