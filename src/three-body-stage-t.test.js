import {describe,it,expect} from 'vitest';
import {stageTPlans} from '../tools/three-body-stage-t-plans.mjs';
describe('Stage T bounded one-factor controls',()=>{
 it('preserves ABBA order, identical fixed dimensions and explicit diagnostic scopes',()=>{
  const plans=stageTPlans('chromium');expect(plans['t-controls']).toHaveLength(45);expect(plans['t-capture']).toHaveLength(64);
  for(const name of ['t-controls','t-capture']){
   const groups=Map.groupBy(plans[name].filter(p=>p.factor!=='app-anchor'),p=>p.factor);
   for(const rows of groups.values()){
    expect(rows.map(r=>r.order)).toEqual([0,1,2,3]);
    const semantic=r=>JSON.stringify(Object.fromEntries(Object.entries(r).filter(([k])=>!['order','repeat','name'].includes(k))));
    expect(semantic(rows[0])).toBe(semantic(rows[3]));expect(semantic(rows[1])).toBe(semantic(rows[2]));
    expect(rows.every(r=>r.width===438&&r.height===330&&r.count===2)).toBe(true);
   }
  }
 });
 it('does not plan unsupported CDP captures on WebKit or treat resource release as pixel equality',()=>{
  const p=stageTPlans('webkit');expect(p['t-capture']).toHaveLength(40);
  expect(p['t-capture'].some(r=>r.captureApi?.startsWith('cdp'))).toBe(false);
  expect(p['t-capture'].filter(r=>r.releaseResources).every(r=>r.pixelCheck===false)).toBe(true);
 });
 it('keeps the actual app anchors separate from synthetic frame counters',()=>{
  const anchors=stageTPlans('chromium')['t-controls'].filter(r=>!r.mini);expect(anchors).toHaveLength(9);
  expect(anchors.every(r=>r.source==='sender'&&r.target==='paint'&&r.duration===6000)).toBe(true);
 });
});
