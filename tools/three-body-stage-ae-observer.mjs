import {performance} from 'node:perf_hooks';import {threadId} from 'node:worker_threads';
export function stamp(){return{at:performance.now(),pid:process.pid,tid:threadId,clock:'performance.now',cpu:process.cpuUsage(),thread:typeof process.threadCpuUsage==='function'?process.threadCpuUsage():null};}
export function interval(a,b){
 if(!a||!b||[a,b].some(x=>!Number.isInteger(x.pid)||x.pid<=0||!Number.isInteger(x.tid)||x.tid<0||x.clock!=='performance.now')||a.pid!==b.pid||a.tid!==b.tid||a.clock!==b.clock)return{status:'FAIL',reason:'DOMAIN'};
 if(!Number.isFinite(a.at)||!Number.isFinite(b.at)||a.at>b.at)return{status:'FAIL',reason:'ORDER'};
 const cpu=k=>['user','system'].every(n=>Number.isFinite(a[k]?.[n])&&Number.isFinite(b[k]?.[n])&&a[k][n]>=0&&b[k][n]>=a[k][n])?{status:'OBSERVED',user:b[k].user-a[k].user,system:b[k].system-a[k].system}:{status:'NOT_OBTAINED'};
 return{status:'OBSERVED',wallMs:b.at-a.at,cpu:cpu('cpu'),thread:cpu('thread')};
}
export function meter(on,clock=stamp){const rows={};return{rows,call(name,fn){const r=rows[name]??={calls:0,wallMs:0,cpuUs:0,threadUs:0,observed:0,threadObserved:0};r.calls++;if(!on)return fn();const a=clock();try{return fn();}finally{const b=clock(),d=interval(a,b);if(d.status!=='OBSERVED'||d.cpu.status!=='OBSERVED')throw Error('CLOCK_OR_CPU');r.observed++;r.wallMs+=d.wallMs;r.cpuUs+=d.cpu.user+d.cpu.system;if(d.thread.status==='OBSERVED'){r.threadObserved++;if(r.threadUs!==null)r.threadUs+=d.thread.user+d.thread.system;}else r.threadUs=null;}}};}
export function assessRun(exitCode,errors){return{executionStatus:exitCode===0?'PASS':Number.isInteger(exitCode)?'FAIL':'NOT_OBTAINED',observationStatus:errors.length?'FAIL':'PASS',acceptance:exitCode!==0?'FAIL':errors.length?'PARTIAL':'PASS',continueAllowed:exitCode===0&&!errors.length};}
export function schedule(plans,run,save){let stop=false;const rows=[];for(const p of plans){if(stop)rows.push({...p,executionStatus:'BLOCKED',acceptance:'BLOCKED'});else{try{const r=run(p);rows.push({...p,...r});stop=!r.continueAllowed;}catch(e){rows.push({...p,executionStatus:'NOT_OBTAINED',acceptance:'PARTIAL',error:String(e)});stop=true;}}save(structuredClone(rows));}return rows;}
