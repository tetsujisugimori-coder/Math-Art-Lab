import * as THREE from 'three';
import {axes,type Axis,type Trajectory} from './harmonograph';

/** Orthogonal coordinate projection, in the exact same model frame as the artwork. */
export function projectToAxis(point:readonly number[],axis:Axis):[number,number,number]{
 const projected:[number,number,number]=[0,0,0];const i=axes.indexOf(axis);projected[i]=point[i];return projected;
}
export function createHarmonographGuide(group:THREE.Group,stage:HTMLElement,onClear:()=>void,onBack:()=>void){
 const guide=new THREE.Group();guide.visible=false;group.add(guide);
 const axisPositions=new Float32Array(18);
 for(let i=0;i<3;i++){axisPositions[i*6+i]=-2.6;axisPositions[i*6+3+i]=2.6;}
 const axisGeometry=new THREE.BufferGeometry();axisGeometry.setAttribute('position',new THREE.BufferAttribute(axisPositions,3));
 guide.add(new THREE.LineSegments(axisGeometry,new THREE.LineBasicMaterial({color:0x50647d,transparent:true,opacity:.6})));
 const positions=new THREE.BufferAttribute(new Float32Array(6),3),geometry=new THREE.BufferGeometry();geometry.setAttribute('position',positions);
 guide.add(new THREE.Line(geometry,new THREE.LineBasicMaterial({color:0xf9d879,depthTest:false})));
 const connectorPositions=new THREE.BufferAttribute(new Float32Array(6),3),connectorDistances=new THREE.BufferAttribute(new Float32Array(2),1),connectorGeometry=new THREE.BufferGeometry();connectorGeometry.setAttribute('position',connectorPositions);connectorGeometry.setAttribute('lineDistance',connectorDistances);
 const connector=new THREE.Line(connectorGeometry,new THREE.LineDashedMaterial({color:0xd4e4f4,dashSize:.045,gapSize:.04,transparent:true,opacity:.8,depthTest:false}));guide.add(connector);
 const marker=new THREE.Mesh(new THREE.SphereGeometry(.035,10,8),new THREE.MeshBasicMaterial({color:0xf9d879,depthTest:false}));guide.add(marker);
 const labels=axes.map(axis=>{const label=document.createElement('span');label.className='axis-label';label.textContent=axis.toUpperCase();label.setAttribute('aria-hidden','true');label.hidden=true;stage.append(label);return label;});
 const panel=document.createElement('div');panel.className='visual-caption harm-guide';panel.hidden=true;
 panel.innerHTML=`<strong></strong><p class="guide-explanation"></p><p class="guide-value"></p><svg viewBox="0 0 360 120" role="img"><path class="plot-baseline" d="M36 14V94H346M36 54H346"/><path class="plot-curve"/><circle r="3" class="plot-cursor"/><text x="36" y="113">0</text><text class="plot-end" x="310" y="113"></text><text class="plot-high" x="0" y="22"></text><text class="plot-low" x="0" y="94"></text></svg><p>横軸 t（s）／縦軸は選んだ座標。全時間範囲の標本を間引いて表示。点は現在の描画先端です。</p><button class="guide-clear">解説を解除</button><button class="guide-back">選択中の数式へ</button>`;
 panel.querySelector<HTMLButtonElement>('.guide-clear')!.onclick=onClear;panel.querySelector<HTMLButtonElement>('.guide-back')!.onclick=onBack;stage.after(panel);
 let selected:Axis|null=null,trajectory:Trajectory,extent=1;
 return{
  panel,
  set(axis:Axis|null,data:Trajectory){
   selected=axis;trajectory=data;guide.visible=!!axis;panel.hidden=!axis;labels.forEach(l=>l.hidden=!axis);
   stage.dataset.axis=axis??'';if(!axis)return;
   panel.querySelector('strong')!.textContent=`${axis}(t) と図の対応`;
   panel.querySelector('.guide-explanation')!.textContent=`白い光点Pを ${axis.toUpperCase()} 軸へ直角に投影した点が黄色の点Qです。原点からQまでが ${axis}(t)。破線はPとQの対応であり、軌跡の追加ではありません。`;
   const a=axes.indexOf(axis);extent=0;for(let i=0;i<data.count;i++)extent=Math.max(extent,Math.abs(data.positions[i*3+a]));extent=Math.max(extent,.001);
   const indices=Array.from({length:Math.min(1601,data.count)},(_,i)=>Math.round(i*(data.count-1)/(Math.min(1601,data.count)-1)));
   panel.querySelector('.plot-curve')!.setAttribute('d',indices.map((index,i)=>`${i?'L':'M'}${(36+index/(data.count-1)*310).toFixed(2)},${(54-data.positions[index*3+a]/extent*40).toFixed(2)}`).join(''));
   panel.querySelector('svg')!.setAttribute('aria-label',`${axis}(t)の時間グラフ、0から${data.duration}秒。値の範囲は約±${extent.toFixed(2)}。`);
   panel.querySelector('.plot-end')!.textContent=`${data.duration}s`;panel.querySelector('.plot-high')!.textContent=extent.toFixed(1);panel.querySelector('.plot-low')!.textContent=(-extent).toFixed(1);
  },
  update(index:number,camera:THREE.Camera){
   if(!selected)return;
   const p=Array.from(trajectory.positions.subarray(index*3,index*3+3)),q=projectToAxis(p,selected),a=axes.indexOf(selected);
   positions.setXYZ(0,0,0,0);positions.setXYZ(1,...q);positions.needsUpdate=true;geometry.computeBoundingSphere();
   connectorPositions.setXYZ(0,...q);connectorPositions.setXYZ(1,p[0],p[1],p[2]);connectorPositions.needsUpdate=true;connectorGeometry.computeBoundingSphere();connectorDistances.setX(1,Math.hypot(p[0]-q[0],p[1]-q[1],p[2]-q[2]));connectorDistances.needsUpdate=true;marker.position.set(...q);
   const t=index/(trajectory.count-1)*trajectory.duration;
   panel.querySelector('.guide-value')!.textContent=`t=${t.toFixed(2)} s、P=(${p.map(n=>n.toFixed(3)).join(', ')})、${selected}(t)=${p[a].toFixed(3)}。`;
   const cursor=panel.querySelector('.plot-cursor')!;cursor.setAttribute('cx',String(36+index/(trajectory.count-1)*310));cursor.setAttribute('cy',String(54-p[a]/extent*40));
   labels.forEach((label,i)=>{const v=new THREE.Vector3();v.setComponent(i,2.7);v.applyMatrix4(group.matrixWorld).project(camera);label.style.left=`${(v.x+1)*stage.clientWidth/2}px`;label.style.top=`${(1-v.y)*stage.clientHeight/2}px`;});
  },
 };
}
