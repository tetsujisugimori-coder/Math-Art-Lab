export const BLOOM_MS = 15_000;
export const MAX_DEPTH = 6;
export const MAX_CIRCLES = 1460;
export const MIN_RADIUS = 1e-8;

export type Bend = Readonly<{ k: number; u: number; v: number }>;
export type BloomCircle = Readonly<Bend & { x: number; y: number; radius: number; generation: number }>;
type Quad = readonly [Bend, Bend, Bend, Bend];

const axes = [0,1,2,3] as const;

export function reflect(bends: Quad, index: number): Bend {
  if (!Number.isInteger(index) || index < 0 || index >= 4) throw new RangeError('Invalid reflection index');
  const next = { k: 0, u: 0, v: 0 };
  for (const i of axes) for (const coordinate of ['k', 'u', 'v'] as const) {
    next[coordinate] += (i === index ? -1 : 2) * bends[i][coordinate];
  }
  return next;
}

function circle(bend: Bend, generation: number): BloomCircle {
  const {k, u, v} = bend;
  if (!Number.isFinite(k) || k === 0 || !Number.isFinite(u) || !Number.isFinite(v)) throw new RangeError('Nonfinite circle');
  const x = u/k, y = v/k, radius = Math.abs(1/k);
  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(radius) || radius <= 0) throw new RangeError('Invalid circle geometry');
  return {...bend, x, y, radius, generation};
}

function replace(bends: Quad, index: number, next: Bend): Quad {
  return [0,1,2,3].map(i => i === index ? next : bends[i]) as unknown as Quad;
}

const outer = {k:-1,u:0,v:0};
const triRadius = 2*Math.sqrt(3)-3;
const triBend = 1/triRadius;
const trio = (angle: number): Bend => ({k:triBend,u:triBend*(1-triRadius)*Math.cos(angle),v:triBend*(1-triRadius)*Math.sin(angle)});
const trinity: Quad = [outer,trio(-Math.PI/2),trio(Math.PI/6),trio(5*Math.PI/6)];
const jewel: Quad = [outer,{k:2,u:-1,v:0},{k:2,u:1,v:0},{k:3,u:0,v:2}];
const vortex = replace(jewel, 1, reflect(jewel,1));
const mandala = replace(trinity, 1, reflect(trinity,1));

export const bloomPresets = Object.freeze({
  trinity: { name:'三輪の花', note:'同じ大きさの三円が、三回対称に並びます。', seed:trinity, theme:'night' },
  vortex: { name:'花びらの渦', note:'大きな一輪の脇へ、異なる大きさの円が偏ります。渦は見た目の名前です。', seed:vortex, theme:'amber' },
  jewel: { name:'宝石箱', note:'二つの大円が上下の隙間を分け、細かな宝石の帯が伸びます。', seed:jewel, theme:'crystal' },
  mandala: { name:'静かな曼荼羅', note:'鏡映対称の種。大小を整えて静かな抜けを残します。', seed:mandala, theme:'sakura' },
} as const);
export type BloomPreset = keyof typeof bloomPresets;

const distance = (a: BloomCircle,b: BloomCircle) => Math.hypot(a.x-b.x,a.y-b.y);
// Relative to the normalized coordinate / radius scale, with a machine-roundoff factor.
const tolerance = (a: BloomCircle,b: BloomCircle) => 512*Number.EPSILON*Math.max(Math.abs(a.x),Math.abs(a.y),Math.abs(b.x),Math.abs(b.y),a.radius,b.radius);
export function tangent(a: BloomCircle,b: BloomCircle): boolean {
  return Math.abs(distance(a,b)-Math.abs(1/a.k+1/b.k)) <= tolerance(a,b);
}

export function buildBloom(seed: Quad, depth: number, limit=MAX_CIRCLES, minRadius=MIN_RADIUS) {
  if (!Number.isInteger(depth) || depth<0 || depth>MAX_DEPTH || !Number.isInteger(limit) || limit<4 || limit>MAX_CIRCLES
    || !Number.isFinite(minRadius) || minRadius<MIN_RADIUS || minRadius>1) throw new RangeError('Invalid generation limits');
  if (!Array.isArray(seed) || seed.length !== 4) throw new RangeError('Need four circles');
  const circles = seed.map(bend => circle(bend,0));
  const boundary = circles[0];
  if (boundary.k !== -1 || boundary.x !== 0 || boundary.y !== 0 || circles.slice(1).some(c => c.k <= 0 || c.radius >= boundary.radius)) {
    throw new RangeError('Seed must use a normalized enclosing circle and three proper interior circles');
  }
  for (let i=0;i<4;i++) for (let j=i+1;j<4;j++) if (!tangent(circles[i],circles[j])) throw new RangeError('Seed circles must be mutually tangent');

  type Work = {bends: Quad; rejected: number; generation: number};
  const queue: Work[] = [{bends:seed,rejected:-1,generation:1}];
  let duplicates=0, tooSmall=0;
  let stop: 'depth'|'count'|'exhausted' = 'exhausted';
  scan: for (let cursor=0;cursor<queue.length;cursor++) {
    const {bends,rejected,generation}=queue[cursor];
    if (generation > depth) { stop='depth'; break; }
    for (const i of axes) {
      if (i===rejected) continue; // An immediate repetition is exactly the previous circle.
      if (circles.length===limit) { stop='count'; break scan; }
      const bend=reflect(bends,i);
      const next=circle(bend,generation);
      if (next.k<=0) throw new RangeError('Unexpected non-interior replacement');
      if (next.radius < minRadius) { tooSmall++; continue; } // New circles in this outward-from-seed tree shrink in descendant gaps.
      if (distance(boundary,next)+next.radius-boundary.radius>tolerance(boundary,next)) throw new RangeError('Circle escaped the enclosing circle');
      if (axes.some(j=>j!==i && !tangent(next,circle(bends[j],0)))) throw new RangeError('Reflection lost required tangency');
      let duplicate=false;
      for (let j=1;j<circles.length;j++) {
        const old=circles[j], sum=next.radius+old.radius;
        const dx=next.x-old.x, dy=next.y-old.y, gapSquared=dx*dx+dy*dy;
        if (gapSquared>=sum*sum) continue;
        const eps=tolerance(next,old);
        if (gapSquared <= eps*eps && Math.abs(next.radius-old.radius) <= eps) { duplicate=true; break; }
        if (gapSquared < Math.max(0,sum-eps)**2) throw new RangeError('Interior circles overlap');
      }
      if (duplicate) { duplicates++; continue; }
      circles.push(next);
      queue.push({bends:replace(bends,i,bend),rejected:i,generation:generation+1});
    }
  }
  return {circles,duplicates,tooSmall,stop};
}

export function bloomFrame(elapsed: number, count: number) {
  const ms=Number.isFinite(elapsed)?Math.max(0,Math.min(BLOOM_MS,elapsed)):0;
  const progress = ms < 2000 ? 0 : ms < 5000 ? .065*(ms-2000)/3000
    : ms < 10000 ? .065+.49*(ms-5000)/5000 : ms < 14000 ? .555+.445*(ms-10000)/4000 : 1;
  return {ms, count:Math.min(count,4+Math.floor(progress*Math.max(0,count-4))), titleOpacity:Math.max(0,Math.min(1,(ms-14000)/1000))};
}
