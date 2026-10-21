import type { Params } from './fractal';

// A small presentation tree, not a formula parser or a second calculation engine.
type MathTag = 'mi' | 'mn' | 'mo' | 'mrow' | 'msub' | 'msup' | 'mfrac';
export type MathNode = string | { tag: MathTag; children: MathNode[] } | { param: keyof Params } | { fixed: number; symbol: MathNode };
const node = (tag: MathTag, ...children: MathNode[]): MathNode => ({ tag, children });
const id = (s: string) => node('mi', s);
const num = (n: number) => node('mn', String(n));
const op = (s: string) => node('mo', s);
const row = (...n: MathNode[]) => node('mrow', ...n);
const sub = (s: string, n: string | number) => node('msub', id(s), typeof n === 'number' ? num(n) : id(n));
const pow = (a: MathNode, b: MathNode) => node('msup', a, b);
const param = (key: keyof Params): MathNode => ({ param: key });
const eq = (a: MathNode, ...b: MathNode[]) => row(a, op('='), ...b);
const call = (name: string, ...args: MathNode[]) => row(id(name), op('('), ...args, op(')'));

export const parameterFields: {key: keyof Params; symbol: string; label: string; unit: string; min: number; max: number; step: number}[] = [
  {key:'depth',symbol:'D',label:'分岐の深さ',unit:'段',min:2,max:10,step:1},
  {key:'angle',symbol:'α',label:'分岐角',unit:'rad',min:.1,max:1.1,step:.01},
  {key:'shrink',symbol:'r',label:'縮小率',unit:'無次元',min:.5,max:.82,step:.01},
  {key:'amplitude',symbol:'A',label:'振幅',unit:'座標単位',min:0,max:.8,step:.01},
  {key:'wavelength',symbol:'λ',label:'波長',unit:'距離単位',min:1,max:10,step:.1},
  {key:'speed',symbol:'ω',label:'速度（位相の時間係数）',unit:'rad/s',min:0,max:4,step:.1},
];
export interface FormulaDefinition { id: string; name: string; expression: MathNode; explanation: string }
export interface StructureDefinition {
  id: string; name: string; classification: string; description: string;
  parameters: (keyof Params)[]; variables: [string, string][];
  formulas: FormulaDefinition[]; composition: string; source: {path: string; symbols: string};
}
const L = sub('L','n'), theta = sub('θ','n');
export const structures: StructureDefinition[] = [
  {
    id:'binary-fractal', name:'二分岐フラクタル', classification:'有限深さの自己相似な平面分岐木',
    description:'幹から各枝を2本ずつ生成し、長さを縮めます。有限回で打ち切る再帰構造です。',
    parameters:['depth','angle','shrink'],
    variables:[['n','幹を0とする世代。0 ≤ n < D。'],['L₀','初期長1.15（固定）。Lₙは世代nの枝長。'],['θₙ','各枝の方向角。初期方向θ₀ = π/2 rad。'],['x, y, z','変形前の枝端点。根元は(0, −2.4, 0)。']],
    formulas:[
      {id:'length',name:'枝の長さ',expression:eq(L,{fixed:1.15,symbol:sub('L',0)},op('×'),pow(param('shrink'),id('n'))),explanation:'L₀ = 1.15（固定）。再帰で length × shrink を子枝へ渡します。'},
      {id:'heading',name:'子枝の方向',expression:eq(sub('θ','child'),theta,op('±'),param('angle')),explanation:'grow の2回の再帰呼び出しが +α と −α に対応。子枝同士の開きは2αです。'},
      {id:'count',name:'深さと枝数',expression:eq(id('B'),pow(num(2),param('depth')),op('−'),num(1)),explanation:'Dは幹を含む段数。remaining ≤ 0 で停止するので、最大世代はD − 1です。'},
      {id:'endpoint-x',name:'枝端点 x',expression:eq(sub('x','end'),sub('x','start'),op('+'),call('cos',theta),op('×'),L),explanation:'現在の枝の方向と長さから終点を生成します。'},
      {id:'endpoint-y',name:'枝端点 y',expression:eq(sub('y','end'),sub('y','start'),op('+'),call('sin',theta),op('×'),L),explanation:'z = 0 の平面上で生成し、この終点を両方の子枝の始点にします。'},
    ],
    composition:'まず変形前の平面座標と累積距離を生成します。',
    source:{path:'src/fractal.ts',symbols:'generateTree / grow: heading ± p.angle, length * p.shrink, remaining - 1'},
  },
  {
    id:'sinusoidal-deformation',name:'波動変形',classification:'正弦波による幾何学的変形',
    description:'物理的な波動方程式を数値的に解いたものではありません。距離と時刻に応じて枝の端点をずらします。',
    parameters:['amplitude','wavelength','speed'],
    variables:[['d','変形前の根元から枝に沿った累積距離。直線距離ではありません。'],['t','アニメーション内の経過秒。一時停止中は進まず、リセットで0。'],['φ','位相（rad）。'],['E(d)','根元の変位を0にする包絡。係数0.8は固定。'],['x′, y′, z′','変形後の座標。z方向の振幅係数0.5は固定。'],['ω','実装のspeed。空間を進む速度そのものではなく、位相の時間係数。']],
    formulas:[
      {id:'phase',name:'位相',expression:eq(id('φ'),node('mfrac',row(num(2),id('π'),id('d')),param('wavelength')),op('−'),param('speed'),op('×'),id('t')),explanation:'dとtは端点とフレームごとに異なるため、代入式でも記号で残します。'},
      {id:'envelope',name:'根元からの包絡',expression:eq(call('E',id('d')),num(1),op('−'),call('exp',op('−'),num(.8),id('d'))),explanation:'根元 d = 0 では E = 0。距離が増えると1に近づきます。'},
      {id:'deform-x',name:'x方向',expression:eq(id('x′'),id('x'),op('+'),param('amplitude'),op('×'),call('E',id('d')),op('×'),call('sin',id('φ'))),explanation:'x座標に正弦波の変位を加えます。'},
      {id:'deform-y',name:'y方向',expression:eq(id('y′'),id('y')),explanation:'y座標は変更しません。'},
      {id:'deform-z',name:'z方向',expression:eq(id('z′'),id('z'),op('+'),num(.5),op('×'),param('amplitude'),op('×'),call('E',id('d')),op('×'),call('cos',id('φ'))),explanation:'z座標には半分の振幅で余弦波を加え、奥行きを与えます。'},
    ],
    composition:'生成済みの座標を deform へ渡します。毎フレーム、元座標から変形し直します。',
    source:{path:'src/fractal.ts',symbols:'deform: phase, envelope, return {x, y, z}'},
  },
  {
    id:'fractal-wave-composition',name:'構造の合成',classification:'座標生成 → 座標変形 → 線分描画',
    description:'generateTree → sampleTree → deform → Three.js の順で、静的な分岐構造に動きを合成します。',
    parameters:[],variables:[['dₛ, dₑ','各枝の始点・終点の累積距離。根元のdₛは0。'],['ℓ','変形前の線分のユークリッド長。sampleTreeのMath.hypotで計算。']],
    formulas:[{id:'distance',name:'端点の累積距離',expression:eq(sub('d','end'),sub('d','start'),op('+'),id('ℓ')),explanation:'生成時は distance + length を子枝へ渡し、描画時は distance + Math.hypot(終点 − 始点) を終点へ渡します。浮動小数点の丸めを除き、分岐点の距離が一致します。'}],
    composition:'平面の分岐点を共有したまま、同じ累積距離の端点に同じ変形を適用します。端点を直線で結ぶため、枝の途中を曲線として細分化する方式ではありません。',
    source:{path:'src/fractal.ts',symbols:'sampleTree: deform(b.start, b.distance, …), deform(b.end, b.distance + length, …)'},
  },
];

export function mathText(expression: MathNode, params?: Params): string {
  if (typeof expression === 'string') return expression;
  if ('param' in expression) return params ? String(params[expression.param]) : parameterFields.find(p => p.key === expression.param)!.symbol;
  if ('fixed' in expression) return params ? String(expression.fixed) : mathText(expression.symbol);
  const parts = expression.children.map(c => mathText(c, params));
  if (expression.tag === 'msup') return `${parts[0]}^(${parts[1]})`;
  if (expression.tag === 'msub') return `${parts[0]}_${parts[1]}`;
  if (expression.tag === 'mfrac') return `(${parts[0]})/(${parts[1]})`;
  return parts.join('');
}
