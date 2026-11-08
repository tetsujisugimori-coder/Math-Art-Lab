/** Independent RK4 oracle: ordered all-pairs forces, flat phase vector.
 * Deliberately does not import production gravity, Verlet, or invariants. */
import type {Body,Config} from '../src/three-body';
export function reference(c:Config,T:number,h=.0001):Body[]{
  const masses=c.bodies.map(b=>b.m);let y=c.bodies.flatMap(b=>[b.x,b.y,b.vx,b.vy]);
  const rhs=(z:number[])=>{
    const out=new Array<number>(12).fill(0);
    for(let i=0;i<3;i++){
      out[4*i]=z[4*i+2];out[4*i+1]=z[4*i+3];
      for(let j=0;j<3;j++)if(j!==i){const dx=z[4*j]-z[4*i],dy=z[4*j+1]-z[4*i+1],d=Math.sqrt(dx*dx+dy*dy+c.epsilon*c.epsilon),factor=c.G*masses[j]/d**3;out[4*i+2]+=factor*dx;out[4*i+3]+=factor*dy;}
    }return out;
  };
  const n=Math.ceil(T/h),dt=T/n;
  for(let step=0;step<n;step++){
    const k1=rhs(y),k2=rhs(y.map((v,i)=>v+dt*k1[i]/2)),k3=rhs(y.map((v,i)=>v+dt*k2[i]/2)),k4=rhs(y.map((v,i)=>v+dt*k3[i]));
    y=y.map((v,i)=>v+dt*(k1[i]+2*k2[i]+2*k3[i]+k4[i])/6);
  }
  return masses.map((m,i)=>({m,x:y[4*i],y:y[4*i+1],vx:y[4*i+2],vy:y[4*i+3]}));
}
