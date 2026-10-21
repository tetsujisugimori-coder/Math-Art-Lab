export type Vec3={x:number;y:number;z:number};
export type Branch={start:Vec3;end:Vec3;distance:number};
export type Params={depth:number;angle:number;shrink:number;amplitude:number;wavelength:number;speed:number};
export const defaults:Params={depth:8,angle:0.48,shrink:0.72,amplitude:0.22,wavelength:4.5,speed:1};
export function generateTree(p:Params):Branch[]{
 const branches:Branch[]=[];
 function grow(start:Vec3,heading:number,length:number,remaining:number,distance:number):void{
  if(remaining<=0)return;
  const end={x:start.x+Math.cos(heading)*length,y:start.y+Math.sin(heading)*length,z:0};
  branches.push({start,end,distance});
  grow(end,heading+p.angle,length*p.shrink,remaining-1,distance+length);
  grow(end,heading-p.angle,length*p.shrink,remaining-1,distance+length);
 }
 grow({x:0,y:-2.4,z:0},Math.PI/2,1.15,p.depth,0);return branches;
}
export function deform(point:Vec3,distance:number,time:number,p:Params):Vec3{
 const phase=2*Math.PI*distance/p.wavelength-time*p.speed;
 const envelope=1-Math.exp(-distance*.8);
 return{x:point.x+p.amplitude*envelope*Math.sin(phase),y:point.y,z:point.z+p.amplitude*.5*envelope*Math.cos(phase)};
}
export function sampleTree(branches:Branch[],time:number,p:Params):Float32Array{
 const values=new Float32Array(branches.length*6);
 branches.forEach((b,i)=>{
  const a=deform(b.start,b.distance,time,p);
  const length=Math.hypot(b.end.x-b.start.x,b.end.y-b.start.y,b.end.z-b.start.z);
  const c=deform(b.end,b.distance+length,time,p);
  values.set([a.x,a.y,a.z,c.x,c.y,c.z],i*6);
 });return values;
}
