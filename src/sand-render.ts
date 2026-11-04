import { components, displacement, type State } from './sand';
import { displayValue, presentation, shapeValue } from './sand-presentation';
interface Cache {
    raster: HTMLCanvasElement;
    rasterKey: string;
    nodeKey: string;
    nodePath: Path2D;
}
const caches = new WeakMap<HTMLCanvasElement, Cache>();
export function releaseSandCanvas(canvas: HTMLCanvasElement) { const cache = caches.get(canvas); if (cache) {
    cache.raster.width = 0;
    cache.raster.height = 0;
} caches.delete(canvas); canvas.width = canvas.height = 0; }
function getCache(canvas: HTMLCanvasElement) { let c = caches.get(canvas); if (!c) {
    const raster = document.createElement('canvas');
    raster.width = raster.height = 144;
    c = { raster, rasterKey: '', nodeKey: '', nodePath: new Path2D() };
    caches.set(canvas, c);
} return c; }
export const field = (s: State, x: number, y: number) => displayValue(s, s.mode, x, y);
export function drawSand(canvas: HTMLCanvasElement, s: State, lesson = -1): boolean {
    const view = presentation(s, lesson), mode = view.mode;
    // Borders are not drawable content: a CSS width of zero can still have a 2px rect.
    const rect = canvas.getBoundingClientRect(), style = getComputedStyle(canvas);
    const size = rect.width - parseFloat(style.borderLeftWidth) - parseFloat(style.borderRightWidth);
    if (size <= 0)
        return false;
    const ctx = canvas.getContext('2d');
    if (!ctx || ctx.isContextLost?.())
        throw Error('Canvas 2Dの描画領域を利用できません');
    const pixels = Math.max(1, Math.min(1000, Math.round(size * Math.min(devicePixelRatio || 1, 2))));
    if (canvas.width !== pixels || canvas.height !== pixels) {
        canvas.width = pixels;
        canvas.height = pixels;
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.setLineDash([]);
    ctx.fillStyle = '#050b17';
    ctx.fillRect(0, 0, pixels, pixels);
    const pad = .055 * pixels, extent = .89 * pixels, X = (x: number) => pad + x * extent, Y = (y: number) => pad + (1 - y) * extent;
    const cache = getCache(canvas), settingsKey = `${s.settings.m},${s.settings.n},${s.settings.a}`;
    if (mode !== 'sand') {
        const key = `${settingsKey}/${mode}/${mode === 'u' ? s.t : ''}`;
        if (cache.rasterKey !== key) {
            const N = 144, rasterContext = cache.raster.getContext('2d');
            if (!rasterContext)
                throw Error('振動分布の画像を作成できません');
            const data = rasterContext.createImageData(N, N);
            for (let j = 0; j < N; j++)
                for (let i = 0; i < N; i++) {
                    const v = displayValue(s, mode, (i + .5) / N, 1 - (j + .5) / N), a = Math.min(1, Math.abs(v)), k = 4 * (j * N + i);
                    data.data[k] = Math.round(v >= 0 ? 19 + 176 * a : 17 + 26 * a);
                    data.data[k + 1] = Math.round(v >= 0 ? 28 + 101 * a : 28 + 103 * a);
                    data.data[k + 2] = Math.round(v >= 0 ? 42 + 20 * a : 42 + 145 * a);
                    data.data[k + 3] = 255;
                }
            rasterContext.putImageData(data, 0, 0);
            cache.rasterKey = key;
        }
        ctx.imageSmoothingEnabled = true;
        ctx.drawImage(cache.raster, pad, pad, extent, extent);
    }
    if (mode === 'sand') {
        const r = Math.max(.7, pixels / 730);
        for (let group = 0; group < 3; group++) {
            ctx.fillStyle = ['#fae1a1', '#b28745', '#d6b16a'][group];
            ctx.beginPath();
            for (let i = 0; i < s.sand.positions.length; i += 2)
                if ((i % 6 === 0 ? 0 : i % 4 === 0 ? 1 : 2) === group)
                    ctx.rect(X(s.sand.positions[i]) - r / 2, Y(s.sand.positions[i + 1]) - r / 2, r, r);
            ctx.fill();
        }
    }
    if (mode === 'factorX') {
        // A schematic cross-section: color is the static factor, curve is its instantaneous displacement.
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = Math.max(1.5, pixels / 450);
        ctx.beginPath();
        for (let i = 0; i <= 256; i++) {
            const x = i / 256, y = .5 + .3 * Math.cos(s.settings.m * Math.PI * x) * Math.cos(s.t);
            if (i === 0)
                ctx.moveTo(X(x), Y(y));
            else
                ctx.lineTo(X(x), Y(y));
        }
        ctx.stroke();
        ctx.fillStyle = '#ffe39d';
        for (let k = 0; k < s.settings.m; k++) {
            ctx.beginPath();
            ctx.arc(X((2 * k + 1) / (2 * s.settings.m)), Y(.5), Math.max(3, pixels / 180), 0, 2 * Math.PI);
            ctx.fill();
        }
    }
    // Marching triangles avoids the ambiguous saddle case of marching squares.
    if (view.nodeTarget) {
        const key = `${settingsKey}/${view.cacheShape}`;
        if (cache.nodeKey !== key) {
            const path = new Path2D(), segments: number[][][] = [];
            const N = 128, fn = (x: number, y: number) => shapeValue(s.settings, view.nodeTarget!, x, y);
            const triangle = (v: number[][]) => { const hits: number[][] = []; for (let k = 0; k < 3; k++) {
                const a = v[k], b = v[(k + 1) % 3];
                if ((a[2] < 0) !== (b[2] < 0)) {
                    const t = a[2] / (a[2] - b[2]);
                    hits.push([a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])]);
                }
            } if (hits.length === 2)
                segments.push(hits); };
            const rows = [new Float64Array(N + 1), new Float64Array(N + 1)];
            for (let i = 0; i <= N; i++)
                rows[0][i] = fn(i / N, 0);
            for (let j = 0; j < N; j++) {
                for (let i = 0; i <= N; i++)
                    rows[1][i] = fn(i / N, (j + 1) / N);
                for (let i = 0; i < N; i++) {
                    const a = [i / N, j / N, rows[0][i]], b = [(i + 1) / N, j / N, rows[0][i + 1]], c = [(i + 1) / N, (j + 1) / N, rows[1][i + 1]], d = [i / N, (j + 1) / N, rows[1][i]];
                    triangle([a, b, c]);
                    triangle([a, c, d]);
                }
                [rows[0], rows[1]] = [rows[1], rows[0]];
            }
            // Join triangle fragments so the dash pattern continues along curves, not from each tiny fragment.
            const id = (p: number[]) => `${Math.round(p[0] * 1e10)},${Math.round(p[1] * 1e10)}`;
            const graph = new Map<string, {
                point: number[];
                edges: number[];
            }>();
            segments.forEach((segment, i) => segment.forEach(p => { const key = id(p); if (!graph.has(key))
                graph.set(key, { point: p, edges: [] }); graph.get(key)!.edges.push(i); }));
            const used = new Set<number>();
            function trace(start: string, edge: number) { let key = start; path.moveTo(...graph.get(key)!.point as [
                number,
                number
            ]); while (!used.has(edge)) {
                used.add(edge);
                const segment = segments[edge];
                key = id(segment[0]) === key ? id(segment[1]) : id(segment[0]);
                const node = graph.get(key)!;
                path.lineTo(...node.point as [
                    number,
                    number
                ]);
                if (node.edges.length !== 2)
                    break;
                const next = node.edges.find(e => !used.has(e));
                if (next === undefined)
                    break;
                edge = next;
            } }
            for (const [key, node] of graph)
                if (node.edges.length !== 2)
                    for (const edge of node.edges)
                        if (!used.has(edge))
                            trace(key, edge);
            segments.forEach((segment, i) => { if (!used.has(i))
                trace(id(segment[0]), i); });
            cache.nodePath = path;
            cache.nodeKey = key;
        }
        ctx.save();
        ctx.translate(pad, pad + extent);
        ctx.scale(extent, -extent);
        ctx.strokeStyle = '#f4f5ed';
        ctx.lineWidth = Math.max(1, pixels / 700) / extent;
        ctx.setLineDash([4 * pixels / 600 / extent, 4 * pixels / 600 / extent]);
        try { ctx.stroke(cache.nodePath); } finally { ctx.restore(); }
    }
    ctx.strokeStyle = '#546176';
    ctx.lineWidth = 1;
    ctx.strokeRect(pad, pad, extent, extent);
    const px = X(s.point.x), py = Y(s.point.y);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(px - 7, py);
    ctx.lineTo(px + 7, py);
    ctx.moveTo(px, py - 7);
    ctx.lineTo(px, py + 7);
    ctx.stroke();
    if (view.symbol) {
        ctx.strokeStyle = '#ffe39d';
        ctx.lineWidth = 2;
        if (view.axes.includes('x')) {
            ctx.beginPath();
            ctx.moveTo(pad, py);
            ctx.lineTo(pad + extent, py);
            ctx.stroke();
        }
        if (view.axes.includes('y')) {
            ctx.setLineDash([6, 3]);
            ctx.beginPath();
            ctx.moveTo(px, pad);
            ctx.lineTo(px, pad + extent);
            ctx.stroke();
            ctx.setLineDash([]);
        }
        if (view.ring) {
            const u = displacement(components(s.settings, s.point.x, s.point.y).F, s.t) / (1 + s.settings.a);
            ctx.beginPath();
            ctx.arc(px, py, 10 + 18 * Math.abs(u), 0, 2 * Math.PI);
            ctx.stroke();
        }
        if (view.symbol === 'a') {
            ctx.strokeRect(pad + 3, pad + 3, extent - 6, extent - 6);
        }
    }
    ctx.fillStyle = '#e8d9b5';
    ctx.font = `${Math.max(11, pixels / 48)}px system-ui`;
    ctx.fillText('0', pad * .45, pixels - pad * .45);
    ctx.fillText('x → 1', pixels - pad * 2.5, pixels - pad * .3);
    ctx.fillText('y ↑ 1', pad * .3, pad * .65);
    return true;
}
