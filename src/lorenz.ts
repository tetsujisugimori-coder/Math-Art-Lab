/** Coordinates and parameters are dimensionless. Numerical approximations, not proofs. */
export type Point={x:number;y:number;z:number};
export type LorenzSettings={sigma:number;rho:number;beta:number;x:number;y:number;z:number;delta:number;points:number;compare:boolean};
export const LORENZ_DT=.005;
export const lorenzDefaults:LorenzSettings={sigma:10,rho:28,beta:8/3,x:1,y:1,z:1,delta:.00001,points:12000,compare:false};
export const lorenzPresets=[
 {id:'standard',name:'A · 標準の蝶',description:'標準係数で二つの翼を行き来する軌道を観察します。有限時間の数値近似です。',rho:28,compare:false},
 {id:'comparison',name:'B · 微小差分比較',description:'Bの初期xだけにδを加えます。実線Aと破線Bは同じ式・RK4・刻み幅で計算します。',rho:28,compare:true},
 {id:'parameter',name:'C · パラメータ変化',description:'ρ=14から調整して比較します。係数次第で平衡点に近づくなど、必ず蝶形やカオスになるわけではありません。',rho:14,compare:false},
] as const;
export function validateLorenz(s:LorenzSettings){
 for(const [key,min,max] of [['sigma',1,20],['rho',0,50],['beta',.5,6],['x',-30,30],['y',-30,30],['z',-30,60],['delta',1e-8,.1],['points',1000,24000]] as const){
  if(!Number.isFinite(s[key])||s[key]<min||s[key]>max)throw new RangeError(`${key}は${min}〜${max}の有限値にしてください。`);
 }
 if(!Number.isInteger(s.points)||typeof s.compare!=='boolean')throw new RangeError('点数は整数、比較は真偽値が必要です。');
}
function guard(p:Point){if(![p.x,p.y,p.z].every(v=>Number.isFinite(v)&&Math.abs(v)<=10000))throw new RangeError('数値計算を停止しました：非有限値または座標・変化速度の安全上限10,000を超えました。');return p;}
export function lorenzDerivative(p:Point,s:Pick<LorenzSettings,'sigma'|'rho'|'beta'>):Point{
 guard(p);if(![s.sigma,s.rho,s.beta].every(Number.isFinite))throw new RangeError('係数は有限値が必要です。');
 return guard({x:s.sigma*(p.y-p.x),y:p.x*(s.rho-p.z)-p.y,z:p.x*p.y-s.beta*p.z});
}
/** Classical fixed-step RK4. Substep safety guards run before any buffer is committed. */
export function lorenzRK4(p:Point,s:Pick<LorenzSettings,'sigma'|'rho'|'beta'>,dt=LORENZ_DT):Point{
 if(!Number.isFinite(dt)||dt<=0||dt>.005)throw new RangeError('積分刻みは0より大きく0.005以下です。');
 const add=(v:Point,k:Point,h:number)=>guard({x:v.x+k.x*h,y:v.y+k.y*h,z:v.z+k.z*h});
 const a=lorenzDerivative(p,s),b=lorenzDerivative(add(p,a,dt/2),s),c=lorenzDerivative(add(p,b,dt/2),s),d=lorenzDerivative(add(p,c,dt),s);
 return guard({x:p.x+dt/6*(a.x+2*b.x+2*c.x+d.x),y:p.y+dt/6*(a.y+2*b.y+2*c.y+d.y),z:p.z+dt/6*(a.z+2*b.z+2*c.z+d.z)});
}
export function pointAt(data:Float64Array,index:number):Point{return{x:data[index*3],y:data[index*3+1],z:data[index*3+2]};}
export function sampleLorenz(s:LorenzSettings){
 validateLorenz(s);const a=new Float64Array(s.points*3),b=s.compare?new Float64Array(s.points*3):null;
 let p:Point={x:s.x,y:s.y,z:s.z},q:Point={x:s.x+s.delta,y:s.y,z:s.z};
 for(let i=0;i<s.points;i++){a.set([p.x,p.y,p.z],i*3);b?.set([q.x,q.y,q.z],i*3);if(i<s.points-1){p=lorenzRK4(p,s);if(b)q=lorenzRK4(q,s);}}
 return{a,b};
}
export type LorenzPlayback={elapsed:number;mode:'drawing'|'paused'|'complete'};
export function lorenzIndex(state:LorenzPlayback,points:number){return Math.min(points-1,Math.floor((state.elapsed+1e-10)/LORENZ_DT));}
export function advanceLorenz(state:LorenzPlayback,seconds:number,rate:number,points:number):LorenzPlayback{
 if(!Number.isFinite(seconds)||seconds<0||!Number.isFinite(rate)||rate<.25||rate>8)throw new RangeError('経過時間または再生速度が不正です。');
 if(state.mode!=='drawing')return state;
 const end=(points-1)*LORENZ_DT,elapsed=Math.min(end,state.elapsed+seconds*rate);return{elapsed,mode:elapsed>=end?'complete':'drawing'};
}
export function restartLorenz(state:LorenzPlayback,reduced:boolean):LorenzPlayback{return{elapsed:0,mode:reduced||state.mode==='paused'?'paused':'drawing'};}
export function reshapeLorenz(state:LorenzPlayback,points:number,reduced:boolean):LorenzPlayback{return state.mode==='complete'?{elapsed:(points-1)*LORENZ_DT,mode:'complete'}:restartLorenz(state,reduced);}
export const lorenzLessons=[
 ['3本の式','微分方程式は「今の位置から、どちらへどれだけ速く変わるか」を定めます。dx/dt・dy/dt・dz/dtは位置ではなく変化速度。乱数を使わず、同じ初期値と係数で進む決定論的な規則です。'],
 ['軌跡の生成','点Aが現在位置、矢印vが式から求めた変化方向です。1ステップはΔt=0.005。RK4は途中の傾きも調べて次の位置を近似します。矢印の長さは表示用に正規化しており、速度の大きさは下の数値で確認します。'],
 ['カオスの観察','実線Aと破線Bは初期xだけがδだけ違います。同じ係数・RK4・Δtで比較し、同時刻の3次元距離dを表示します。距離は離れたり近づいたりし、一定割合で増え続けません。この短い観察から一般的な予測可能期間は決められません。'],
 ['フラクタルとの関係','完成形は有限時間の一本（比較時は二本）の軌道で、初期の過渡状態も含みます。長時間の軌道が近づくアトラクター全体とは区別します。標準係数のアトラクターには複雑な層状のフラクタル的構造がありますが、画面の拡大は自己相似性の証明ではありません。フラクタル次元は推定しません。マンデルブロ集合やマンデルバルブは離散的な反復と発散判定で調べる集合、この図は連続時間の微分方程式の数値軌道です。'],
] as const;
