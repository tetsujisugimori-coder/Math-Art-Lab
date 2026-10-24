/** Geometry uses radians; playback rate is radians of parameter t per real second. */
export const TAU=2*Math.PI;
export type KnotSettings={R:number;r:number;p:number;q:number};
export type KnotPlayback={t:number;mode:'drawing'|'paused'|'complete'};
export const knotDefaults:KnotSettings={R:3,r:1,p:2,q:3};
export const knotPresets=[
 {id:'trefoil',name:'三つ葉結び目 · T(2,3)',p:2,q:3,description:'中心軸を2周、断面を3周する三つ葉結び目（3₁）。'},
 {id:'three-five',name:'トーラス結び目 · T(3,5)',p:3,q:5,description:'中心軸を3周、断面を5周する結び目（10₁₂₄）。五葉結び目とは別の種類です。'},
 {id:'cinquefoil',name:'五葉結び目 · T(2,5)',p:2,q:5,description:'中心軸を2周、断面を5周する五葉結び目（5₁）。'},
] as const;
export function gcd(a:number,b:number):number{
 if(!Number.isSafeInteger(a)||!Number.isSafeInteger(b)||a<1||b<1)throw new RangeError('正の整数が必要です。');
 while(b){const remainder=a%b;a=b;b=remainder;}return a;
}
export function validateKnot(s:KnotSettings):void{
 if(!Number.isInteger(s.p)||!Number.isInteger(s.q)||s.p<1||s.q<1||s.p>9||s.q>9)throw new RangeError('p・qは1〜9の正の整数にしてください。');
 if(gcd(s.p,s.q)!==1)throw new RangeError('pとqは互いに素（共通の約数は1だけ）にしてください。同じ経路を重複してたどる組合せは受け付けません。');
 if(!Number.isFinite(s.R)||!Number.isFinite(s.r)||s.R<1||s.R>6||s.r<.2||s.r>2.5)throw new RangeError('Rは1〜6、rは0.2〜2.5の有限値にしてください。');
 if(s.R<=s.r)throw new RangeError('R > r > 0 が必要です。断面の円が中心軸へ届かないようにします。');
 // Display precision constraint, separate from the mathematical R > r condition.
 if(s.R-s.r<.1-1e-10)throw new RangeError('表示精度のためR−rは0.1以上にしてください。これは数学の条件R>rに加えた表示上の制限です。');
}
/** The same torus surface evaluator defines the curve and the auxiliary surface. */
export function torusPoint(s:KnotSettings,u:number,v:number){
 const radius=s.R+s.r*Math.cos(v);
 return{x:radius*Math.cos(u),y:radius*Math.sin(u),z:s.r*Math.sin(v)};
}
export function knotPoint(s:KnotSettings,t:number){
 validateKnot(s);if(!Number.isFinite(t)||t<0||t>TAU)throw new RangeError('tは0〜2πです。');
 // Both endpoints are the same periodic phase, avoiding a floating-point seam.
 const phase=t===TAU?0:t;return torusPoint(s,s.p*phase,s.q*phase);
}
export function knotFrame(s:KnotSettings,t:number){
 const point=knotPoint(s,t),phase=t===TAU?0:t,u=s.p*phase,v=s.q*phase;
 const cu=Math.cos(u),su=Math.sin(u),cv=Math.cos(v),sv=Math.sin(v),rho=s.R+s.r*cv;
 const tangent={x:-s.r*s.q*sv*cu-rho*s.p*su,y:-s.r*s.q*sv*su+rho*s.p*cu,z:s.r*s.q*cv};
 return{point,center:{x:s.R*cu,y:s.R*su,z:0},normal:{x:cv*cu,y:cv*su,z:sv},tangent};
}
export function sampleKnot(s:KnotSettings,segments=Math.max(1024,256*Math.max(s.p,s.q))){
 validateKnot(s);if(!Number.isInteger(segments)||segments<256||segments>8192)throw new RangeError('標本区間数は256〜8192です。');
 const positions=new Float32Array((segments+1)*3);
 for(let i=0;i<=segments;i++){const p=knotPoint(s,i/segments*TAU);positions.set([p.x,p.y,p.z],i*3);}
 return{positions,segments};
}
export function advanceKnot(state:KnotPlayback,delta:number,rate:number):KnotPlayback{
 if(!Number.isFinite(delta)||delta<0||!Number.isFinite(rate)||rate<.1||rate>2)throw new RangeError('再生速度または経過時間が不正です。');
 if(state.mode!=='drawing')return state;
 const t=Math.min(TAU,state.t+delta*rate);return{t,mode:t===TAU?'complete':'drawing'};
}
export function restartKnot(state:KnotPlayback,reducedMotion:boolean):KnotPlayback{
 return{t:0,mode:reducedMotion||state.mode==='paused'?'paused':'drawing'};
}
export function reshapeKnot(state:KnotPlayback,reducedMotion:boolean):KnotPlayback{
 return state.mode==='complete'?{t:TAU,mode:'complete'}:restartKnot(state,reducedMotion);
}
export type KnotGuide='major'|'minor'|'R'|'r'|'p'|'q';
export const knotGuides:readonly {id:KnotGuide;title:string;description:string}[]=[
 {id:'major',title:'cos(pt), sin(pt)',description:'中央の円のCが中心軸の周囲を回ります。cosとsinを同じ角度で組にすると、円の向きをx・yに変換できます。曲線上のPはCからさらにずれています。'},
 {id:'minor',title:'cos(qt), sin(qt)',description:'Cを中心とする断面の円で、外向きの距離r cos(qt)と高さr sin(qt)を同時に決めます。断面の円自体もptに合わせて向きを変えます。'},
 {id:'R',title:'R · 大半径',description:'原点Oから断面の中心Cまでの距離がR。Pの中心軸からの距離はR+r cos(qt)で、常にRではありません。'},
 {id:'r',title:'r · 小半径',description:'断面の中心Cから曲線上のPまでの距離がr。断面方向の広がりであり、光の線自体の太さとは別です。'},
 {id:'p',title:'p · 中心軸の周囲',description:'0≤t≤2πの間に中央の円をp周します。矢印とCの動きで確認できます。描画速度はpを変更しません。'},
 {id:'q',title:'q · 断面の周囲',description:'同じtの間に断面の円をq周します。CからPへの方向で確認できます。ptとqtは順番ではなく同時に決まります。'},
];
