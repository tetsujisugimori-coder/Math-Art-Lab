import {describe,it,expect} from 'vitest';
import {AREA_TOL,clipHalfPlane,distance,lloyd,observe,polygonMetrics,preset,validateSites,voronoi,type Site} from './voronoi';
const sites=(points:number[][]):Site[]=>points.map(([x,y],i)=>({id:i+1,x,y}));
const close=(actual:number,expected:number,tolerance=1e-12)=>expect(Math.abs(actual-expected)).toBeLessThanOrEqual(tolerance);
const square=[{x:0,y:0},{x:1,y:0},{x:1,y:1},{x:0,y:1}];

describe('Voronoi geometry: hand-calculated references',()=>{
 it('one point owns the unit square, regardless of its position',()=>{
  for(const p of [[.5,.5],[0,0],[1,1],[.1,.8]]){const [c]=voronoi(sites([p]));expect(c.polygon).toEqual(square);close(c.area,1);expect(c.centroid).toEqual({x:.5,y:.5});}
 });
 it('two horizontal sites split at x=.5 with known areas and centroids',()=>{
  const cs=voronoi(sites([[.25,.5],[.75,.5]]));
  cs.forEach((c,i)=>{close(c.area,.5);close(c.centroid.x,i?.75:.25);close(c.centroid.y,.5);expect(c.polygon.every(p=>i?p.x>=.5:p.x<=.5)).toBe(true);});
 });
 it('diagonal bisector x+y=1 gives two triangles with centroids 1/3 and 2/3',()=>{
  const cs=voronoi(sites([[0,0],[1,1]]));cs.forEach((c,i)=>{close(c.area,.5);close(c.centroid.x,i?2/3:1/3);close(c.centroid.y,i?2/3:1/3);});
 });
 it('three collinear sites give widths 3/8,1/4,3/8',()=>{
  const cs=voronoi(sites([[.25,.5],[.5,.5],[.75,.5]]));[3/8,1/4,3/8].forEach((area,i)=>close(cs[i].area,area));[3/16,.5,13/16].forEach((x,i)=>close(cs[i].centroid.x,x));
 });
 it('four corner sites have square quadrants and exact centers',()=>{
  const cs=voronoi(sites([[0,0],[1,0],[1,1],[0,1]]));cs.forEach((c,i)=>{close(c.area,.25);close(c.centroid.x,[.25,.75,.75,.25][i]);close(c.centroid.y,[.25,.25,.75,.75][i]);});
 });
 it('a boundary belongs to both nearest cells; display tie uses smallest ID',()=>{
  const ps=sites([[.25,.5],[.75,.5]]);const result=observe([...ps].reverse(),{x:.5,y:.17});expect(result.nearest).toEqual([1,2]);expect(result.displayOwner).toBe(1);
  expect(observe(ps,{x:.49,y:.17}).nearest).toEqual([1]);
 });
 it('four-way equidistance and display-only numerical tolerance are explicit',()=>{
  expect(observe(sites([[0,0],[1,0],[1,1],[0,1]]),{x:.5,y:.5}).nearest).toEqual([1,2,3,4]);
  expect(observe(sites([[.25,.5],[.75,.5]]),{x:.5+1e-13,y:.5}).nearest).toEqual([1,2]);
 });
 it('half-plane clipping retains only the rectangle interior and exact intersections',()=>{
  const poly=clipHalfPlane(square,{x:1,y:0},{x:.3,y:2});expect(poly).toEqual([{x:0,y:0},{x:.3,y:0},{x:.30000000000000004,y:1},{x:0,y:1}]);close(polygonMetrics(poly).area,.3);
  expect(clipHalfPlane(square,{x:1,y:0},{x:-1,y:0})).toEqual([]);
 });
 it('trapezoid centroid is area weighted, not the average of vertices',()=>{
  // Bases 4 and 2, height 2: area=6, centroid=(14/9,8/9).
  const polygon=[{x:0,y:0},{x:4,y:0},{x:2,y:2},{x:0,y:2}],m=polygonMetrics(polygon);
  close(m.area,6);close(m.centroid.x,14/9);close(m.centroid.y,8/9);expect(m.centroid.x).not.toBe(1.5);
  expect(polygonMetrics([...polygon].reverse())).toEqual(m);
 });
 it('tiny translated triangles retain a finite centroid',()=>{
  const m=polygonMetrics([{x:1,y:1},{x:1-1e-6,y:1},{x:1,y:1-1e-6}]);close(m.area,5e-13,1e-21);close(m.centroid.x,1-1e-6/3);close(m.centroid.y,1-1e-6/3);
 });
 it('degenerate polygons and nonfinite vertices are rejected',()=>{
  for(const p of [[],[{x:0,y:0},{x:1,y:1},{x:2,y:2}],[{x:NaN,y:0},...square]])expect(()=>polygonMetrics(p)).toThrow();
 });
});

describe('numerical validation and independent distance oracle',()=>{
 it('rejects exact duplicates, too-close sites, duplicate IDs and invalid coordinates',()=>{
  for(const ps of [sites([[.5,.5],[.5,.5]]),sites([[0,0],[1e-8,0]]),sites([[-.01,0]]),sites([[1.01,0]]),sites([[NaN,.5]]),sites([[.5,Infinity]]),[{id:1,x:0,y:0},{id:1,x:1,y:1}],[]])expect(()=>voronoi(ps)).toThrow();
  expect(()=>validateSites(sites([[0,0]]),NaN)).toThrow();expect(()=>voronoi(sites(Array.from({length:65},(_,i)=>[i/65,.5])))).toThrow();
 });
 it('very near sites and tiny corner cells remain finite with total area 1',()=>{
  for(const ps of [sites([[.5,.5],[.5000011,.5],[.5,.5000011]]),sites([[0,0],[1.1e-6,0],[0,1.1e-6],[1,1]])]){
   const cs=voronoi(ps);close(cs.reduce((sum,c)=>sum+c.area,0),1,AREA_TOL);for(const c of cs){expect(c.area).toBeGreaterThan(0);expect(Number.isFinite(c.area)).toBe(true);expect(c.centroid.x).toBeGreaterThanOrEqual(0);expect(c.centroid.y).toBeLessThanOrEqual(1);}
  }
 });
 it('all computed vertices satisfy all independent squared-distance inequalities',()=>{
  for(const id of ['basic','irregular','grid','cluster'] as const){const ps=preset(id),cs=voronoi(ps);
   for(const cell of cs)for(const v of [...cell.polygon,cell.centroid])for(const other of ps){
    const a=(v.x-cell.site.x)**2+(v.y-cell.site.y)**2,b=(v.x-other.x)**2+(v.y-other.y)**2;expect(a-b).toBeLessThanOrEqual(1e-12);
    expect(v.x).toBeGreaterThanOrEqual(0);expect(v.x).toBeLessThanOrEqual(1);expect(v.y).toBeGreaterThanOrEqual(0);expect(v.y).toBeLessThanOrEqual(1);
   }
   close(cs.reduce((sum,c)=>sum+c.area,0),1,AREA_TOL);
  }
 });
 it('an independent raster integration approximates areas and centroids',()=>{
  const ps=sites([[.1,.2],[.7,.15],[.3,.8]]),cs=voronoi(ps),count=300,acc=ps.map(()=>({n:0,x:0,y:0}));
  for(let ix=0;ix<count;ix++)for(let iy=0;iy<count;iy++){
   const x=(ix+.5)/count,y=(iy+.5)/count;let best=Infinity,index=0;ps.forEach((p,i)=>{const d=(x-p.x)**2+(y-p.y)**2;if(d<best){best=d;index=i;}});acc[index].n++;acc[index].x+=x;acc[index].y+=y;
  }
  cs.forEach((c,i)=>{close(c.area,acc[i].n/count**2,.003);close(c.centroid.x,acc[i].x/acc[i].n,.003);close(c.centroid.y,acc[i].y/acc[i].n,.003);});
 });
 it('64 boundary and interior sites partition the square deterministically',()=>{
  const ps=sites(Array.from({length:64},(_,i)=>[(i%8)/7,Math.floor(i/8)/7]));const cs=voronoi(ps);expect(voronoi(ps)).toEqual(cs);close(cs.reduce((sum,c)=>sum+c.area,0),1,AREA_TOL);
 });
});

describe('Lloyd simultaneous updates',()=>{
 it('known asymmetric two-site update uses original cells for both sites',()=>{
  // Original split is (.1+.5)/2=.3; new x coordinates are .15 and .65.
  const ps=sites([[.1,.4],[.5,.4]]),before=structuredClone(ps),next=lloyd(ps);close(next.sites[0].x,.15);close(next.sites[1].x,.65);next.sites.forEach(p=>close(p.y,.5));expect(ps).toEqual(before);
 });
 it('permuting input order preserves results by stable ID',()=>{
  const ps=preset('irregular'),a=lloyd(ps),b=lloyd([...ps].reverse());expect([...a.sites].sort((p,q)=>p.id-q.id)).toEqual([...b.sites].sort((p,q)=>p.id-q.id));
 });
 it('a regular grid is stationary to roundoff',()=>{const ps=preset('grid'),next=lloyd(ps);expect(next.maxMove).toBeLessThan(1e-14);ps.forEach((p,i)=>close(distance(p,next.sites[i]),0));});
 it('100 finite updates preserve IDs, positive areas, bounds and area sum',()=>{
  let ps=preset('cluster');for(let i=0;i<100;i++){ps=lloyd(ps).sites;const cs=voronoi(ps);close(cs.reduce((sum,c)=>sum+c.area,0),1,AREA_TOL);expect(cs.every(c=>c.area>0)).toBe(true);}expect(ps.map(p=>p.id)).toEqual(Array.from({length:24},(_,i)=>i+1));
 });
});
