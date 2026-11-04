import { afterEach, describe, expect, it, vi } from 'vitest';
import { drawSand } from './sand-render';
import { components, initial, type State } from './sand';

/** Independent Canvas-command recorder: no product target selector is used as an oracle. */
class RecordedPath {
    lines: number[][] = [];
    point = [0, 0];
    moveTo(x: number, y: number) { this.point = [x, y]; }
    lineTo(x: number, y: number) { this.lines.push([...this.point, x, y]); this.point = [x, y]; }
}
function commands(s: State, lesson = -1) {
    const paths: RecordedPath[] = [];
    const context = new Proxy({
        stroke(path?: RecordedPath) { if (path) paths.push(path); },
        createImageData: (w: number, h: number) => ({ data: new Uint8ClampedArray(w * h * 4) }),
    } as Record<string, unknown>, { get: (o, k: string) => o[k] ?? (() => {}), set: (o, k: string, v) => { o[k] = v; return true; } });
    vi.stubGlobal('Path2D', RecordedPath);
    vi.stubGlobal('getComputedStyle', () => ({ borderLeftWidth: '0', borderRightWidth: '0' }));
    vi.stubGlobal('devicePixelRatio', 1);
    vi.stubGlobal('document', { createElement: () => ({ getContext: () => context }) });
    const canvas = { width: 800, height: 800, getBoundingClientRect: () => ({ width: 800 }), getContext: () => context } as unknown as HTMLCanvasElement;
    // The optional lesson argument is introduced by the fix; the old renderer simply ignores it.
    (drawSand as (c: HTMLCanvasElement, state: State, stage?: number) => boolean)(canvas, s, lesson);
    return paths.flatMap(p => p.lines);
}
function distance(lines: number[][], x: number, y: number) {
    return Math.min(...lines.map(([ax, ay, bx, by]) => {
        const dx = bx - ax, dy = by - ay;
        const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy || 1)));
        return Math.hypot(x - ax - t * dx, y - ay - t * dy);
    }));
}
afterEach(() => vi.unstubAllGlobals());
describe('sand P2-01: independently known zero sets reach Canvas commands', () => {
    it('reported (1/4,0): C1=0, C2=-sqrt(2)/2, F=+sqrt(2)/2; F highlight must exclude it', () => {
        const s = initial(); s.mode = 'first'; s.symbol = 'F'; s.nodes = false;
        expect(components(s.settings, .25, 0).first).toBeCloseTo(0, 14);
        expect(components(s.settings, .25, 0).second).toBeCloseTo(-Math.SQRT1_2, 14);
        expect(components(s.settings, .25, 0).F).toBeCloseTo(Math.SQRT1_2, 14);
        const lines = commands(s);
        expect(distance(lines, .25, 0)).toBeGreaterThan(.01);
        // (1/8,1/8) is a node of F by antisymmetry, but neither component is zero.
        expect(distance(lines, .125, .125)).toBeLessThan(1e-8);
    });
    for (const mode of ['sand', 'F', 'u', 'first', 'second', 'factorX', 'factorY'] as const)
        for (const symbol of ['F', 'a'])
            it(`${mode}, ${symbol}: overlay is F, independent of background and nodes checkbox`, () => {
                const s = initial(); s.mode = mode; s.symbol = symbol;
                for (const nodes of [false, true]) {
                    s.nodes = nodes; const lines = commands(s);
                    expect(distance(lines, .25, 0)).toBeGreaterThan(.01);
                    expect(distance(lines, 0, .25)).toBeGreaterThan(.01);
                    expect(distance(lines, 0, 1 / 6)).toBeGreaterThan(.01);
                    expect(distance(lines, .125, .125)).toBeLessThan(1e-8);
                }
            });
    for (const [mode, x, y] of [['first', .25, 0], ['second', 0, .25], ['factorX', .25, 0], ['factorY', 0, 1 / 6]] as const)
        it(`${mode}: ordinary auxiliary lines retain their own zero set after clearing F`, () => {
            const s = initial(); s.mode = mode; s.symbol = ''; s.nodes = true;
            expect(distance(commands(s), x, y)).toBeLessThan(2e-5);
            s.nodes = false; expect(commands(s)).toEqual([]);
        });
    it('early lessons ignore forbidden full-F highlight rather than switching the background', () => {
        const s = initial(); s.symbol = 'F'; s.nodes = false; s.mode = 'factorX';
        expect(commands(s, 0)).toEqual([]);
        s.mode = 'first'; expect(commands(s, 1)).toEqual([]);
        s.nodes = true; expect(distance(commands(s, 1), .25, 0)).toBeLessThan(2e-5);
        expect(distance(commands(s, 1), .125, .125)).toBeGreaterThan(.01);
        for (const stage of [2, 3]) expect(distance(commands(s, stage), .125, .125)).toBeLessThan(1e-8);
    });
});
