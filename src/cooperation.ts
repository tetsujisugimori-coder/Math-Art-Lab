/** C=1, D=0. Scores and decisions always use one immutable old generation. */
export type Strategy=0|1;
export type Config={size:number;cooperation:number;T:number;R:number;P:number;S:number;neighbors:4|8;boundary:'fixed'|'periodic';rule:'best'|'fermi';temperature:number;mutation:number;seed:number;layout:'random'|'island'|'invasion';scoring:'sum'|'mean'};
export const defaults:Config={size:30,cooperation:.5,T:5,R:3,P:1,S:0,neighbors:8,boundary:'periodic',rule:'best',temperature:1,mutation:0,seed:16016,layout:'random',scoring:'sum'};
export const HISTORY_LIMIT=600;
export function validate(c:Config):void{
  const range=(v:number,min:number,max:number)=>Number.isFinite(v)&&v>=min&&v<=max;
  if(!Number.isInteger(c.size)||!range(c.size,4,80)||!range(c.cooperation,0,1)||!range(c.mutation,0,1)||!range(c.temperature,.001,1000)||!Number.isInteger(c.seed)||!range(c.seed,0,4294967295)||![c.T,c.R,c.P,c.S].every(v=>range(v,-1000,1000))||![4,8].includes(c.neighbors)||!['fixed','periodic'].includes(c.boundary)||!['best','fermi'].includes(c.rule)||!['random','island','invasion'].includes(c.layout)||!['sum','mean'].includes(c.scoring))throw new Error('数値・選択肢が範囲外です。未適用のまま保持しました。');
}
export function classification({T,R,P,S}:Config):string{
  if(T>R&&R>P&&P>S)return '厳密な囚人のジレンマ';
  if(T>R&&R>P&&P===S)return '弱い囚人のジレンマ（P=S）';
  return '一般の対称2戦略ゲーム（囚人のジレンマ条件外）';
}
/** Stateless keyed uniform draws: independent of iteration order / rendering / rule. */
export function random(seed:number,generation:number,cell:number,slot:number):number{
  let x=(seed^Math.imul(generation+1,0x9e3779b9)^Math.imul(cell+1,0x85ebca6b)^Math.imul(slot+1,0xc2b2ae35))>>>0;
  x=Math.imul(x^(x>>>16),0x7feb352d);x=Math.imul(x^(x>>>15),0x846ca68b);return ((x^(x>>>16))>>>0)/4294967296;
}
export function neighbors(c:Config,i:number):number[]{
  const result:number[]=[],n=c.size,x=i%n,y=Math.floor(i/n);
  for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
    if((dx===0&&dy===0)||(c.neighbors===4&&Math.abs(dx)+Math.abs(dy)!==1))continue;
    let a=x+dx,b=y+dy;if(c.boundary==='periodic'){a=(a+n)%n;b=(b+n)%n;}else if(a<0||a>=n||b<0||b>=n)continue;
    result.push(b*n+a);
  }return result;
}
export function payoff(me:Strategy,other:Strategy,c:Config):number{return me?(other?c.R:c.S):(other?c.T:c.P);}
export function scores(c:Config,cells:readonly Strategy[]):number[]{return cells.map((s,i)=>{const ns=neighbors(c,i),sum=ns.reduce((v,j)=>v+payoff(s,cells[j],c),0);return c.scoring==='mean'?sum/ns.length:sum;});}
export function fermi(own:number,other:number,K:number):number{
  if(!Number.isFinite(own)||!Number.isFinite(other)||!Number.isFinite(K)||K<=0)throw new Error('Invalid Fermi arguments');
  const z=(other-own)/K;if(z>=0)return 1/(1+Math.exp(-z));const e=Math.exp(z);return e/(1+e);
}
export type Decision={source:number;before:Strategy;imitated:Strategy;probability:number|null;adopted:boolean;mutated:boolean;ownScore:number;sourceScore:number};
export type Metrics={generation:number;cooperators:number;defectors:number;rate:number;meanC:number|null;meanD:number|null;changed:number;mutations:number;largest:number;boundaryPairs:number};
export type World={config:Config;cells:Strategy[];initial:Strategy[];generation:number;scores:number[];decisions:Decision[];metrics:Metrics;history:Metrics[];initialMetrics:Metrics};
export function measure(c:Config,cells:readonly Strategy[],ss:readonly number[],generation=0,changed=0,mutations=0):Metrics{
  const cooperators=cells.reduce<number>((a,s)=>a+s,0),defectors=cells.length-cooperators;
  let sumC=0,sumD=0,boundaryPairs=0,largest=0;const seen=new Uint8Array(cells.length);
  cells.forEach((s,i)=>{if(s)sumC+=ss[i];else sumD+=ss[i];for(const j of neighbors(c,i))if(j>i&&cells[j]!==s)boundaryPairs++;
    if(!s||seen[i])return;const stack=[i];seen[i]=1;let count=0;while(stack.length){const p=stack.pop()!;count++;for(const j of neighbors(c,p))if(cells[j]&&!seen[j]){seen[j]=1;stack.push(j);}}largest=Math.max(largest,count);
  });
  return {generation,cooperators,defectors,rate:cooperators/cells.length,meanC:cooperators?sumC/cooperators:null,meanD:defectors?sumD/defectors:null,changed,mutations,largest,boundaryPairs};
}
export function createWorld(config:Config=defaults,initial?:readonly Strategy[]):World{
  validate(config);const c={...config},n=c.size,total=n*n;
  if(initial&&(initial.length!==total||initial.some(s=>s!==0&&s!==1)))throw new Error('Invalid initial lattice');
  let cells:Strategy[];
  if(initial)cells=[...initial];else{
    cells=Array<Strategy>(total).fill(0);
    if(c.layout==='random'){
      const order=Array.from({length:total},(_,i)=>i);for(let i=total-1;i>0;i--){const j=Math.floor(random(c.seed,0,i,9)*(i+1));[order[i],order[j]]=[order[j],order[i]];}
      for(const i of order.slice(0,Math.round(total*c.cooperation)))cells[i]=1;
    }else if(c.layout==='island')cells=cells.map((_,i)=>Math.abs(i%n-(n-1)/2)<n/4&&Math.abs(Math.floor(i/n)-(n-1)/2)<n/4?1:0);
    else {cells.fill(1);cells[Math.floor(n/2)*n+Math.floor(n/2)]=0;}
  }
  const ss=scores(c,cells),metrics=measure(c,cells,ss);return {config:c,cells,initial:[...cells],generation:0,scores:ss,decisions:[],metrics,initialMetrics:{...metrics},history:[metrics]};
}
/** Optional traversal is solely for invariant tests; decisions are keyed by cell. */
export function advance(w:World,order?:readonly number[]):World{
  const c=w.config,next=[...w.cells],decisions:Decision[]=Array(w.cells.length);let changed=0,mutations=0;
  for(const i of order??w.cells.map((_,i)=>i)){
    const ns=neighbors(c,i),before=w.cells[i];let source=i,probability:number|null=null,adopted=false;
    if(c.rule==='best'){
      const candidates=[i,...ns],best=Math.max(...candidates.map(j=>w.scores[j]));
      // Preserve own strategy on own-score ties; otherwise lowest row-major ID.
      source=w.scores[i]===best?i:candidates.filter(j=>w.scores[j]===best).sort((a,b)=>a-b)[0];adopted=true;
    }else {source=ns[Math.floor(random(c.seed,w.generation,i,0)*ns.length)];probability=fermi(w.scores[i],w.scores[source],c.temperature);adopted=random(c.seed,w.generation,i,1)<probability;}
    const imitated=adopted?w.cells[source]:before,mutated=random(c.seed,w.generation,i,2)<c.mutation;
    next[i]=mutated?(1-imitated) as Strategy:imitated;if(next[i]!==before)changed++;if(mutated)mutations++;
    decisions[i]={source,before,imitated,probability,adopted,mutated,ownScore:w.scores[i],sourceScore:w.scores[source]};
  }
  const generation=w.generation+1,ss=scores(c,next),metrics=measure(c,next,ss,generation,changed,mutations);
  return {...w,cells:next,generation,scores:ss,decisions,metrics,history:[...w.history.slice(-(HISTORY_LIMIT-1)),metrics]};
}
export const comparisonKeys=['neighbors','rule','T','temperature','mutation','boundary','scoring'] as const;
export type ComparisonKey=typeof comparisonKeys[number];
export function compareWorld(w:World,key:ComparisonKey,value:Config[ComparisonKey]):[World,World]{
  if(!comparisonKeys.includes(key)||w.config[key]===value)throw new Error('比較では条件を一つ変更してください。');
  return [createWorld(w.config,w.initial),createWorld({...w.config,[key]:value},w.initial)];
}
export const presets=[
  {name:'ランダム混在',config:{...defaults},note:'混在から境界がどう動くか。協力率の低下を予想できるだろうか。'},
  {name:'協力者の島',config:{...defaults,layout:'island' as const,T:3.5,P:0,seed:16017},note:'まとまった協力者が境界を守れるか。存続を保証しません。'},
  {name:'裏切り者の侵入',config:{...defaults,layout:'invasion' as const,seed:16018},note:'1人の裏切りが広がるか、やがて縮むか。'},
  {name:'近傍4／8比較',config:{...defaults,neighbors:4 as const,seed:16019},compare:'neighbors' as ComparisonKey,value:8,note:'隣人の数だけを変え、合計利得と模様の変化を比べる。'},
  {name:'突然変異のある社会',config:{...defaults,mutation:.01,rule:'fermi' as const,seed:16020},note:'模倣後の反転が少数戦略を再導入するか。'},
  {name:'模倣規則の比較',config:{...defaults,seed:16021},compare:'rule' as ComparisonKey,value:'fermi',note:'同じ配置で確率的な模倣に変えると協力率や塊はどうなるか。'},
];
