import * as THREE from 'three';
import {knotFrame,TAU,torusPoint,type KnotSettings} from './knot';

export const KNOT_SIDES=8;
/** Rings are centered on the evaluated curve, never on an interpolated spline. */
export function knotTube(s:KnotSettings,segments:number,halo=false){
 const positions=new Float32Array((segments+1)*KNOT_SIDES*3),colors=new Float32Array(positions.length),indices:number[]=[];
 const radius=Math.min(.035,s.r*.04,(s.R-s.r)*.04)*(halo?1.8:1);
 const normal=new THREE.Vector3(),tangent=new THREE.Vector3(),binormal=new THREE.Vector3(),color=new THREE.Color();
 const palette=['#50bfe9','#b0f4fa','#fff2c3','#efb55f'].map(c=>new THREE.Color(c));
 for(let i=0;i<=segments;i++){
  const frame=knotFrame(s,i/segments*TAU),fraction=i/segments*(palette.length-1),a=Math.min(palette.length-2,Math.floor(fraction));
  normal.copy(frame.normal);tangent.copy(frame.tangent).normalize();binormal.crossVectors(tangent,normal).normalize();
  color.copy(palette[a]).lerp(palette[a+1],fraction-a);
  for(let j=0;j<KNOT_SIDES;j++){
   const angle=j/KNOT_SIDES*TAU,c=Math.cos(angle),v=Math.sin(angle),index=(i*KNOT_SIDES+j)*3,shade=.68+.32*(1+c)/2;
   positions.set([frame.point.x+radius*(normal.x*c+binormal.x*v),frame.point.y+radius*(normal.y*c+binormal.y*v),frame.point.z+radius*(normal.z*c+binormal.z*v)],index);
   colors.set([color.r*shade,color.g*shade,color.b*shade],index);
   if(i<segments){const b=i*KNOT_SIDES+j,n=i*KNOT_SIDES+(j+1)%KNOT_SIDES;indices.push(b,n,b+KNOT_SIDES,n,n+KNOT_SIDES,b+KNOT_SIDES);}
  }
 }
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));geometry.setIndex(indices);return geometry;
}
export function knotTorus(s:KnotSettings){
 const major=128,minor=48,positions:number[]=[],indices:number[]=[];
 for(let i=0;i<=major;i++)for(let j=0;j<=minor;j++){const p=torusPoint(s,i/major*TAU,j/minor*TAU);positions.push(p.x,p.y,p.z);if(i<major&&j<minor){const a=i*(minor+1)+j,b=a+minor+1;indices.push(a,b,a+1,b,b+1,a+1);}}
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setIndex(indices);return geometry;
}
