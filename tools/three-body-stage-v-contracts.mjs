import {captureParameters,timedRequest,stoppedFrame,observeCleanup} from './three-body-stage-u-contracts.mjs';
export {captureParameters,timedRequest,stoppedFrame,observeCleanup};
export const baseline='9779cdb796eac3dab00f0ac73561cdf33be3ccdf';
export const sources=['tools/three-body-stage-v.mjs','tools/three-body-stage-v-contracts.mjs','tools/three-body-stage-v-trace.mjs','tools/three-body-stage-v-audit.mjs','tools/three-body-stage-u-fixture.mjs','tools/three-body-stage-u-contracts.mjs','tools/three-body-stage-q-browser.mjs','tools/three-body-stage-q-capture.mjs','tools/three-body-stage-p-analysis.mjs'];
export function plans(){
 const primary=[['default',false],['readback',true],['default',true],['readback',false],['readback',false],['default',true],['readback',true],['default',false]];
 const counts={};const rows=primary.map(([context,trace],i)=>{const key=context+trace,repeat=counts[key]=(counts[key]??0)+1;return{id:`v-p${i+1}-${context}-${trace?'on':'off'}`,kind:'capture',context,trace,readback:false,repeat};});
 const auxiliary=[['default',true],['readback',true],['default',false],['default',false],['readback',true],['default',true]],a={};
 for(const [i,[context,marked]] of auxiliary.entries()){const key=context+marked,repeat=a[key]=(a[key]??0)+1;rows.push({id:`v-a${i+1}-${context}-${marked?'marked':'unmarked'}`,kind:'readback',context,trace:true,readback:true,marked,repeat});}
 return rows;
}
export const traceCategories=['toplevel','devtools','devtools.timeline','disabled-by-default-devtools.timeline','disabled-by-default-devtools.protocol','blink.user_timing','v8','disabled-by-default-v8.gc','cc','gpu','viz','skia','renderer.scheduler','sequence_manager','ipc','disabled-by-default-ipc.flow'];
export const traceParameters={transferMode:'ReturnAsStream',streamFormat:'json',streamCompression:'gzip',tracingBackend:'chrome',bufferUsageReportingInterval:1000,traceConfig:{recordMode:'recordContinuously',traceBufferSizeInKb:65536,enableSampling:false,enableSystrace:false,includedCategories:traceCategories}};
export function auxiliaryExpression(plan){
 function handler(id,marked){
  const q=globalThis.__stageQ;q.vPixels=[];q.vJournal=marked?[]:null;
  const mark=label=>{if(marked){const name=id+'/'+label;performance.mark(name);q.vJournal.push({label,pageMono:performance.now(),clock:'page performance.now ms'});}};
  mark('handler-start');let calls=0;
  try{for(const [i,cv] of [...document.querySelectorAll('#canvases canvas')].entries()){mark('before-getImageData-'+i);const data=cv.getContext('2d').getImageData(0,0,cv.width,cv.height).data;calls++;q.vPixels.push(data);mark('after-getImageData-'+i);}mark('handler-return');return{calls,bytes:q.vPixels.map(p=>p.byteLength),journal:q.vJournal};}
  catch(error){mark('handler-exception');throw error;}
 }
 return `(${handler.toString()})(${JSON.stringify(plan.id)},${JSON.stringify(plan.marked)})`;
}
export const parametersFor=plan=>plan.kind==='capture'?structuredClone(captureParameters):{expression:auxiliaryExpression(plan),returnByValue:true,awaitPromise:true};
export const methodFor=plan=>plan.kind==='capture'?'Page.captureScreenshot':'Runtime.evaluate';
// Additional harness-only boundaries. A late observation never changes the deadline result.
export function observeSend(send,record,{now=()=>performance.now(),phase=()=>null}={}){
 return(method,params)=>{record.sendInvoked=now();record.sendPhase=phase();record.clock='harness performance.now ms';record.wireTransmission='NOT_OBTAINED';const reject=error=>{record.responseAt=now();record.responsePhase=phase();record.responseKind='PROTOCOL_REJECTION';record.error={name:error.name,message:error.message};throw error;};try{return Promise.resolve(send(method,params)).then(result=>{record.responseAt=now();record.responsePhase=phase();record.responseKind='PROTOCOL_REPLY';record.result=result;return result;},reject);}catch(error){return Promise.reject(error).catch(reject);}};
}
export function counts(runs,subset=()=>true){const r=runs.filter(subset);return{planned:r.length,completed:r.filter(r=>r.finishedUTC).length,failed:r.filter(r=>r.finishedUTC&&r.status!=='PASS').length,unexecuted:r.filter(r=>!r.finishedUTC).length};}
export function completeness(runs,structuralValid){const done=runs.length===14&&runs.every(r=>r.finishedUTC),capture=runs.filter(r=>r.kind==='capture'),aux=runs.filter(r=>r.kind==='readback');return{allTrialsCompleted:done,recordsVerified:structuralValid,primaryRequestsAcquired:done&&capture.length===8&&capture.every(r=>r.requestStatus==='PASS'),auxiliaryRepliesAcquired:done&&aux.length===6&&aux.every(r=>r.requestStatus==='PASS'),traceEvidenceComplete:done&&runs.filter(r=>r.trace).every(r=>r.traceStatus==='ACQUIRED'),acceptance:done&&structuralValid&&runs.every(r=>r.status==='PASS')?'ACCEPTED_OBSERVED_DIAGNOSTIC_WINDOW':'NOT_ACCEPTED',productPerformance:'NOT_TESTED'};}
