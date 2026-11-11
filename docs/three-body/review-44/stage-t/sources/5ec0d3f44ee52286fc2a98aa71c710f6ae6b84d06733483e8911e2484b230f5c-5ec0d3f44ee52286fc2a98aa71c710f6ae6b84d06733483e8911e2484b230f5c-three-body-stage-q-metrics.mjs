import{distribution}from'./three-body-stage-p-analysis.mjs';
export const targets={scheduledP95:100,scheduledP99:200,scheduledMax:250,receiveStopMax:20,stopReceiptMax:100};
export function inputStatistics(requests){
 const pairs={scheduledToSend:['Tminus1','T0'],sendToReceive:['T0','T1'],scheduledToReceive:['Tminus1','T1']};
 return Object.fromEntries(Object.entries(pairs).map(([name,[a,b]])=>{const values=requests.map(r=>Number.isFinite(r[a])&&Number.isFinite(r[b])?r[b]-r[a]:NaN);return[name,{...distribution(values),missing:values.filter(x=>!Number.isFinite(x)).length,unit:'elapsed ms',status:values.some(Number.isFinite)?'OBSERVED':'NOT_TESTED'}];}));
}
export function performanceVerdict(stats,stop){
 const checks={scheduledP95:stats.scheduledToReceive.p95,scheduledP99:stats.scheduledToReceive.p99,scheduledMax:stats.scheduledToReceive.max,receiveStopMax:stop&&Number.isFinite(stop.T3)?stop.T3-stop.T1:null,stopReceiptMax:stop&&Number.isFinite(stop.T4)&&Number.isFinite(stop.T3)?stop.T4-stop.T3:null};
 const missing=Object.keys(checks).filter(k=>!Number.isFinite(checks[k])),failed=Object.keys(checks).filter(k=>Number.isFinite(checks[k])&&checks[k]>targets[k]);
 return{verdict:missing.length?'NOT_TESTED':failed.length?'PARTIAL':'PASS_OBSERVED_WINDOW',checks,targets,failed,missing,upperBoundGuaranteed:false};
}
export function clockBracket(samples){
 if(!samples.length)return{status:'NOT_TESTED'};
 const best=samples.reduce((a,b)=>b.high-b.low<a.high-a.low?b:a);
 return{status:'BRACKET',low:best.low,high:best.high,offset:(best.low+best.high)/2,halfWidth:(best.high-best.low)/2,precisionGuaranteed:false};
}
export function classifyArrival(span,at,uncertainty=0){return span&&span.end-span.begin>=50&&Number.isFinite(at)&&at>=span.begin+uncertainty&&at<=span.end-uncertainty?'HIT':'TARGET_MISS';}
