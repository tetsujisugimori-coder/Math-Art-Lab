import * as THREE from 'three';
import {knotFrame,TAU,torusPoint,type KnotGuide,type KnotSettings} from './knot';

export function createKnotGuide(pivot:THREE.Group,stage:HTMLElement){
 const group=new THREE.Group();pivot.add(group);
 function line(color:number,count:number){
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array(count*3),3));
  const line=new THREE.Line(geometry,new THREE.LineBasicMaterial({color,transparent:true,opacity:.85}));line.frustumCulled=false;group.add(line);return line;
 }
 const major=line(0x67e8f9,129),minor=line(0xf9d879,129),R=line(0x67e8f9,2),r=line(0xf9d879,2);
 const arrow=new THREE.ArrowHelper(new THREE.Vector3(0,1,0),new THREE.Vector3(),.4,0xf9d879,.12,.075);group.add(arrow);
 const marker=new THREE.Mesh(new THREE.SphereGeometry(.055,10,8),new THREE.MeshBasicMaterial({color:0xffffff}));group.add(marker);
 const labels=['O','C','P'].map(text=>{const el=document.createElement('span');el.className='knot-label';el.textContent=text;el.setAttribute('aria-hidden','true');stage.append(el);return el;});
 const projected=new THREE.Vector3(),direction=new THREE.Vector3();
 function points(line:THREE.Line,values:{x:number;y:number;z:number}[]){const attr=line.geometry.getAttribute('position') as THREE.BufferAttribute;values.forEach((p,i)=>attr.setXYZ(i,p.x,p.y,p.z));attr.needsUpdate=true;}
 return{
  update(s:KnotSettings,t:number,id:KnotGuide|null,camera:THREE.Camera,width:number,height:number){
   group.visible=!!id;labels.forEach(el=>el.hidden=!id);if(!id)return;
   const f=knotFrame(s,t),u=s.p*t,v=s.q*t,cu=Math.cos(u),su=Math.sin(u),origin={x:0,y:0,z:0};
   const majorPoints=[],minorPoints=[];
   for(let i=0;i<=128;i++){const a=i/128*TAU;majorPoints.push({x:s.R*Math.cos(a),y:s.R*Math.sin(a),z:0});minorPoints.push(torusPoint(s,u,a));}
   points(major,majorPoints);points(minor,minorPoints);points(R,[origin,f.center]);points(r,[f.center,f.point]);
   const around=id==='major'||id==='p',across=id==='minor'||id==='q';
   major.visible=around||id==='R'||across;minor.visible=across||id==='r';R.visible=around||id==='R';r.visible=across||id==='r';
   marker.position.copy(f.center);
   if(around){arrow.position.copy(f.center);direction.set(-su,cu,0);arrow.setLength(.4,.12,.075);arrow.setColor(0x67e8f9);}
   else if(across){arrow.position.copy(f.point);direction.set(-Math.sin(v)*cu,-Math.sin(v)*su,Math.cos(v));arrow.setLength(.4,.12,.075);arrow.setColor(0xf9d879);}
   else {arrow.position.copy(id==='R'?origin:f.center);direction.copy(id==='R'?f.center:f.point).sub(arrow.position);arrow.setLength(direction.length(),Math.min(.12,direction.length()*.2),Math.min(.075,direction.length()*.15));arrow.setColor(id==='R'?0x67e8f9:0xf9d879);}
   arrow.setDirection(direction.normalize());
   group.updateWorldMatrix(true,true);
   [origin,f.center,f.point].forEach((p,i)=>{projected.copy(p);pivot.localToWorld(projected);projected.project(camera);labels[i].hidden=projected.z>1||projected.z< -1;labels[i].style.left=`${(projected.x+1)*width/2+9}px`;labels[i].style.top=`${(1-projected.y)*height/2-10}px`;});
  },
  dispose(){labels.forEach(el=>el.remove());group.removeFromParent();group.traverse(object=>{const drawable=object as THREE.Mesh;drawable.geometry?.dispose();if(drawable.material)for(const material of Array.isArray(drawable.material)?drawable.material:[drawable.material])material.dispose();});},
 };
}
