import {panView,screenToComplex,type Complex,type PlaneView} from './twins';

type Point={x:number;y:number};
export type PlaneBounds={left:number;top:number;width:number;height:number};
/** Pointer bookkeeping for one twins plane. Views always come from the applied state. */
export class TwinsGesture {
 private pointers=new Map<number,Point>();
 private drag:{origin:Point;view:PlaneView}|null=null;
 private pinch:{distance:number;view:PlaneView;anchor:Complex}|null=null;
 private canTap=false;
 reset(){this.pointers.clear();this.drag=null;this.pinch=null;this.canTap=false;}
 private rebase(view:PlaneView,bounds:PlaneBounds){
  this.drag=null;this.pinch=null;
  const [a,b]=Array.from(this.pointers.values());
  if(b){
   this.pinch={distance:Math.hypot(a.x-b.x,a.y-b.y),view:structuredClone(view),anchor:screenToComplex(view,((a.x+b.x)/2-bounds.left)/bounds.width,((a.y+b.y)/2-bounds.top)/bounds.height,bounds.width/bounds.height)};
  }else if(a)this.drag={origin:{...a},view:structuredClone(view)};
 }
 down(id:number,point:Point,view:PlaneView,bounds:PlaneBounds){
  if(this.pointers.has(id))return;
  this.pointers.set(id,point);this.canTap=this.pointers.size===1;this.rebase(view,bounds);
 }
 move(id:number,point:Point,bounds:PlaneBounds):PlaneView|null{
  if(!this.pointers.has(id))return null;
  this.pointers.set(id,point);
  if(this.pinch){
   const [a,b]=Array.from(this.pointers.values()),distance=Math.hypot(a.x-b.x,a.y-b.y);
   if(distance<1||this.pinch.distance<1)return null;
   const u=((a.x+b.x)/2-bounds.left)/bounds.width,v=((a.y+b.y)/2-bounds.top)/bounds.height,span=this.pinch.view.span*this.pinch.distance/distance;
   return{span,center:{re:this.pinch.anchor.re-(u-.5)*span,im:this.pinch.anchor.im-(.5-v)*span/(bounds.width/bounds.height)}};
  }
  if(this.drag){
   const dx=point.x-this.drag.origin.x,dy=point.y-this.drag.origin.y;
   if(Math.hypot(dx,dy)>6)this.canTap=false;
   if(!this.canTap)return panView(this.drag.view,dx,dy,bounds.width);
  }
  return null;
 }
 end(id:number,point:Point,view:PlaneView,bounds:PlaneBounds,allowTap:boolean):Point|null{
  if(!this.pointers.has(id))return null; // Includes the lostcapture following an already handled up.
  const tap=allowTap&&this.canTap&&this.pointers.size===1&&this.drag&&Math.hypot(point.x-this.drag.origin.x,point.y-this.drag.origin.y)<=6;
  this.pointers.delete(id);this.canTap=false;
  this.rebase(view,bounds); // A surviving finger starts moving from the current, accepted view.
  return tap?point:null;
 }
}
