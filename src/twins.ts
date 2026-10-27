/** Quadratic complex dynamics. All arithmetic uses JavaScript binary64. */
export type Complex={re:number;im:number};
export type Plane='mandelbrot'|'julia';
export type PlaneView={center:Complex;span:number};
export type TwinsState={c:Complex;seed:Complex;iterations:number;views:Record<Plane,PlaneView>};
export const BASE_SPAN=3.6,MIN_SPAN=BASE_SPAN/1e6,MAX_SPAN=BASE_SPAN*4;
export const twinsPresets=[
 {id:'spiral',name:'枝の渦',c:{re:-.8,im:.156},description:'c=−0.8+0.156i。枝状の境界の近似を観察します。絵だけで連結性や所属を証明しません。'},
 {id:'circle',name:'円の基準 · c=0',c:{re:0,im:0},description:'z↦z²なので絶対値も二乗されます。充填集合は単位円板、ジュリア集合はその境界の単位円です。'},
 {id:'period-two',name:'二周期 · c=−1',c:{re:-1,im:0},description:'z₀=0からは0→−1→0の周期2軌道になります。右で別の初期値も調べられます。'},
 {id:'dust',name:'粒の群れ',c:{re:.285,im:.01},description:'c=0.285+0.01i。点在する細部を比較します。有限反復・画素による近似で、細部は設定に依存します。'},
] as const;
export const defaultView=(kind:Plane):PlaneView=>({center:{re:kind==='mandelbrot'?-.5:0,im:0},span:BASE_SPAN});
export function twinsDefaults():TwinsState{return{c:{...twinsPresets[0].c},seed:{re:.2,im:.1},iterations:200,views:{mandelbrot:defaultView('mandelbrot'),julia:defaultView('julia')}};}
export function finiteComplex(z:Complex){if(!Number.isFinite(z.re)||!Number.isFinite(z.im))throw new RangeError('複素数の実部・虚部は有限値が必要です。');}
export const addComplex=(a:Complex,b:Complex):Complex=>({re:a.re+b.re,im:a.im+b.im});
export const multiplyComplex=(a:Complex,b:Complex):Complex=>({re:a.re*b.re-a.im*b.im,im:a.re*b.im+a.im*b.re});
export const magnitude=(z:Complex)=>Math.hypot(z.re,z.im);
export function quadratic(z:Complex,c:Complex):Complex{finiteComplex(z);finiteComplex(c);const next=addComplex(multiplyComplex(z,z),c);finiteComplex(next);return next;}
/** Sufficient for arbitrary finite c: r>max(2,|c|+1) implies r²-|c|>r. */
export function escapeRadius(kind:Plane,c:Complex){finiteComplex(c);return kind==='mandelbrot'?2:Math.max(2,magnitude(c)+1);}
/** -1 means escape was not observed through n=limit, never certified membership. */
export function escapeSteps(z:Complex,c:Complex,limit:number,radius:number):number{
 finiteComplex(z);finiteComplex(c);
 if(!Number.isInteger(limit)||limit<1||limit>500||!Number.isFinite(radius)||radius<2)throw new RangeError('反復上限または発散半径が不正です。');
 let x=z.re,y=z.im;const radius2=radius*radius;
 for(let n=0;n<=limit;n++){
  if(x*x+y*y>radius2)return n;
  if(n===limit)return -1;
  const next=x*x-y*y+c.re;y=2*x*y+c.im;x=next;
 }
 return -1;
}
export function validateView(view:PlaneView){
 finiteComplex(view.center);
 if(Math.abs(view.center.re)>16||Math.abs(view.center.im)>16)throw new RangeError('表示中心は実部・虚部とも±16までです。');
 if(!Number.isFinite(view.span)||view.span<MIN_SPAN*(1-1e-12)||view.span>MAX_SPAN*(1+1e-12))throw new RangeError('本作の拡大範囲は0.25〜100万倍です。倍精度・有限画素の表示制約として制限します。');
}
export function validateTwins(s:TwinsState){
 finiteComplex(s.c);finiteComplex(s.seed);
 if(Math.abs(s.c.re)>4||Math.abs(s.c.im)>4)throw new RangeError('cの実部・虚部は−4〜4です。');
 if(Math.abs(s.seed.re)>16||Math.abs(s.seed.im)>16)throw new RangeError('調べるz₀の実部・虚部は−16〜16です。');
 if(!Number.isInteger(s.iterations)||s.iterations<50||s.iterations>500)throw new RangeError('最大反復回数は50〜500の整数です。');
 validateView(s.views.mandelbrot);validateView(s.views.julia);
}
/** u,v are CSS-normalized coordinates, independent of device pixel ratio. */
export function screenToComplex(view:PlaneView,u:number,v:number,aspect:number):Complex{
 return{re:view.center.re+(u-.5)*view.span,im:view.center.im+(.5-v)*view.span/aspect};
}
export function complexToScreen(view:PlaneView,z:Complex,aspect:number){return{u:.5+(z.re-view.center.re)/view.span,v:.5-(z.im-view.center.im)*aspect/view.span};}
export function zoomView(view:PlaneView,factor:number,u=.5,v=.5,aspect=1):PlaneView{
 if(!Number.isFinite(factor)||factor<=0||!Number.isFinite(aspect)||aspect<=0)throw new RangeError('拡大率が不正です。');
 const anchor=screenToComplex(view,u,v,aspect),span=view.span/factor;
 const next={center:{re:anchor.re-(u-.5)*span,im:anchor.im-(.5-v)*span/aspect},span};validateView(next);return next;
}
export function panView(view:PlaneView,dx:number,dy:number,width:number):PlaneView{
 const next={center:{re:view.center.re-dx/width*view.span,im:view.center.im+dy/width*view.span},span:view.span};validateView(next);return next;
}
export function rasterSize(width:number,height:number,dpr:number){
 if(![width,height,dpr].every(v=>Number.isFinite(v)&&v>0))throw new RangeError('画面サイズとDPRは正の有限値が必要です。');
 const ratio=Math.min(dpr,1.5,640/width,640/height);return{width:Math.max(1,Math.floor(width*ratio)),height:Math.max(1,Math.floor(height*ratio)),aspect:width/height};
}
export function orbit(z:Complex,c:Complex,kind:Plane,steps:number){
 const values=[{...z}],radius=escapeRadius(kind,c);let escaped=magnitude(z)>radius;
 for(let i=0;i<steps&&!escaped;i++){z=quadratic(z,c);values.push(z);escaped=magnitude(z)>radius;}
 return{values,escaped,radius};
}
export function formatTwinsNumber(value:number){return value===0?'0':Number(value.toPrecision(10)).toString();}
/** Reject decimal input that silently underflows to zero in binary64. */
export function parseTwinsNumber(raw:string){
 const value=Number(raw),mantissa=raw.trim().split(/[eE]/)[0];
 if(!raw.trim()||!Number.isFinite(value))throw new RangeError('有限の数値を入力してください。');
 if(value===0&&/[1-9]/.test(mantissa))throw new RangeError('倍精度で非ゼロを保持できない小さな入力です。0には置き換えません。');
 return value;
}
export function formatComplex(z:Complex){return `${formatTwinsNumber(z.re)} ${z.im<0?'−':'+'} ${formatTwinsNumber(Math.abs(z.im))}i`;}
