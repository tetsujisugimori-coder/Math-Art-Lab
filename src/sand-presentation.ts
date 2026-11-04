import { components, displacement, type Mode, type Settings, type State } from './sand';

export type Shape = 'F' | 'first' | 'second' | 'factorX' | 'factorY';
export const modeNames: Record<Mode, string> = {
    sand: '砂（集積先はFの節）', F: '振動の形 F', u: '瞬間の変位 u',
    first: '第一成分 C₁', second: '第二成分 C₂', factorX: '横の因子 cos(mπx)', factorY: '縦の因子 cos(nπy)',
};
export const shapeNames: Record<Shape, string> = {
    F: '重ねた形 F', first: '第一成分 C₁', second: '第二成分 C₂', factorX: '横の因子 cos(mπx)', factorY: '縦の因子 cos(nπy)',
};
export const shapeEquations: Record<Shape, string> = {
    F: 'F=0', first: 'C₁=0', second: 'C₂=0', factorX: 'cos(mπx)=0', factorY: 'cos(nπy)=0',
};
export function shapeValue(p: Settings, shape: Shape, x: number, y: number): number {
    if (shape === 'factorX') return Math.cos(p.m * Math.PI * x);
    if (shape === 'factorY') return Math.cos(p.n * Math.PI * y);
    const c = components(p, x, y);
    return shape === 'first' ? c.first : shape === 'second' ? c.second : c.F;
}
export function modeAllowed(mode: Mode, lesson: number) {
    return lesson === 0 ? mode === 'factorX' : lesson === 1 ? ['factorX', 'factorY', 'first'].includes(mode) : true;
}
export function symbolAllowed(symbol: string, lesson: number) {
    if (lesson === 0) return ['', 'x', 'm', 'π', 'cos'].includes(symbol);
    if (lesson === 1) return ['', 'x', 'y', 'm', 'n', 'π', 'cos'].includes(symbol);
    return true;
}
/** One contract for UI copy, available controls, overlays, renderer and its cache keys. No state mutation. */
export function presentation(s: State, lesson = -1) {
    const mode: Mode = modeAllowed(s.mode, lesson) ? s.mode : lesson === 0 ? 'factorX' : 'first';
    const symbol = symbolAllowed(s.symbol, lesson) ? s.symbol : '';
    const displayShape: Shape = ['sand', 'F', 'u'].includes(mode) ? 'F' : mode as Shape;
    const forceF = symbol === 'F' || symbol === 'a';
    const nodeTarget: Shape | null = forceF ? 'F' : s.nodes ? displayShape : null;
    const nodeLabel = nodeTarget
        ? `白い破線：${shapeNames[nodeTarget]}の節（${shapeEquations[nodeTarget]}）の近似${forceF ? `・記号${symbol}の強調` : '・表示対象の補助線'}`
        : `白い破線：非表示。補助線をONにすると${shapeNames[displayShape]}の節（${shapeEquations[displayShape]}）を表示します。`;
    const difference = nodeTarget === 'F' && displayShape !== 'F'
        ? `背景は${shapeNames[displayShape]}のまま、破線は重ねたFの節です。両者の0集合は一般に異なります。` : '';
    let axes: ('x' | 'y')[] = [];
    if (symbol === 'x' || symbol === 'y') axes = [symbol];
    if (symbol === 'm') axes = displayShape === 'factorY' ? [] : displayShape === 'second' ? ['y'] : displayShape === 'F' ? ['x', 'y'] : ['x'];
    if (symbol === 'n') axes = displayShape === 'factorX' ? [] : displayShape === 'second' ? ['x'] : displayShape === 'F' ? ['x', 'y'] : ['y'];
    if (symbol === 'cos' || symbol === 'π') axes = displayShape === 'factorX' ? ['x'] : displayShape === 'factorY' ? ['y'] : ['x', 'y'];
    const ring = symbol === 'u' || symbol === 't';
    const ringLabel = ring ? `観察点の輪：重ねた形Fによるu=F cos(t)の絶対値${displayShape !== 'F' ? '（背景の成分・因子の変位ではありません）' : ''}。` : '';
    const axisLabel = axes.length ? `断面の強調：${axes.map(a => a === 'x' ? '横の実線（x方向）' : '縦の破線（y方向）').join('・')}。` : '';
    return { mode, symbol, displayShape, nodeTarget, nodeLabel, difference, axes, ring, ringLabel, axisLabel,
        displayLabel: modeNames[mode], cacheShape: nodeTarget ?? 'none' };
}
export function displayValue(s: State, mode: Mode, x: number, y: number) {
    if (mode === 'u') return displacement(components(s.settings, x, y).F, s.t) / (1 + s.settings.a);
    return shapeValue(s.settings, ['sand', 'F'].includes(mode) ? 'F' : mode as Shape, x, y) / (['sand', 'F'].includes(mode) ? 1 + s.settings.a : 1);
}
