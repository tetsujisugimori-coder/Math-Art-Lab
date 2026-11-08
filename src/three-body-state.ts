import {clone,validate,initialPhase,verlet,difference,time,type Config,type Phase} from './three-body';
export type Sample={t:number;positions:{x:number;y:number}[];D:number};
/** Serializable, bounded circular history. Points are committed model states. */
export type History={data:Sample[];start:number;capacity:number};
export const history=(capacity=6000):History=>({data:[],start:0,capacity});
export function samples(h:History):Sample[]{return h.data.length<h.capacity?h.data.slice():h.data.slice(h.start).concat(h.data.slice(0,h.start));}
export function append(h:History,s:Sample){if(h.data.length<h.capacity)h.data.push(s);else{h.data[h.start]=s;h.start=(h.start+1)%h.capacity;}}
export type Experiment={config:Config;phase:Phase;trail:History;graph:History;reason:string|null};
export function record(e:Experiment,D=0){const s={t:time(e.phase,e.config),positions:e.phase.bodies.map(({x,y})=>({x,y})),D};append(e.trail,s);if(e.phase.steps%20===0)append(e.graph,s);}
export function createExperiment(config:Config):Experiment{validate(config);const e:Experiment={config:clone(config),phase:initialPhase(config),trail:history(),graph:history(1200),reason:null};record(e);return e;}
export type Comparison={a:Experiment;b:Experiment;body:number;key:'x'|'y'|'vx'|'vy';delta:number};
export function createComparison(c:Config,index:number,key:Comparison['key'],delta:number):Comparison{
  if(!Number.isInteger(index)||index<0||index>2||!['x','y','vx','vy'].includes(key)||!Number.isFinite(delta)||Math.abs(delta)<1e-10||Math.abs(delta)>.01)throw Error('微小差δは絶対値10⁻¹⁰〜0.01、天体と成分を選んでください。');
  const b=clone(c);b.bodies[index][key]+=delta;
  if(b.bodies[index][key]===c.bodies[index][key])throw Error('微小差が浮動小数点精度以下です。');
  const result={a:createExperiment(c),b:createExperiment(b),body:index,key,delta};
  const d=difference(result.a.phase,result.b.phase,c).D;result.a.trail.data[0].D=d;result.a.graph.data[0].D=d;return result;
}
export function advance(e:Experiment,n=1){if(!Number.isInteger(n)||n<0||n>2000)throw Error('1回の計算上限は2000ステップです。');for(let i=0;i<n&&!e.reason;i++){const next=verlet(e.phase,e.config);e.reason=next.reason;if(!next.reason){e.phase=next.phase;record(e);}}}
export function advanceComparison(c:Comparison,n=1){
  if(!Number.isInteger(n)||n<0||n>2000)throw Error('1回の計算上限は2000ステップです。');
  for(let i=0;i<n&&!c.a.reason&&!c.b.reason;i++){
    const a=verlet(c.a.phase,c.a.config),b=verlet(c.b.phase,c.b.config);
    // Atomic commit: never leave the experiments at different times.
    if(a.reason||b.reason){c.a.reason=a.reason;c.b.reason=b.reason;break;}
    c.a.phase=a.phase;c.b.phase=b.phase;const d=difference(a.phase,b.phase,c.a.config).D;record(c.a,d);record(c.b,d);
  }
}
