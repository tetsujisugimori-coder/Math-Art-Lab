import {expect,it} from 'vitest';
import {seriesPath} from './segregation-render';
it('uses step coordinates, percent scale and gaps for missing values',()=>{
  const h=[{step:8,satisfaction:0,adjacency:null},{step:9,satisfaction:1,adjacency:0.5},{step:10,satisfaction:null,adjacency:null},{step:11,satisfaction:0.5,adjacency:0}];
  expect(seriesPath(h,'satisfaction',360)).toBe('M44.00,160.00 L144.00,18.00 M344.00,89.00');
  expect(seriesPath(h,'adjacency',360)).toBe('M144.00,89.00 M344.00,160.00');
});
