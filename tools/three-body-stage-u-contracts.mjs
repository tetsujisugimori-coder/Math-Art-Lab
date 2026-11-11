export const sourceFiles=['tools/three-body-stage-u.mjs','tools/three-body-stage-u-contracts.mjs','tools/three-body-stage-u-fixture.mjs','tools/three-body-stage-u-audit.mjs','tools/three-body-stage-q-browser.mjs','tools/three-body-stage-q-capture.mjs'];
// Fixed primary CDP plan. No exploratory or adaptive cases.
export const captureParameters=Object.freeze({format:'png',fromSurface:true,clip:Object.freeze({x:0,y:0,width:1280,height:900,scale:1}),captureBeyondViewport:false});
export function stageUPlans(){
 const plans=[];
 for(const context of ['default','readback'])for(let block=0;block<4;block++)for(const operation of block%2?['C','B','A']:['A','B','C']){
  plans.push({id:`u-${String(plans.length+1).padStart(3,'0')}-${context}-${operation}-${block}`,context,operation,block,readback:block===1||block===2,repeat:block<2?0:1});
 }
 return plans;
}
export const methodsFor=operation=>operation==='A'?['Page.getLayoutMetrics']:operation==='B'?['Page.captureScreenshot']:operation==='C'?['Page.getLayoutMetrics','Page.captureScreenshot']:(()=>{throw Error('Unknown operation');})();
export async function timedRequest(send,method,params,identity,{now=()=>performance.now(),timeoutMs=5000}={}){
 const start=now(),base={...identity,method,params,start,clock:'harness performance.now ms',timeoutMs,wireRequestId:'NOT_EXPOSED_BY_PUBLIC_PLAYWRIGHT_API'};
 let timer;
 const reply=Promise.resolve().then(()=>send(method,params)).then(result=>{
  const response=now();return{...base,response,finished:response,elapsed:response-start,status:response-start>timeoutMs?'TIMEOUT':'PASS',result,lateReply:response-start>timeoutMs};
 },error=>{const response=now();return{...base,response,finished:response,elapsed:response-start,status:'PROTOCOL_ERROR',error:{name:error.name,message:error.message,stack:error.stack}};});
 try{return await Promise.race([reply,new Promise(resolve=>{timer=setTimeout(()=>{const finished=now();resolve({...base,response:null,finished,elapsed:finished-start,status:'TIMEOUT',error:{name:'TimeoutError',message:`${method} timeout ${timeoutMs}ms`},lateReply:'NOT_TESTED_AFTER_DEADLINE'});},timeoutMs);})]);}
 finally{clearTimeout(timer);}
}
export async function executeOperation(send,operation,session,options={}){
 const methods=methodsFor(operation),requests=[];let gap=null;
 for(const [i,method] of methods.entries()){
  const previous=requests.at(-1);if(previous&&previous.status!=='PASS')return{operation,status:'FAIL',requests,captureStatus:'NOT_TESTED_BLOCKED_BY_LAYOUT',gap:null};
  const record=await timedRequest(send,method,method==='Page.getLayoutMetrics'?{}:structuredClone(captureParameters),{session,requestId:session.logicalId+'/request-'+(i+1)},options);
  if(previous)gap=record.start-previous.response;requests.push(record);
 }
 return{operation,status:requests.every(r=>r.status==='PASS')?'PASS':'FAIL',requests,gap,captureStatus:operation==='A'?'NOT_REQUESTED':requests.find(r=>r.method==='Page.captureScreenshot')?.status??'NOT_TESTED'};
}
export function stoppedFrame(state){return !!state&&state.step===30&&state.bStep===30&&state.a==='30'&&state.b==='30'&&state.observed==='30'&&!state.playing&&!state.timer&&!state.raf;}
export async function observeCleanup(close,{now=()=>performance.now(),budgetMs=5000,graceMs=10000}={}){
 const begin=now();let timer;
 const completion=Promise.resolve().then(close).then(()=>({closed:true,closedAt:now()}),error=>({closed:false,error:String(error),closedAt:now()}));
 const wait=ms=>new Promise(resolve=>{timer=setTimeout(()=>resolve(null),ms);});
 let result=await Promise.race([completion,wait(budgetMs)]);clearTimeout(timer);
 const exceeded=!result||result.closedAt-begin>budgetMs;
 if(!result){result=await Promise.race([completion,wait(graceMs)]);clearTimeout(timer);}
 return{begin,budgetMs,graceMs,budgetExceeded:exceeded,closed:result?.closed??false,closedAt:result?.closedAt??null,finished:now(),error:result?.error??null,status:exceeded||!result?.closed?'FAIL':'PASS'};
}
