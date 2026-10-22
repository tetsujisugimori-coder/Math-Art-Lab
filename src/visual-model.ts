import { deform, type Branch, type Params, type Vec3 } from './fractal';

/** Explicit formula → teaching strategy. No DOM/Three.js and no changes to the engine. */
export const visualDefinitions = {
 length: { title:'枝の長さ', text:'変形前の全枝を世代別に表示。幹が n=0。世代を選ぶと同じ長さの枝を強調します。' },
 heading: { title:'子枝の方向', text:'全分岐に適用される規則の代表例。変形前の親枝の延長（白）から左右へ各 α。黄色の弧が α、子枝間は 2α です。' },
 count: { title:'深さと枝数', text:'変形前の選択世代を太い印で強調。世代 n には 2ⁿ 本、n=0〜D−1 の合計が B=2ᴰ−1 本です。' },
 'endpoint-x': { title:'枝端点 x', text:'全枝に適用する座標計算の代表例（y解説と同じ枝）。変形前の枝（白）と、始点からの x 成分（黄の矢印）、残りの成分（青）を表示します。' },
 'endpoint-y': { title:'枝端点 y', text:'全枝に適用する座標計算の代表例（x解説と同じ枝）。変形前の枝（白）と、始点からの y 成分（黄の矢印）、残りの成分（青）を表示します。' },
 phase: { title:'位相', text:'全端点に適用する規則の代表例。黄色の十字が代表端点。下の位相計は φ mod 2π を示します。通常再生の時刻だけに同期し、停止中は進みません。' },
 envelope: { title:'根元からの包絡', text:'全端点の E(d) を十字の大きさと色で表示。根元は E=0、枝に沿う距離とともに1へ近づきます。枝の途中を連続波として計算していません。' },
 'deform-x': { title:'x方向の変位', text:'全端点に適用される変形の代表例。白い十字は変形前、黄の矢印は x 成分だけ、青い線は残りの z 成分。矢印の終点は中間点です。' },
 'deform-y': { title:'y座標の保存', text:'全端点で y′=y。代表例の白い変形前端点と黄色い変形後端点を同じ高さの線で結びます。回転すると画面上では水平でなくても、座標の高さは同じです。' },
 'deform-z': { title:'z方向の変位', text:'全端点に適用される変形の代表例。白い十字は変形前、黄の矢印は z 成分だけ、青い線は残りの x 成分。ドラッグまたは回転ボタンで奥行きを確認できます。' },
 distance: { title:'端点の累積距離', text:'全端点に適用する距離計算の代表例。変形前の根元から代表端点まで、枝に沿う経路を黄色で強調。根元からの直線距離ではなく、この経路の枝長の和です。' },
} as const;
export type VisualId = keyof typeof visualDefinitions;
export type BranchInfo = { branch:Branch; index:number; generation:number; parent:number|null; length:number };
export function describeBranches(branches:Branch[]):BranchInfo[] {
 const ends=new Map<Vec3,BranchInfo>();
 return branches.map((branch,index)=>{
  const parent=ends.get(branch.start);
  const info={branch,index,generation:parent?parent.generation+1:0,parent:parent?.index??null,length:Math.hypot(branch.end.x-branch.start.x,branch.end.y-branch.start.y,branch.end.z-branch.start.z)};
  ends.set(branch.end,info);return info;
 });
}
export type Stroke={a:Vec3;b:Vec3;color:number};
export type VisualModel={strokes:Stroke[];detail:string;phase?:number};
const gold=0xf9d879, white=0xffffff, blue=0x67e8f9;
export function buildVisual(id:VisualId, infos:BranchInfo[], p:Params, time:number, generation=0):VisualModel {
 const strokes:Stroke[]=[];
 const line=(a:Vec3,b:Vec3,color=gold)=>strokes.push({a,b,color});
 const cross=(v:Vec3,size=.045,color=gold)=>{line({...v,x:v.x-size},{...v,x:v.x+size},color);line({...v,y:v.y-size},{...v,y:v.y+size},color);line({...v,z:v.z-size},{...v,z:v.z+size},color);};
 const arrow=(a:Vec3,b:Vec3)=>{line(a,b);const dx=b.x-a.x,dy=b.y-a.y,dz=b.z-a.z,l=Math.hypot(dx,dy,dz);if(l<1e-8){cross(b);return;}const u={x:dx/l,y:dy/l,z:dz/l};const side=Math.abs(u.y)<.9?{x:0,y:1,z:0}:{x:1,y:0,z:0};const h=Math.min(.07,l*.3);for(const s of [-1,1])line(b,{x:b.x-u.x*h+side.x*h*s*.5,y:b.y-u.y*h+side.y*h*s*.5,z:b.z-u.z*h+side.z*h*s*.5});};
 const chosen=infos.find(i=>i.generation===Math.min(2,p.depth-1))!;
 const b=chosen.branch, d=b.distance+chosen.length, before=b.end, after=deform(before,d,time,p);
 let detail='';let phase:number|undefined;
 const f=(n:number)=>n.toFixed(3);
 if(['length','heading','count','endpoint-x','endpoint-y','distance'].includes(id))
  for(const i of infos)line(i.branch.start,i.branch.end,0x64748b);
 if(id==='length'||id==='count'){
  for(const i of infos){const color=[gold,blue,0xf9a8d4,0xc4b5fd][i.generation%4];line(i.branch.start,i.branch.end,id==='length'?color:0x64748b);if(i.generation===generation)cross(i.branch.end,.04,gold);}
  detail=`n=${generation}：${2**generation} 本、Lₙ=${f(infos.find(i=>i.generation===generation)!.length)}。D=${p.depth}、全 ${infos.length} 本。黄色の十字が選択世代。`;
 }else if(id==='heading'){
  const parent=infos[0], origin=parent.branch.end, h=Math.atan2(origin.y-parent.branch.start.y,origin.x-parent.branch.start.x),r=Math.min(.36,parent.length*.4);
  line(parent.branch.start,origin,white);line(origin,{x:origin.x+Math.cos(h)*r*1.5,y:origin.y+Math.sin(h)*r*1.5,z:0},white);
  for(const child of infos.filter(i=>i.parent===0))line(child.branch.start,child.branch.end,blue);
  for(const sign of [-1,1])for(let i=0;i<20;i++){const point=(j:number)=>({x:origin.x+r*Math.cos(h+sign*p.angle*j/20),y:origin.y+r*Math.sin(h+sign*p.angle*j/20),z:0});line(point(i),point(i+1));}
  detail=`代表例：親枝は幹。各 α=${f(p.angle)} rad、子枝間 2α=${f(2*p.angle)} rad。弧は変形前の平面上。`;
 }else if(id==='endpoint-x'||id==='endpoint-y'){
  const mid=id==='endpoint-x'?{...b.start,x:before.x}:{...b.start,y:before.y};
  line(b.start,before,white);arrow(b.start,mid);line(mid,before,blue);cross(b.start,.04,white);cross(before);
  detail=`代表枝 n=${chosen.generation}：始点 (${f(b.start.x)}, ${f(b.start.y)}) → 終点 (${f(before.x)}, ${f(before.y)})。Δx=${f(before.x-b.start.x)}、Δy=${f(before.y-b.start.y)}。`;
 }else if(id==='distance'){
  let current:BranchInfo|undefined=chosen;const path:BranchInfo[]=[];
  while(current){path.unshift(current);current=current.parent===null?undefined:infos[current.parent];}
  for(const i of path){line(i.branch.start,i.branch.end);cross(i.branch.end);}cross(path[0].branch.start,.06,white);
  detail=`代表経路：${path.map(i=>f(i.length)).join(' + ')} ≈ d=${f(d)}（変形前の枝長の和・数値は小数第3位に丸め）。`;
 }else if(id==='envelope'){
  for(const i of infos){const distance=i.branch.distance+i.length,e=1-Math.exp(-.8*distance);cross(deform(i.branch.end,distance,time,p),.012+.045*e,Math.round(100+155*e)*0x10000+0xd879);}
  cross(infos[0].branch.start,.012,white);detail=`根元 E(0)=0。代表端点 d=${f(d)} では E=${f(1-Math.exp(-.8*d))}。大きさは包絡の指標で、実際の変位量ではありません。`;
 }else if(id==='phase'){
  cross(after,.09);phase=2*Math.PI*d/p.wavelength-time*p.speed;
  detail=`代表端点 d=${f(d)}、t=${f(time)} s、φ=${f(phase)} rad。sin φ=${f(Math.sin(phase))}、cos φ=${f(Math.cos(phase))}。`;
 }else{
  cross(before,.06,white);cross(after,.06);const axis=id==='deform-x'?'x':id==='deform-z'?'z':null;
  if(axis){const mid={...before,[axis]:after[axis]};arrow(before,mid);line(mid,after,blue);}
  else{line(before,after);line({...before,x:before.x-.15},{...before,x:before.x+.15},white);line({...after,x:after.x-.15},{...after,x:after.x+.15});}
  detail=`代表端点：Δx=${f(after.x-before.x)}、Δy=${f(after.y-before.y)}、Δz=${f(after.z-before.z)}。白＝変形前、黄の十字＝変形後。変位ゼロでは矢印を十字で表示。`;
 }
 return{strokes,detail,phase};
}
