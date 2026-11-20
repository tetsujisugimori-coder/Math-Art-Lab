import fs from 'node:fs';
import {performance} from 'node:perf_hooks';
import {threadId} from 'node:worker_threads';
export function record(file,event,extra={}) {
  const row={event,pid:process.pid,threadId,clock:'performance.now',at:performance.now(),cpu:process.cpuUsage(),...extra};
  fs.appendFileSync(file,JSON.stringify(row)+'\n');return row;
}
export function span(rows,start,end) {
  if(!Array.isArray(rows)||rows.some(x=>!x||typeof x!=='object'))return{status:'NOT_OBTAINED',reason:'MALFORMED'};
  const a=rows.filter(x=>x.event===start),b=rows.filter(x=>x.event===end);
  if(a.length!==1||b.length!==1)return{status:'NOT_OBTAINED',reason:'MISSING_OR_DUPLICATE'};
  const x=a[0],y=b[0];
  if([x,y].some(r=>!Number.isInteger(r.pid)||r.pid<=0||!Number.isInteger(r.threadId)||r.threadId<0||r.clock!=='performance.now')||x.pid!==y.pid||x.threadId!==y.threadId||x.clock!==y.clock)return{status:'NOT_OBTAINED',reason:'CLOCK_DOMAIN'};
  if(!Number.isFinite(x.at)||!Number.isFinite(y.at)||y.at<x.at)return{status:'FAIL',reason:'ORDER'};
  const cpuValid=['user','system'].every(k=>Number.isFinite(x.cpu?.[k])&&Number.isFinite(y.cpu?.[k])&&x.cpu[k]>=0&&y.cpu[k]>=x.cpu[k]);
  return{status:'OBSERVED',wallMs:y.at-x.at,cpuStatus:cpuValid?'OBSERVED':'NOT_OBTAINED',processCpuUs:cpuValid?{user:y.cpu.user-x.cpu.user,system:y.cpu.system-x.cpu.system}:null,scope:'Same-domain elapsed; aggregate process CPU. Calculation/assertion separation NOT_OBTAINED.'};
}
