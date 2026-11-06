/** Schelling-inspired finite, non-wrapping Moore grid. No DOM or clocks. */
export type Rule = 'random' | 'satisfying' | 'best';
export type Config = {size:number; red:number; vacancy:number; threshold:number; rule:Rule; seed:number};
export type Neighbors = {same:number; other:number; empty:number; occupied:number; ratio:number|null; satisfied:boolean};
export type Metrics = {population:number; red:number; blue:number; empty:number; unhappy:number; satisfaction:number|null; adjacency:number|null; pairs:number; samePairs:number; largest:number};
export type Sample = {step:number; satisfaction:number|null; adjacency:number|null};
export type Move = {id:number; from:number; to:number; before:Neighbors; after:Neighbors};
export type City = {config:Config; cells:number[]; colors:number[]; initial:number[]; rng:number; step:number; moves:number; blocked:number[]; last:Move|null; history:Sample[]; metrics:Metrics; status:'active'|'satisfied'|'jammed'|'limit'};
export const MAX_STEPS=10000;
export const HISTORY_LIMIT=601;
export const defaults:Config={size:30,red:50,vacancy:15,threshold:30,rule:'random',seed:15015};
export const presets=[
  {name:'ほぼ選好なし',threshold:0,red:50,vacancy:15,rule:'random',note:'θ=0%。混在したまま全員が満足できる例を観察。'},
  {name:'弱い同類選好',threshold:30,red:50,vacancy:15,rule:'random',note:'θ=30%。多数派を求めなくても、局所的な移動が同色の塊を育てる場合を比較。'},
  {name:'中程度の同類選好',threshold:50,red:50,vacancy:15,rule:'satisfying',note:'θ=50%。満足できる空き家だけに移る場合の境界を観察。'},
  {name:'強い同類選好',threshold:80,red:50,vacancy:15,rule:'best',note:'θ=80%。改善と満足は別。移動不能な不満足者が残るか観察。'},
  {name:'空き家が少ない街',threshold:30,red:50,vacancy:2,rule:'satisfying',note:'空き家2%。選べる行き先が少ない場合と比較。'},
  {name:'人口比が偏った街',threshold:30,red:80,vacancy:15,rule:'random',note:'赤80:青20。少数側の近隣と、人口比に依存する隣接指標に注目。'},
] as const;
export function validConfig(c:Config):boolean{
  return Number.isInteger(c.size)&&c.size>=2&&c.size<=40&&[c.red,c.vacancy,c.threshold].every(v=>Number.isFinite(v)&&v>=0&&v<=100)&&Number.isInteger(c.seed)&&c.seed>=0&&c.seed<=4294967295&&['random','satisfying','best'].includes(c.rule);
}
export function counts(c:Config){const total=c.size*c.size,empty=Math.round(total*c.vacancy/100),population=total-empty,red=Math.round(population*c.red/100);return {empty,population,red,blue:population-red};}
// Mulberry32: integer seed including zero, one state update per draw.
function random(s:{rng:number}){s.rng=(s.rng+0x6D2B79F5)>>>0;let t=s.rng;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;}
export function neighborIndices(size:number,index:number):number[]{
  const row=Math.floor(index/size),col=index%size,result:number[]=[];
  for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){if(!dx&&!dy)continue;const y=row+dy,x=col+dx;if(y>=0&&y<size&&x>=0&&x<size)result.push(y*size+x);}
  return result;
}
export function neighborhood(cells:readonly number[],colors:readonly number[],size:number,index:number,color:number,threshold:number,omit=-1):Neighbors{
  let same=0,other=0,empty=0;
  for(const p of neighborIndices(size,index)){const id=p===omit?0:cells[p];if(!id)empty++;else if(colors[id]===color)same++;else other++;}
  const occupied=same+other,ratio=occupied?same/occupied:null;
  // Integer cross product avoids equality errors at thresholds such as 60%.
  return {same,other,empty,occupied,ratio,satisfied:occupied===0||same*100>=threshold*occupied};
}
export function measure(c:Pick<City,'cells'|'colors'|'config'>):Metrics{
  const {cells,colors,config}=c;let population=0,red=0,unhappy=0,pairs=0,samePairs=0,largest=0;
  const visited=new Uint8Array(cells.length);
  for(let i=0;i<cells.length;i++){
    const id=cells[i];if(!id)continue;population++;if(colors[id]===1)red++;
    if(!neighborhood(cells,colors,config.size,i,colors[id],config.threshold).satisfied)unhappy++;
    for(const j of neighborIndices(config.size,i))if(j>i&&cells[j]){pairs++;if(colors[cells[j]]===colors[id])samePairs++;}
    if(visited[i])continue;
    const stack=[i];visited[i]=1;let area=0;
    while(stack.length){const p=stack.pop()!;area++;for(const j of neighborIndices(config.size,p))if(!visited[j]&&cells[j]&&colors[cells[j]]===colors[id]){visited[j]=1;stack.push(j);}}
    largest=Math.max(largest,area);
  }
  return {population,red,blue:population-red,empty:cells.length-population,unhappy,satisfaction:population?(population-unhappy)/population:null,adjacency:pairs?samePairs/pairs:null,pairs,samePairs,largest};
}
function sample(c:City):Sample{return {step:c.step,satisfaction:c.metrics.satisfaction,adjacency:c.metrics.adjacency};}
function updateStatus(c:City){c.status=c.metrics.unhappy===0?'satisfied':c.metrics.empty===0||c.blocked.length>=c.metrics.unhappy?'jammed':c.step>=MAX_STEPS?'limit':'active';}
export function createCity(config:Config):City{
  if(!validConfig(config))throw new Error('Invalid city settings');
  const n=counts(config),colors=[0,...Array(n.red).fill(1),...Array(n.blue).fill(2)],cells=[...Array(n.population)].map((_,i)=>i+1).concat(Array(n.empty).fill(0));
  const s={rng:config.seed>>>0};
  for(let i=cells.length-1;i>0;i--){const j=Math.floor(random(s)*(i+1));[cells[i],cells[j]]=[cells[j],cells[i]];}
  const c:City={config:{...config},cells,colors,initial:[...cells],rng:s.rng,step:0,moves:0,blocked:[],last:null,history:[],metrics:null!,status:'active'};
  c.metrics=measure(c);updateStatus(c);c.history=[sample(c)];return c;
}
/** Evaluate original vacancies with source empty. Undefined ratios are not maxima in C. */
export function destinations(c:City,from:number):number[]{
  const id=c.cells[from];if(!id)return [];
  const {size,threshold,rule}=c.config,color=c.colors[id],current=neighborhood(c.cells,c.colors,size,from,color,threshold);
  let best=current.ratio,result:number[]=[];
  for(let to=0;to<c.cells.length;to++){
    if(c.cells[to])continue;
    if(rule==='random'){result.push(to);continue;}
    const next=neighborhood(c.cells,c.colors,size,to,color,threshold,from);
    if(rule==='satisfying'){if(next.satisfied)result.push(to);continue;}
    if(next.ratio===null||current.ratio===null||next.ratio<=current.ratio)continue;
    if(best===null||next.ratio>best){best=next.ratio;result=[to];}else if(next.ratio===best)result.push(to);
  }
  return result;
}
/** One attempted decision. Nonmoving residents are certified only until the next move. */
export function advance(c:City,selectedId?:number):void{
  if(c.status!=='active')return;
  const excluded=new Set(c.blocked),candidates:number[]=[];
  for(let p=0;p<c.cells.length;p++){const id=c.cells[p];if(id&&!excluded.has(id)&&(selectedId===undefined||id===selectedId)&&!neighborhood(c.cells,c.colors,c.config.size,p,c.colors[id],c.config.threshold).satisfied)candidates.push(p);}
  if(!candidates.length){updateStatus(c);return;}
  const from=candidates[selectedId===undefined?Math.floor(random(c)*candidates.length):0],id=c.cells[from],before=neighborhood(c.cells,c.colors,c.config.size,from,c.colors[id],c.config.threshold),targets=destinations(c,from);
  c.step++;
  if(targets.length){
    const to=targets[Math.floor(random(c)*targets.length)];c.cells[from]=0;c.cells[to]=id;
    c.last={id,from,to,before,after:neighborhood(c.cells,c.colors,c.config.size,to,c.colors[id],c.config.threshold)};c.moves++;c.blocked=[];
  }else c.blocked.push(id);
  c.metrics=measure(c);updateStatus(c);c.history.push(sample(c));if(c.history.length>HISTORY_LIMIT)c.history.shift();
}
export const percent=(v:number|null)=>v===null?'データなし':`${(v*100).toFixed(1)}%`;
export const statusText={active:'再配置・探索を継続できる状態',satisfied:'全住民が満足（住民0人も含む）',jammed:'不満足者が残るが、有効な移動先なし',limit:'10,000ステップの上限に到達（収束判定ではありません）'};
