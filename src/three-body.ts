/** Dimensionless planar Newton/Plummer model. No renderer or wall clock here. */
export type Body={m:number;x:number;y:number;vx:number;vy:number};
export type Config={bodies:Body[];G:number;dt:number;epsilon:number};
export type Phase={bodies:Body[];steps:number};
export type Vec={x:number;y:number};
export const clone=<T>(v:T):T=>structuredClone(v);
export const time=(p:Phase,c:Config)=>p.steps*c.dt;
export const distance=(a:Vec,b:Vec)=>Math.hypot(a.x-b.x,a.y-b.y);
export function validate(c:Config):void{
  if(!c||!Array.isArray(c.bodies)||c.bodies.length!==3)throw Error('天体は3個必要です。');
  for(const b of c.bodies){
    if(!b||![b.m,b.x,b.y,b.vx,b.vy].every(Number.isFinite))throw Error('すべての入力に有限の数値が必要です。');
    if(b.m<1e-6||b.m>1000||Math.max(Math.abs(b.x),Math.abs(b.y))>10000||Math.max(Math.abs(b.vx),Math.abs(b.vy))>100)throw Error('質量10⁻⁶〜1000、座標±10000、速度±100の範囲で入力してください。');
  }
  if(![c.G,c.dt,c.epsilon].every(Number.isFinite)||c.G<.01||c.G>10||c.dt<.00001||c.dt>.01||c.epsilon<0||c.epsilon>.5)throw Error('Gは0.01〜10、Δtは0.00001〜0.01、εは0〜0.5です。');
  if(minDistance(c.bodies)<stopDistance(c))throw Error('初期天体が近すぎます。位置を離してください。');
}
export const stopDistance=(c:Config)=>c.epsilon===0?.001:.0001;
export function minDistance(b:Body[]):number{return Math.min(distance(b[0],b[1]),distance(b[0],b[2]),distance(b[1],b[2]));}
export function contribution(b:Body[],i:number,j:number,c:Config):Vec{
  const x=b[j].x-b[i].x,y=b[j].y-b[i].y,q=x*x+y*y+c.epsilon*c.epsilon;
  const f=c.G*b[j].m/(q*Math.sqrt(q));return {x:f*x,y:f*y};
}
export function acceleration(b:Body[],c:Config):Vec[]{
  const a=b.map(()=>({x:0,y:0}));
  // Paired updates preserve Newton's third law to roundoff, also for unequal masses.
  for(let i=0;i<3;i++)for(let j=i+1;j<3;j++){
    const x=b[j].x-b[i].x,y=b[j].y-b[i].y,q=x*x+y*y+c.epsilon*c.epsilon,f=c.G/(q*Math.sqrt(q));
    a[i].x+=b[j].m*f*x;a[i].y+=b[j].m*f*y;a[j].x-=b[i].m*f*x;a[j].y-=b[i].m*f*y;
  }return a;
}
export function invariants(b:Body[],c:Config){
  let kinetic=0,potential=0,L=0,mass=0;const P={x:0,y:0},R={x:0,y:0};
  for(let i=0;i<3;i++){const p=b[i];mass+=p.m;kinetic+=.5*p.m*(p.vx*p.vx+p.vy*p.vy);L+=p.m*(p.x*p.vy-p.y*p.vx);P.x+=p.m*p.vx;P.y+=p.m*p.vy;R.x+=p.m*p.x;R.y+=p.m*p.y;
    for(let j=i+1;j<3;j++)potential-=c.G*p.m*b[j].m/Math.hypot(p.x-b[j].x,p.y-b[j].y,c.epsilon);
  }R.x/=mass;R.y/=mass;return {kinetic,potential,E:kinetic+potential,L,P,R,V:{x:P.x/mass,y:P.y/mass},mass};
}
export function errors(p:Phase,c:Config){
  const now=invariants(p.bodies,c),initial=invariants(c.bodies,c);
  const energyScale=Math.max(initial.kinetic+Math.abs(initial.potential),1e-12);
  const momentumScale=Math.max(c.bodies.reduce((s,b)=>s+b.m*Math.hypot(b.vx,b.vy),0),Math.sqrt(initial.mass*energyScale),1e-12);
  const lengthScale=Math.max(...c.bodies.map(b=>distance(b,initial.R)),1e-6);
  return {energy:(now.E-initial.E)/energyScale,momentum:distance(now.P,initial.P)/momentumScale,angular:(now.L-initial.L)/(momentumScale*lengthScale),barycenter:Math.hypot(now.R.x-initial.R.x-initial.V.x*time(p,c),now.R.y-initial.R.y-initial.V.y*time(p,c)),energyScale,momentumScale,lengthScale};
}
export type StepResult={phase:Phase;reason:string|null};
export function verlet(p:Phase,c:Config):StepResult{
  const fail=(reason:string):StepResult=>({phase:p,reason});
  if(minDistance(p.bodies)<stopDistance(c))return fail('最小距離が停止距離未満です。衝突を合体や反発に置換せず停止しました。');
  for(let i=0;i<3;i++)for(let j=i+1;j<3;j++){
    const r=Math.hypot(distance(p.bodies[i],p.bodies[j]),c.epsilon);
    if(c.dt*Math.sqrt(c.G*(p.bodies[i].m+p.bodies[j].m)/(r*r*r))>.12)return fail('接近の時間尺度に対してΔtが大きすぎます。刻みを小さくして新しい実験を適用してください。');
  }
  const a=acceleration(p.bodies,c),dt=c.dt;
  const bodies=p.bodies.map((b,i)=>({...b,x:b.x+b.vx*dt+.5*a[i].x*dt*dt,y:b.y+b.vy*dt+.5*a[i].y*dt*dt}));
  // A swept chord guard catches a close fly-through whose endpoints are apart.
  for(let i=0;i<3;i++)for(let j=i+1;j<3;j++){
    const x=p.bodies[j].x-p.bodies[i].x,y=p.bodies[j].y-p.bodies[i].y,dx=bodies[j].x-bodies[i].x-x,dy=bodies[j].y-bodies[i].y-y;
    const s=Math.max(0,Math.min(1,-(x*dx+y*dy)/(dx*dx+dy*dy||1)));
    if(Math.hypot(x+s*dx,y+s*dy)<stopDistance(c))return fail('ステップ内で危険な近接を検出しました。直前の確定状態を保持します。');
  }
  const nextA=acceleration(bodies,c);
  bodies.forEach((b,i)=>{b.vx+=.5*(a[i].x+nextA[i].x)*dt;b.vy+=.5*(a[i].y+nextA[i].y)*dt;});
  if(!bodies.every(b=>[b.x,b.y,b.vx,b.vy].every(Number.isFinite)&&Math.max(Math.abs(b.x),Math.abs(b.y))<1e8))return fail('有限な計算範囲を超えるため停止しました。');
  return {phase:{bodies,steps:p.steps+1},reason:null};
}
export const initialPhase=(c:Config):Phase=>({bodies:clone(c.bodies),steps:0});
export function difference(a:Phase,b:Phase,c:Config){
  const ra=invariants(a.bodies,c).R,rb=invariants(b.bodies,c).R;
  const individual=a.bodies.map((p,i)=>distance(p,b.bodies[i]));
  return {individual,D:Math.hypot(...individual)/Math.sqrt(3),centered:Math.sqrt(a.bodies.reduce((s,p,i)=>s+(p.x-ra.x-b.bodies[i].x+rb.x)**2+(p.y-ra.y-b.bodies[i].y+rb.y)**2,0)/3)};
}
export const body=(m:number,x:number,y:number,vx=0,vy=0):Body=>({m,x,y,vx,vy});
export function triangle(masses=[1,1,1],side=2):Config{
  const points=[body(masses[0],0,side/Math.sqrt(3)),body(masses[1],-side/2,-side/(2*Math.sqrt(3))),body(masses[2],side/2,-side/(2*Math.sqrt(3)))];
  const c={bodies:points,G:1,dt:.001,epsilon:0},R=invariants(points,c).R,omega=Math.sqrt(masses.reduce((a,b)=>a+b,0)/side**3);
  points.forEach(b=>{b.x-=R.x;b.y-=R.y;b.vx=-omega*b.y;b.vy=omega*b.x;});return c;
}
export const presets:{name:string;note:string;config:Config}[]=[
  {name:'8の字の舞踏',note:'等質量の特殊な周期解。ε=0、周期約6.325914。丸めた初期値と有限刻みによる近似です。',config:{G:1,dt:.001,epsilon:0,bodies:[body(1,-.97000436,.24308753,.466203685,.43236573),body(1,.97000436,-.24308753,.466203685,.43236573),body(1,0,0,-.93240737,-.86473146)]}},
  {name:'正三角形の回転',note:'辺長s=2、等質量。ω²=G(m₁+m₂+m₃)/s³、vᵢ=ωJ(rᵢ−R)。等質量の解は摂動に対して不安定で、永久の剛体維持は数値保証しません。',config:triangle()},
  {name:'二重星と第三の天体',note:'間隔1の二重星と遠方の軽い第三天体。全3天体が動く近似的階層系です。',config:{G:1,dt:.001,epsilon:0,bodies:[body(1,-.5,0,0,-Math.SQRT1_2),body(1,.5,0,0,Math.SQRT1_2),body(.05,0,5,-Math.sqrt(2/5),0)]}},
  {name:'混沌の接近',note:'質量3・4・5の静止三角形からの複雑な接近。ε=0.15、Δt=0.000025の近似モデル。有限時間の差の増大だけでカオスを証明しません。',config:{G:1,dt:.000025,epsilon:.15,bodies:[body(3,1,3),body(4,-2,-1),body(5,1,-1)]}},
  {name:'逃走する天体',note:'二重星へ入射する第三天体の重力散乱。検証窓t=30で離脱傾向を確認。無限未来の証明ではありません。',config:{G:1,dt:.0001,epsilon:0,bodies:[body(1,-.5,0,0,-Math.SQRT1_2),body(1,.5,0,0,Math.SQRT1_2),body(.1,4,2,-.6,0)]}},
];
