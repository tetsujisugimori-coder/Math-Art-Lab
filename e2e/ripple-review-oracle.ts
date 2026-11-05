import type {Page} from '@playwright/test';

// Fixed before collecting RED. Independent of ripple.ts/ripple-render.ts.
export const COLOR_TOLERANCE=4, GEOMETRY_TOLERANCE=1e-8;
export const anchors=[0,1/32,1/8,1/4,1/2,3/4,1];
export const angles=[90,-90,0,180,-180];
export type ReviewMode='displacement'|'envelope'|'intensity';
export type ReviewPalette='aurora'|'iris'|'gold';
export const palettes:ReviewPalette[]=['aurora','iris','gold'];
export const modes:ReviewMode[]=['displacement','envelope','intensity'];
export function legendQ(column:number,width:number,mode:ReviewMode) {
  if(mode!=='displacement')return column/(width-1);
  const leftZero=Math.floor((width-1)/2),rightZero=Math.ceil((width-1)/2);
  return column<=leftZero?column/leftZero-1:(column-rightZero)/(width-1-rightZero);
}
export function expectedColor(q:number,mode:ReviewMode,palette:ReviewPalette):number[] {
  const bg=[4,8,20];
  if(mode==='displacement'){const end=q<0?[65,195,255]:[255,192,105],f=Math.abs(q)**.65;return bg.map((v,j)=>Math.round(v+(end[j]-v)*f));}
  const colors={aurora:[bg,[19,26,85],[69,58,169],[38,155,202],[111,241,224],[255,243,197]],iris:[bg,[36,16,69],[104,45,149],[209,79,166],[252,157,189],[255,239,218]],gold:[bg,[15,31,69],[31,96,139],[158,137,94],[243,200,115],[255,248,215]]}[palette];
  const p=Math.pow(q,mode==='intensity'?.4:.7)*5,i=Math.min(4,Math.floor(p)),f=p-i;
  return colors[i].map((v,j)=>Math.round(v+(colors[i+1][j]-v)*f));
}
export async function setReviewSettings(page:Page,values:Record<string,number>) {
  await page.locator('#rk-settings').evaluate((form:HTMLFormElement,values)=>{for(const [key,value] of Object.entries(values))(form.elements.namedItem(key) as HTMLInputElement).value=String(value);form.requestSubmit();},values);
}
export async function setReviewDisplay(page:Page,mode:ReviewMode,palette:ReviewPalette) {
  await page.evaluate(({mode,palette})=>{for(const [id,value] of [['rk-mode',mode],['rk-palette',palette]]){const el=document.getElementById(id) as HTMLSelectElement;el.value=value;el.dispatchEvent(new Event('change'));}},{mode,palette});
}
export async function measureRotation(page:Page,angle:number,radius=2.2) {
  const data=await page.locator('#rk-guides').evaluate(svg=>{
    const guide=svg.querySelector('[data-guide="angle"]')!,arc=guide.querySelector('polyline'),p=(arc as SVGPolylineElement|null)?.points;
    const domPoints=p?Array.from({length:p.numberOfItems},(_,j)=>{const v=p.getItem(j);return [v.x,v.y];}):[];
    const points=(arc?.getAttribute('points')?.trim().split(/\s+/).map(pair=>pair.split(',').map(Number)))??[];
    const source=svg.querySelector('[data-source="0"]') as SVGGElement;
    const matrix=source.transform.baseVal.consolidate()!.matrix;
    const text=guide.querySelector('text') as SVGGraphicsElement,b=text.getBBox();
    return {points,domPoints,marker:arc?.getAttribute('marker-end')??'',markerOrient:svg.querySelector('marker')?.getAttribute('orient'),label:text.textContent??'',labelBox:{x:b.x,y:b.y,width:b.width,height:b.height},source:[matrix.e,matrix.f],copy:document.querySelector('#rk-symbol-copy')!.textContent??''};
  });
  const a=angle*Math.PI/180,expectedSource=[200+40*radius*Math.cos(a),200-40*radius*Math.sin(a)],expectedEnd=[200+36*Math.cos(a),200-36*Math.sin(a)];
  const distance=(p:number[],q:number[])=>Math.hypot(p[0]-q[0],p[1]-q[1]);
  const sourceError=distance(data.source,expectedSource),geometryFailures:string[]=[],explanationFailures:string[]=[];
  if(angle===0){if(data.marker)geometryFailures.push('zero has an arrow');if(data.points.some(p=>distance(p,[236,200])>GEOMETRY_TOLERANCE))geometryFailures.push('zero arc has length');}
  else {
    if(data.points.length<2)geometryFailures.push('missing arc');
    else {
      if(distance(data.points[0],[236,200])>GEOMETRY_TOLERANCE)geometryFailures.push('wrong start');
      if(distance(data.points.at(-1)!,expectedEnd)>GEOMETRY_TOLERANCE)geometryFailures.push('wrong endpoint');
      if(data.points.some(p=>Math.abs(distance(p,[200,200])-36)>GEOMETRY_TOLERANCE))geometryFailures.push('wrong radius');
      for(let j=1;j<data.points.length;j++){const p=data.points[j-1],q=data.points[j],cross=(p[0]-200)*(q[1]-200)-(p[1]-200)*(q[0]-200);if(cross*Math.sign(angle)>=0)geometryFailures.push('wrong SVG progression');}
    }
    if(!data.marker||!data.markerOrient?.startsWith('auto'))geometryFailures.push('missing tangent arrow');
  }
  const direction=angle>0?'反時計回り':angle<0?'時計回り':'回転なし',glyph=angle>0?'↺':angle<0?'↻':'回転なし';
  if(!data.label.includes(String(angle))||!data.label.includes(glyph))explanationFailures.push('label contradicts angle');
  if(!data.copy.includes(direction)||(angle<0&&data.copy.includes('反時計回り'))||(angle===0&&(data.copy.includes('反時計回り')||data.copy.includes('時計回り'))))explanationFailures.push('Japanese explanation contradicts angle');
  const corners=[[data.labelBox.x,data.labelBox.y],[data.labelBox.x+data.labelBox.width,data.labelBox.y],[data.labelBox.x,data.labelBox.y+data.labelBox.height],[data.labelBox.x+data.labelBox.width,data.labelBox.y+data.labelBox.height]];
  const labelVisible=corners.every(p=>distance(p,[200,200])<194);
  const domProjectionError=Math.max(0,...data.points.flatMap((p,i)=>p.map((v,j)=>Math.min(Math.abs(data.domPoints[i][j]-v),Math.abs(data.domPoints[i][j]-Math.fround(v))))));
  if(domProjectionError>2*Number.EPSILON*400)geometryFailures.push('DOM points differ from serialized geometry beyond native rounding');
  return {angle,...data,expectedSource,expectedEnd,sourceError,sourcePass:sourceError<=GEOMETRY_TOLERANCE,geometryFailures,explanationFailures,labelVisible,domProjectionError};
}
/** Decode the composited screenshot, rather than reading the product's backing buffer. */
export async function measureLegend(page:Page,mode:ReviewMode,palette:ReviewPalette,capture:'clip'|'element'='clip') {
  const bar=page.locator('#rk-scale');
  if(capture==='element')await bar.scrollIntoViewIfNeeded();
  else await bar.evaluate(el=>el.scrollIntoView({block:'center',inline:'nearest',behavior:'instant'}));
  const border=await bar.evaluate(el=>{const s=getComputedStyle(el);return {left:parseFloat(s.borderLeftWidth),right:parseFloat(s.borderRightWidth),dpr:devicePixelRatio};});
  const rect=(await bar.boundingBox())!;
  const png=capture==='element'?await bar.screenshot({scale:'device'}):await page.screenshot({clip:rect,scale:'device'}),qs=mode==='displacement'?[...anchors.slice(1).reverse().map(q=>-q),...anchors]:anchors;
  const data=await page.evaluate(async({base64,border,qs})=>{
    const img=new Image();img.src='data:image/png;base64,'+base64;await img.decode();
    const c=document.createElement('canvas');c.width=img.naturalWidth;c.height=img.naturalHeight;const ctx=c.getContext('2d')!;ctx.drawImage(img,0,0);
    const left=Math.round(border.left*border.dpr),right=c.width-1-Math.round(border.right*border.dpr);
    const samples=qs.map(q=>{const f=qs[0]<0?(q+1)/2:q,x=left+Math.round(f*(right-left)),y=Math.floor(c.height/2);return {q,x,y,rgba:Array.from(ctx.getImageData(x,y,1,1).data)};});
    const row=ctx.getImageData(left,Math.floor(c.height/2),right-left+1,1).data,profile=Array.from(row);
    const profileHash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',row))).map(v=>v.toString(16).padStart(2,'0')).join('');
    return {width:c.width,height:c.height,left,right,samples,profile,profileHash};
  },{base64:png.toString('base64'),border,qs});
  const samples=data.samples.map(v=>{const expected=expectedColor(v.q,mode,palette),error=expected.map((c,j)=>Math.abs(c-v.rgba[j]));return {...v,expected,error,maxError:Math.max(...error),pass:Math.max(...error)<=COLOR_TOLERANCE&&v.rgba[3]===255};});
  let profileMaxError=0,profileWorst:{column:number;q:number;expected:number[];actual:number[]}|null=null;
  for(let x=0;x<=data.right-data.left;x++){const q=legendQ(x,data.right-data.left+1,mode),expected=expectedColor(q,mode,palette),actual=data.profile.slice(4*x,4*x+4),error=Math.max(...expected.map((v,j)=>Math.abs(v-actual[j])));if(error>profileMaxError){profileMaxError=error;profileWorst={column:x,q,expected,actual};}}
  return {mode,palette,capture,width:data.width,height:data.height,profileHash:data.profileHash,samples,maxError:Math.max(...samples.map(v=>v.maxError)),profileMaxError,profileWorst,pass:samples.every(v=>v.pass)&&profileMaxError<=COLOR_TOLERANCE,png};
}
