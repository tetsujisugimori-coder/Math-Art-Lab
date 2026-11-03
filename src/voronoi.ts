/** Unit-square Euclidean Voronoi geometry. No raster approximation. */
export type Point={x:number;y:number};
export type Site=Point&{id:number};
export type Cell={site:Site;polygon:Point[];area:number;centroid:Point};
export const MAX_SITES=64;
export const MIN_SEPARATION=1e-6;
export const COORD_TOL=128*Number.EPSILON;
export const AREA_TOL=1e-10;
export const DISTANCE_TOL=1e-12;
export const inBounds=(p:Point)=>Number.isFinite(p.x)&&Number.isFinite(p.y)&&p.x>=0&&p.x<=1&&p.y>=0&&p.y<=1;
export const distance=(a:Point,b:Point)=>Math.hypot(a.x-b.x,a.y-b.y);
const clamp=(n:number)=>Math.max(0,Math.min(1,n));

export function validateSites(sites:Site[],minimum=MIN_SEPARATION):void{
 if(!Number.isFinite(minimum)||minimum<MIN_SEPARATION)throw new Error('点間距離の下限が不正です。');
 if(sites.length<1||sites.length>MAX_SITES)throw new Error(`点数は1〜${MAX_SITES}点です。`);
 const ids=new Set<number>();
 sites.forEach((p,i)=>{
  if(!inBounds(p))throw new Error('座標は有限値で、0以上1以下にしてください。');
  if(!Number.isSafeInteger(p.id)||p.id<1||ids.has(p.id))throw new Error('点の番号が不正または重複しています。');
  ids.add(p.id);
  for(let j=0;j<i;j++)if(distance(p,sites[j])<minimum)throw new Error(`点が重複、または近すぎます（最小距離 ${minimum}）。`);
 });
}

/** Keep n·(x-mid) <= 0. A unit normal avoids subtracting squared coordinates. */
export function clipHalfPlane(polygon:Point[],normal:Point,mid:Point):Point[]{
 const out:Point[]=[];
 const signed=(p:Point)=>(p.x-mid.x)*normal.x+(p.y-mid.y)*normal.y;
 for(let i=0;i<polygon.length;i++){
  const a=polygon[i],b=polygon[(i+1)%polygon.length],da=signed(a),db=signed(b);
  if(da<=0)out.push({...a});
  if((da<0&&db>0)||(da>0&&db<0)){
   const t=da/(da-db);
   out.push({x:a.x+t*(b.x-a.x),y:a.y+t*(b.y-a.y)});
  }
 }
 return out;
}

/** Signed triangle fan around the first vertex, for stability near the boundary. */
export function polygonMetrics(polygon:Point[]):{area:number;centroid:Point}{
 if(polygon.length<3||polygon.some(p=>!Number.isFinite(p.x)||!Number.isFinite(p.y)))throw new Error('多角形が不正です。');
 const o=polygon[0];let twice=0,mx=0,my=0;
 for(let i=1;i+1<polygon.length;i++){
  const a={x:polygon[i].x-o.x,y:polygon[i].y-o.y},b={x:polygon[i+1].x-o.x,y:polygon[i+1].y-o.y};
  const cross=a.x*b.y-a.y*b.x;twice+=cross;mx+=(a.x+b.x)*cross;my+=(a.y+b.y)*cross;
 }
 if(!Number.isFinite(twice)||Math.abs(twice)<Number.EPSILON**2*16)throw new Error('領域の面積が小さすぎるため更新できません。');
 const centroid={x:o.x+mx/(3*twice),y:o.y+my/(3*twice)},area=Math.abs(twice)/2;
 if(!Number.isFinite(area)||!Number.isFinite(centroid.x)||!Number.isFinite(centroid.y))throw new Error('面積または重心を計算できません。');
 return {area,centroid};
}

export function voronoi(sites:Site[]):Cell[]{
 validateSites(sites);
 // Fixed competitor ordering makes geometry independent of caller array order.
 const ordered=[...sites].sort((a,b)=>a.id-b.id);
 const cells=sites.map(site=>{
  let polygon:Point[]=[{x:0,y:0},{x:1,y:0},{x:1,y:1},{x:0,y:1}];
  for(const other of ordered){
   if(site.id===other.id)continue;
   const d=distance(site,other),normal={x:(other.x-site.x)/d,y:(other.y-site.y)/d};
   polygon=clipHalfPlane(polygon,normal,{x:(site.x+other.x)/2,y:(site.y+other.y)/2});
  }
  if(polygon.some(p=>p.x < -COORD_TOL||p.x>1+COORD_TOL||p.y < -COORD_TOL||p.y>1+COORD_TOL))throw new Error('領域外の頂点が発生しました。');
  polygon=polygon.map(p=>({x:clamp(p.x),y:clamp(p.y)}));
  const metrics=polygonMetrics(polygon),c=metrics.centroid;
  if(c.x < -COORD_TOL||c.x>1+COORD_TOL||c.y < -COORD_TOL||c.y>1+COORD_TOL)throw new Error('領域外の重心が発生しました。');
  return {site:{...site},polygon,area:metrics.area,centroid:{x:clamp(c.x),y:clamp(c.y)}};
 });
 if(Math.abs(cells.reduce((s,c)=>s+c.area,0)-1)>AREA_TOL)throw new Error('領域の面積和を検証できません。');
 return cells;
}

export function lloyd(sites:Site[]):{sites:Site[];cells:Cell[];maxMove:number}{
 const cells=voronoi(sites),next=cells.map(c=>({...c.centroid,id:c.site.id}));
 validateSites(next); // Entire step is accepted or rejected, never partially applied.
 return {sites:next,cells,maxMove:Math.max(...sites.map((p,i)=>distance(p,next[i])))};
}

export function observe(sites:Site[],point:Point){
 validateSites(sites);
 if(!inBounds(point))throw new Error('観察点は領域内に置いてください。');
 const distances=sites.map(p=>({id:p.id,distance:distance(p,point)})).sort((a,b)=>a.distance-b.distance||a.id-b.id);
 const nearest=distances.filter(d=>d.distance-distances[0].distance<=DISTANCE_TOL).map(d=>d.id).sort((a,b)=>a-b);
 return {distances,nearest,displayOwner:nearest[0]};
}

export const presetNames={basic:'基本の4点',irregular:'不規則な結晶',grid:'格子の秩序',cluster:'中央に集まる点'};
export type Preset=keyof typeof presetNames;
export function preset(id:Preset):Site[]{
 let points:Point[]=[];
 if(id==='basic')points=[{x:.2,y:.3},{x:.75,y:.2},{x:.65,y:.75},{x:.2,y:.8}];
 else if(id==='grid')points=Array.from({length:25},(_,i)=>({x:(i%5+.5)/5,y:(Math.floor(i/5)+.5)/5}));
 else{
  let seed=117;const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2**32;};
  while(points.length<24){const p=id==='cluster'?{x:.5+(rand()-.5)*.48,y:.5+(rand()-.5)*.48}:{x:.04+rand()*.92,y:.04+rand()*.92};if(points.every(q=>distance(p,q)>.035))points.push(p);}
 }
 return points.map((p,i)=>({...p,id:i+1}));
}
