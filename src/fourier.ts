/** Pure model. Mathematical y points up; only the renderer reverses it. */
export type Point = {x:number;y:number};
export type Term = Point & {index:number;frequency:number;radius:number;phase:number};
export type Model = {samples:Point[];center:Point;terms:Term[];extent:number};
export type Preset = 'circle'|'star'|'fish';
export const N=128, STEPS=512, TAU=2*Math.PI;
export const presetNames:Record<Preset,string>={circle:'円',star:'五芒星の外周',fish:'非対称な魚'};
const finitePoint=(p:Point)=>Number.isFinite(p.x)&&Number.isFinite(p.y);
function assertPoints(points:readonly Point[]){if(points.length<2||!points.every(finitePoint))throw Error('有限な輪郭点が2点以上必要です');}

/** Closed arc length, without a duplicate endpoint. Zero edges are discarded. */
export function resample(points:readonly Point[],count=N):Point[]{
 assertPoints(points);if(!Number.isInteger(count)||count<2||count>4096)throw Error('標本数は2〜4096の整数です');
 const edges=points.map((p,i)=>({a:p,b:points[(i+1)%points.length],length:Math.hypot(p.x-points[(i+1)%points.length].x,p.y-points[(i+1)%points.length].y)})).filter(e=>e.length>0);
 const total=edges.reduce((s,e)=>s+e.length,0);if(!Number.isFinite(total)||total===0)throw Error('輪郭の長さが必要です');
 let edge=0,start=0;
 return Array.from({length:count},(_,i)=>{const distance=total*i/count;while(edge<edges.length-1&&distance>=start+edges[edge].length){start+=edges[edge++].length;}const e=edges[edge],u=(distance-start)/e.length;return {x:e.a.x+(e.b.x-e.a.x)*u,y:e.a.y+(e.b.y-e.a.y)*u};});
}

/** Translate sample centroid to zero and scale maximum sample radius to one, once. */
export function normalize(points:readonly Point[]):Point[]{
 assertPoints(points);const c=points.reduce((s,p)=>({x:s.x+p.x/points.length,y:s.y+p.y/points.length}),{x:0,y:0});
 const shifted=points.map(p=>({x:p.x-c.x,y:p.y-c.y})),r=Math.max(...shifted.map(p=>Math.hypot(p.x,p.y)));
 if(!Number.isFinite(r)||r===0)throw Error('正規化できない輪郭です');return shifted.map(p=>({x:p.x/r,y:p.y/r}));
}

/** Forward negative sign, 1/N normalization. Even-N Nyquist is negative. */
export function dft(points:readonly Point[]):Term[]{
 assertPoints(points);const n=points.length;
 return Array.from({length:n},(_,k)=>{
  let x=0,y=0;for(let j=0;j<n;j++){const a=TAU*k*j/n,c=Math.cos(a),s=Math.sin(a);x+=(points[j].x*c+points[j].y*s)/n;y+=(points[j].y*c-points[j].x*s)/n;}
  return {index:k,frequency:k<Math.ceil(n/2)?k:k-n,x,y,radius:Math.hypot(x,y),phase:Math.atan2(y,x)};
 });
}
/** Quantized amplitude key avoids roundoff reversing analytic ties. Total, stable order. */
export function rankTerms(terms:readonly Term[]):Term[]{
 return terms.filter(t=>t.index!==0).slice().sort((a,b)=>Math.round(b.radius*1e12)-Math.round(a.radius*1e12)||Math.abs(a.frequency)-Math.abs(b.frequency)||a.frequency-b.frequency||a.index-b.index);
}
export function modelFromSamples(samples:Point[]):Model{
 const coefficients=dft(samples),terms=rankTerms(coefficients),center={x:coefficients[0].x,y:coefficients[0].y};
 return {samples:samples.map(p=>({...p})),center,terms,extent:1.12*Math.max(1.05,Math.hypot(center.x,center.y)+terms.reduce((s,t)=>s+t.radius,0))};
}

/** Original coordinates, no external artwork. Star follows its ten-vertex perimeter. */
export function outline(preset:Preset):Point[]{
 if(preset==='circle')return Array.from({length:512},(_,i)=>({x:Math.cos(TAU*i/512),y:Math.sin(TAU*i/512)}));
 if(preset==='star')return Array.from({length:10},(_,i)=>{const a=Math.PI/2+TAU*i/10,r=i%2===0?1:.42;return {x:r*Math.cos(a),y:r*Math.sin(a)};});
 if(preset==='fish')return [[1.35,.08],[1.1,.38],[.65,.6],[.15,.64],[-.1,.94],[-.3,.59],[-.75,.38],[-1.05,.13],[-1.55,.63],[-1.4,-.06],[-1.57,-.55],[-1.02,-.22],[-.7,-.48],[-.3,-.55],[.03,-.85],[.18,-.53],[.63,-.4],[1.05,-.18]].map(([x,y])=>({x,y}));
 throw Error('未知のプリセットです');
}
export function createModel(preset:Preset):Model{return modelFromSamples(normalize(resample(outline(preset))));}
export function validK(model:Model,k:number){return Number.isInteger(k)&&k>=1&&k<=model.terms.length;}
function validate(model:Model,k:number,t:number){if(!validK(model,k)||!Number.isFinite(t)||t<0||t>1)throw Error('Kまたは位相が範囲外です');}
export function contribution(term:Term,t:number):Point{const a=TAU*term.frequency*t,c=Math.cos(a),s=Math.sin(a);return {x:term.x*c-term.y*s,y:term.x*s+term.y*c};}
export function reconstruct(model:Model,k:number,t:number):Point{
 validate(model,k,t);let x=model.center.x,y=model.center.y;for(const term of model.terms.slice(0,k)){const p=contribution(term,t);x+=p.x;y+=p.y;}return {x,y};
}
export function chain(model:Model,k:number,t:number){
 validate(model,k,t);let start={...model.center};return model.terms.slice(0,k).map(term=>{const d=contribution(term,t),end={x:start.x+d.x,y:start.y+d.y},arm={start,end,term};start=end;return arm;});
}
export function curve(model:Model,k:number):Point[]{return Array.from({length:STEPS+1},(_,i)=>reconstruct(model,k,i/STEPS));}
export function rmse(model:Model,k:number):number{return Math.sqrt(model.samples.reduce((sum,p,i)=>{const q=reconstruct(model,k,i/model.samples.length);return sum+(p.x-q.x)**2+(p.y-q.y)**2;},0)/model.samples.length);}
export function validStep(step:number){return Number.isInteger(step)&&step>=0&&step<=STEPS;}
/** Playback budget: discard elapsed time beyond 50ms; <= 26 new points per frame. */
export function advance(step:number,elapsedMs:number,speed:number,remainder=0){
 if(!validStep(step)||!Number.isFinite(elapsedMs)||elapsedMs<0||!Number.isFinite(speed)||speed<.25||speed>4||!Number.isFinite(remainder)||remainder<0||remainder>=1)throw Error('時間入力が範囲外です');
 const amount=Math.min(elapsedMs,50)/1000*STEPS/4*speed+remainder,whole=Math.floor(amount+1e-10),next=Math.min(STEPS,step+whole);
 return {step:next,remainder:next===STEPS?0:Math.max(0,amount-whole)};
}
export const format=(n:number)=>Math.abs(n)<.000005?'0':Number(n.toPrecision(5)).toString();

/** Analytic lesson scenes share exactly the same reconstruction and renderer. */
export function lessonModel(count:1|3):Model{
 const samples=Array.from({length:N},(_,j)=>{const t=j/N;return {x:.68*Math.cos(TAU*t)+(count===3?.24*Math.cos(-2*TAU*t+.6)+.12*Math.cos(3*TAU*t):0),y:.68*Math.sin(TAU*t)+(count===3?.24*Math.sin(-2*TAU*t+.6)+.12*Math.sin(3*TAU*t):0)};});
 return modelFromSamples(samples);
}
