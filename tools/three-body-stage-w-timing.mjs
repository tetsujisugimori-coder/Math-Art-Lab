// Diagnostic-only protocol timing. No product entry imports this module.
export const timingContract='stage-w-timing-1';
export function measuredRequest(send,method,params,identity,observation,{now=()=>performance.now(),timeoutMs=5000,phase=()=> 'MEASURED_REQUEST',setTimer=setTimeout,clearTimer=clearTimeout}={}){
 const wrapperStartedAt=now();Object.assign(observation,{contract:timingContract,wrapperStartedAt,sendInvokedAt:null,deadlineAt:null,deadlineObservedAt:null,callbackObservedAt:null,normalReplyAt:null,lateCallbackAt:null,responseKind:'NOT_OBTAINED',responsePhase:'NOT_OBTAINED',wireTransmission:'NOT_OBTAINED',clock:'harness performance.now ms'});
 return new Promise(resolve=>{let settled=false,timer;
  const finish=(status,at,extra={})=>{if(settled)return;settled=true;clearTimer(timer);if(status==='TIMEOUT')observation.deadlineObservedAt=at;resolve({...identity,method,params,wrapperStartedAt,start:observation.sendInvokedAt,response:status==='PASS'?observation.normalReplyAt:null,finished:at,elapsed:at-observation.sendInvokedAt,timeoutMs,clock:observation.clock,status,...extra});};
  const deadline=()=>{const at=now();if(at<observation.deadlineAt){timer=setTimer(deadline,Math.max(1,observation.deadlineAt-at));return;}finish('TIMEOUT',at,{error:{name:'TimeoutError',message:`${method} timeout ${timeoutMs}ms`}});};
  const callback=(kind,value)=>{const at=now(),late=settled||at>observation.deadlineAt,current=phase();Object.assign(observation,{callbackObservedAt:at,responseKind:kind,responsePhase:current==='BROWSER_CLEANUP'?'BROWSER_CLEANUP':late?'POST_DEADLINE':'MEASURED_REQUEST'});
   if(late){observation.lateCallbackAt=at;if(kind==='PROTOCOL_REPLY')observation.result=value;else observation.error={name:value.name,message:value.message};if(!settled)finish('TIMEOUT',at,{error:{name:'TimeoutError',message:`${method} reply after ${timeoutMs}ms deadline`}});return;}
   if(kind==='PROTOCOL_REPLY'){observation.normalReplyAt=at;observation.result=value;finish('PASS',at,{result:value});}
   else{observation.error={name:value.name,message:value.message,stack:value.stack};finish('PROTOCOL_ERROR',at,{error:observation.error});}
  };
  queueMicrotask(()=>{observation.sendInvokedAt=now();observation.deadlineAt=observation.sendInvokedAt+timeoutMs;timer=setTimer(deadline,timeoutMs);try{Promise.resolve(send(method,params)).then(v=>callback('PROTOCOL_REPLY',v),e=>callback('PROTOCOL_REJECTION',e));}catch(error){callback('PROTOCOL_REJECTION',error);}});
 });
}
export function timingOf(request,observation){
 if(observation?.contract!==timingContract)return{contract:'LEGACY_NOT_RECONSTRUCTED',T0:null,T1:null,T2:null,T3:null,T4:null,T0Status:'NOT_OBTAINED_ACTUAL_SEND',wrapperStartedAt:request?.start??null,lateCallbackAt:null,deadlineObservedAt:null,responseKind:'NOT_OBTAINED',responsePhase:'NOT_OBTAINED',scope:'Original legacy timing is retained separately, not retrospectively inferred'};
 return{contract:timingContract,T0:observation.sendInvokedAt,T1:null,T2:null,T3:null,T4:request?.status==='PASS'&&observation.responseKind==='PROTOCOL_REPLY'&&observation.normalReplyAt!==null?observation.normalReplyAt:null,wrapperStartedAt:observation.wrapperStartedAt,deadlineAt:observation.deadlineAt,deadlineObservedAt:observation.deadlineObservedAt,callbackObservedAt:observation.callbackObservedAt,lateCallbackAt:observation.lateCallbackAt,responseKind:observation.responseKind,responsePhase:observation.responsePhase,T1toT3Status:'NOT_OBTAINED',clockT0T4:'harness performance.now ms',transportScope:'send invocation and normal within-deadline resolve callback, not exact wire or browser processing'};
}
export function auditTiming(r){
 const errors=[],q=r.request,t=r.timestamps??{},o=r.transport;
 if([t.T1,t.T2,t.T3].some(v=>v!==null))errors.push('FABRICATED_INTERNAL_ENDPOINT');
 if(o?.contract!==timingContract){const eligible=q?.status==='PASS'&&Number.isFinite(q.response)&&q.response>=q.start&&q.response-q.start<=5000&&o?.responseKind!=='PROTOCOL_REJECTION';if(t.T4!==(eligible?(o?.responseAt??q.response):null))errors.push('LEGACY_T4_NOT_NORMAL_WITHIN_DEADLINE');return{status:errors.length?'FAIL':'UNKNOWN',errors,legacy:true,actualSend:'NOT_OBTAINED_UNLESS_ORIGINAL_TRANSPORT_RECORDED',scope:'No missing legacy times inferred'};}
 if(JSON.stringify(t)!==JSON.stringify(timingOf(q,o)))errors.push('TIMING_FIELDS_DIFFER');
 if(!Number.isFinite(o.wrapperStartedAt)||!Number.isFinite(o.sendInvokedAt)||o.sendInvokedAt<o.wrapperStartedAt||o.deadlineAt!==o.sendInvokedAt+5000||q.start!==o.sendInvokedAt||q.wrapperStartedAt!==o.wrapperStartedAt)errors.push('INVALID_SEND_WRAPPER_DEADLINE');
 if(q.status==='PASS'&&(o.responseKind!=='PROTOCOL_REPLY'||o.responsePhase!=='MEASURED_REQUEST'||t.T4!==q.response||t.T4<q.start||t.T4>o.deadlineAt||o.deadlineObservedAt!==null||o.lateCallbackAt!==null))errors.push('INVALID_WITHIN_DEADLINE_REPLY');
 if(q.status!=='PASS'&&(q.response!==null||t.T4!==null||o.normalReplyAt!==null))errors.push('FAILURE_HAS_T4');
 if(q.status==='TIMEOUT'&&(!Number.isFinite(o.deadlineObservedAt)||o.deadlineObservedAt<o.deadlineAt||q.finished!==o.deadlineObservedAt))errors.push('INVALID_TIMEOUT_OBSERVATION');
 if(o.lateCallbackAt!==null&&(o.lateCallbackAt!==o.callbackObservedAt||o.responsePhase==='MEASURED_REQUEST'||o.deadlineObservedAt===null||o.lateCallbackAt<o.deadlineObservedAt))errors.push('INVALID_LATE_CALLBACK');
 if(o.responseKind==='NOT_OBTAINED'&&(o.callbackObservedAt!==null||o.responsePhase!=='NOT_OBTAINED'||o.lateCallbackAt!==null))errors.push('FABRICATED_CALLBACK');
 if(o.responseKind!=='NOT_OBTAINED'&&!Number.isFinite(o.callbackObservedAt))errors.push('CALLBACK_TIME_MISSING');
 return{status:errors.length?'FAIL':'PASS',errors,legacy:false};
}
