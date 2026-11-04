/** Ideal Neumann square wave; particle motion is an artificial visualization. */
export interface Settings {
    m: number;
    n: number;
    a: number;
}
export interface Point {
    x: number;
    y: number;
}
export const PARTICLES = 3000, MAX_STEPS = 600, DT = 1 / 30, REFERENCE_STEPS = 320;
export const presets = [
    { name: '交差のひろがり', m: 1, n: 3, a: 1 },
    { name: '丸みの区画', m: 2, n: 3, a: 1 },
    { name: '細かな織り', m: 4, n: 7, a: 1 },
    { name: 'ゆらぐ格子', m: 2, n: 5, a: .55 },
] as const;
export function validate(p: Settings): boolean {
    return Number.isInteger(p.m) && Number.isInteger(p.n) && p.m >= 1 && p.m <= 8 && p.n >= 1 && p.n <= 8 && p.m !== p.n && Number.isFinite(p.a) && p.a >= 0 && p.a <= 2;
}
export function components(p: Settings, x: number, y: number) {
    const first = Math.cos(p.m * Math.PI * x) * Math.cos(p.n * Math.PI * y);
    const second = Math.cos(p.n * Math.PI * x) * Math.cos(p.m * Math.PI * y);
    return { first, second, F: first - p.a * second };
}
export const displacement = (F: number, t: number) => F * Math.cos(t); // A=1, omega=1
export const nearNode = (F: number, a: number) => Math.abs(F) / (1 + a) <= .009; // display tolerance, never an exact-node proof
export function gradient(p: Settings, x: number, y: number): Point {
    const M = p.m * Math.PI, N = p.n * Math.PI;
    return { x: -M * Math.sin(M * x) * Math.cos(N * y) + p.a * N * Math.sin(N * x) * Math.cos(M * y), y: -N * Math.cos(M * x) * Math.sin(N * y) + p.a * M * Math.cos(N * x) * Math.sin(M * y) };
}
export interface Sand {
    positions: Float64Array;
    rng: number;
    seed: number;
    step: number;
}
export function random(s: Sand) { let z = s.rng | 0; z ^= z << 13; z ^= z >>> 17; z ^= z << 5; s.rng = z >>> 0; return s.rng / 4294967296; }
export function scatter(seed = 12012, count = PARTICLES): Sand {
    if (!Number.isSafeInteger(seed) || seed < 1 || seed > 4294967295 || !Number.isInteger(count) || count < 1 || count > PARTICLES)
        throw Error('invalid seed or particle count');
    const s: Sand = { positions: new Float64Array(count * 2), rng: seed, seed, step: 0 };
    for (let i = 0; i < s.positions.length; i++)
        s.positions[i] = random(s);
    return s;
}
export const reflect = (v: number) => { const w = ((v % 2) + 2) % 2; return w > 1 ? 2 - w : w; };
export function advance(s: Sand, p: Settings) {
    if (!validate(p))
        throw Error('invalid settings');
    if (s.step >= MAX_STEPS)
        return;
    for (let i = 0; i < s.positions.length; i += 2) {
        const x = s.positions[i], y = s.positions[i + 1], f = components(p, x, y).F;
        // Consume a fixed two samples per particle, even after it has settled.
        const angle = random(s) * 2 * Math.PI, r = .004 + .024 * random(s);
        if (nearNode(f, p.a))
            continue;
        const g = gradient(p, x, y), g2 = g.x * g.x + g.y * g.y;
        const factor = f / (g2 + 1e-12), length = Math.hypot(factor * g.x, factor * g.y), limit = Math.min(1, .012 / (length || 1));
        let nx = reflect(x - factor * g.x * limit), ny = reflect(y - factor * g.y * limit), best = components(p, nx, ny).F ** 2;
        // Random escape candidate prevents a non-nodal stationary point being absorbing.
        const rx = reflect(x + r * Math.cos(angle)), ry = reflect(y + r * Math.sin(angle)), trial = components(p, rx, ry).F ** 2;
        if (trial < best) {
            nx = rx;
            ny = ry;
            best = trial;
        }
        if (best < f * f) {
            s.positions[i] = nx;
            s.positions[i + 1] = ny;
        }
    }
    s.step++;
}
export function reference(p: Settings, seed = 12012) { const s = scatter(seed); for (let i = 0; i < REFERENCE_STEPS; i++)
    advance(s, p); return s; }
export function statistics(s: Sand, p: Settings) { let mean = 0, near = 0; for (let i = 0; i < s.positions.length; i += 2) {
    const f = components(p, s.positions[i], s.positions[i + 1]).F;
    mean += Math.abs(f) / (1 + p.a);
    if (nearNode(f, p.a))
        near++;
} return { mean: mean / (s.positions.length / 2), fraction: near / (s.positions.length / 2) }; }
export type Mode = 'sand' | 'F' | 'u' | 'first' | 'second' | 'factorX' | 'factorY';
export interface State {
    settings: Settings;
    sand: Sand;
    t: number;
    phaseSteps: number;
    speed: number;
    sandPlaying: boolean;
    wavePlaying: boolean;
    point: Point;
    mode: Mode;
    nodes: boolean;
    symbol: string;
    preset: string;
}
export function initial(): State { return { settings: { m: 2, n: 3, a: 1 }, sand: reference(presets[1]), t: 0, phaseSteps: 0, speed: 1, sandPlaying: false, wavePlaying: false, point: { x: .3, y: .4 }, mode: 'sand', nodes: false, symbol: '', preset: presets[1].name }; }
export function tick(s: State, sand: boolean, wave: boolean) { if (sand) {
    advance(s.sand, s.settings);
    if (s.sand.step >= MAX_STEPS)
        s.sandPlaying = false;
} if (wave) {
    s.t += DT * s.speed;
    s.phaseSteps++;
} }
export function apply(s: State, p: Settings, seed: number, name = 'カスタム') {
    if (!validate(p) || !Number.isSafeInteger(seed) || seed < 1 || seed > 4294967295)
        return false;
    s.settings = { m: p.m, n: p.n, a: p.a };
    s.sand = scatter(seed);
    s.sandPlaying = false;
    s.wavePlaying = false;
    s.t = 0;
    s.phaseSteps = 0;
    s.preset = name;
    return true;
}
export function restore(saved: State, safeStop: boolean): State { const s = structuredClone(saved); if (safeStop) {
    s.sandPlaying = false;
    s.wavePlaying = false;
} return s; }
