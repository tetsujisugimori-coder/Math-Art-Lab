export type Point={x:number;y:number};
export type Model='rotation'|'spiral'|'sink'|'source'|'saddle';
export type Settings={model:Model;a:number;omega:number};
export const DT=.02, STEPS=600;
export const defaults=():Settings=>({model:'rotation',a:.5,omega:1});
export function parseNumber(raw:string){const text=raw.trim(),n=Number(text);return !/^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/.test(text)||!Number.isFinite(n)||(n===0&&/[1-9]/.test(text.split(/[eE]/)[0]))?NaN:n;}
export function valid(s:Settings){return Number.isFinite(s.a)&&s.a>=.1&&s.a<=1&&Number.isFinite(s.omega)&&s.omega>=.2&&s.omega<=2;}
export function pointValid(p:Point){return Number.isFinite(p.x)&&Number.isFinite(p.y)&&Math.abs(p.x)<=5&&Math.abs(p.y)<=5;}
export function field(s:Settings,p:Point):Point {const {x,y}=p,{a,omega:w}=s;switch(s.model){case 'rotation':return {x:-w*y,y:w*x};case 'spiral':return {x:-a*x-w*y,y:w*x-a*y};case 'sink':return {x:-a*x,y:-a*y};case 'source':return {x:a*x,y:a*y};case 'saddle':return {x:a*x,y:-a*y};}}
export function rk4(s:Settings,p:Point,h=DT):Point {const k1=field(s,p),k2=field(s,{x:p.x+h*k1.x/2,y:p.y+h*k1.y/2}),k3=field(s,{x:p.x+h*k2.x/2,y:p.y+h*k2.y/2}),k4=field(s,{x:p.x+h*k3.x,y:p.y+h*k3.y});return {x:p.x+h*(k1.x+2*k2.x+2*k3.x+k4.x)/6,y:p.y+h*(k1.y+2*k2.y+2*k3.y+k4.y)/6};}
export function trajectory(s:Settings,start:Point){const points=[start];let reason:'範囲外'|'非有限値'|null=null;for(let i=0;i<STEPS;i++){const p=rk4(s,points[points.length-1]);if(!Number.isFinite(p.x)||!Number.isFinite(p.y)){reason='非有限値';break;}if(!pointValid(p)){reason='範囲外';break;}points.push(p);}return {points,reason};}
export function seeds():Point[]{return [.2,1.5,3].flatMap(r=>Array.from({length:16},(_,i)=>({x:r*Math.cos(i*Math.PI/8),y:r*Math.sin(i*Math.PI/8)})));}
export function toScreen(p:Point,size:number):Point{return {x:(p.x+5)*size/10,y:(5-p.y)*size/10};}
export function fromScreen(p:Point,size:number):Point{return {x:p.x/size*10-5,y:5-p.y/size*10};}
