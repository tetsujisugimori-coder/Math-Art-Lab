import {isDeepStrictEqual as equal} from 'node:util';
import {digest} from './three-body-stage-ah-contract.mjs';
export const revision='ai-design-1';
export const limits=Object.freeze({originalMs:5000,parentMs:30000,totalMs:90000,slots:2,retry:0,replacement:0,reorder:false,graceMs:0});
export const faults=['normal','runner-fail-zero','fail-monitor','fail-save','timeout-before','timeout-during','timeout-after','end-missing','body-throw','duplicate','reverse','domain','pid-reuse','foreign-trial','stale-reply','worker-silent','parent-silent','monitor-failed','stop-send-failed','exit-missing','save-interrupted','capacity','receipt','buffer','communication','stop-refused'];
export const identityKeys=['session','incarnation','parentIncarnation','role','pid','trial','head','tree','planSha','sourceSha','channel','peer','clockDomain'];
export const components=['worker-observer','parent-collector','independent-monitor','verified-stop','classification'];
export const expectedStates=['PASS / COMPLETE synthetic only','FAIL; exit0 contradiction','FAIL / observation FAIL','FAIL / evidence incomplete','BEFORE_BODY_BEGIN','BETWEEN_BODY_BEGIN_AND_END','AFTER_BODY_END','completion UNKNOWN','FAIL; throw evidence','INVALID evidence','INVALID evidence','INVALID domain','REJECT identity','REJECT trial','REJECT incarnation/sequence','BLOCKED; stop request only','BLOCKED; independent monitor required','BLOCKED; guarantee NONE if hung','SEND_FAILED; exit NOT_OBTAINED','UNCONFIRMED; BLOCKED','FAILED; raw missing','FAILED; stop independent','INCOMPLETE; BLOCKED','FAIL; remaining BLOCKED','FAIL; remaining BLOCKED','REJECTED; exit unknown'];
export function validateDesign(d){
  const errors=[];const check=(ok,id)=>{if(!ok)errors.push(id);};
  check(d?.revision===revision&&d?.state==='PLAN_ONLY'&&d?.executionAuthorized===false&&d?.runtime==='NOT_TESTED','STATE');
  check(d?.pr===44&&d?.branch==='feat/017-three-body-dance','TARGET');
  check(equal(d?.limits,limits)&&equal(d?.order,['ah-O1:OFF','ah-O2:ON']),'AH_LIMITS');
  check(equal(d?.identityKeys,identityKeys)&&d?.pidAloneAuthorizes===false,'IDENTITY');
  check(d?.crossProcessSubtract===false&&d?.missingAsZero===false&&d?.residualAllocation===false&&d?.sumIntervalsToTotal===false,'CLOCK');
  check(d?.monitorOutsideJob===true&&d?.monitorHangGuarantee==='NONE'&&d?.storageBlocksStop===false&&d?.remainingAfterFailure==='BLOCKED','LIVENESS');
  check(d?.components?.length===components.length&&components.every(id=>{const c=d.components.find(c=>c.id===id);return c&&['input','output','actor','location','permissions','lifetime','failure','plannedFile'].every(k=>typeof c[k]==='string'&&c[k].length>8)&&c.implementation==='NOT_IMPLEMENTED';}),'RESPONSIBILITIES');
  check(d?.acceptance?.length===faults.length&&faults.every((fault,i)=>{const r=d.acceptance[i];return r?.id===`AI-${String(i+1).padStart(2,'0')}`&&r.fault===fault&&r.expected===expectedStates[i]&&r.method==='SYNTHETIC_ONLY'&&r.physical==='NOT_TESTED'&&r.unmet==='BLOCKED'&&['component','expected','raw','criterion'].every(k=>typeof r[k]==='string'&&r[k].length>5);}),'ACCEPTANCE');
  check(equal(d?.qualification?.order,['normal','worker-silent','parent-silent','monitor-failed','stop-send-failed','exit-missing','save-interrupted','pid-reuse'])&&d.qualification.slots===8&&d.qualification.authorized===false&&d.qualification.executed===0&&d.qualification.budgetMs===90000&&d.qualification.stopOnFirstFailure===true&&d.qualification.retry===0,'QUALIFICATION');
  check(d?.dependencies?.node==='v24.20.0'&&d.dependencies.vitest==='3.2.7'&&d.dependencies.os==='win32 10.0.26300 x64'&&d.dependencies.physicalValidation==='NOT_TESTED','DEPENDENCIES');
  return {status:errors.length?'DESIGN_INVALID':'DESIGN_VALID',errors,allowed:false,runtime:'NOT_TESTED'};
}
export const executionGate=()=>({allowed:false,status:'BLOCKED',approval:'APPROVAL_MISSING',decision:'HOLD',runtime:'NOT_TESTED'});
// Pure synthetic state reducer. No transports, timers, process handles or callbacks.
export function reduceTrace(enrolled,events){
  const s={stop:'NOT_REQUESTED',exit:'NOT_OBTAINED',resources:'NOT_OBTAINED',storage:'NOT_STARTED',remaining:'NOT_STARTED',failure:false,errors:[],lateEvidence:[],execution:'UNKNOWN',observation:'PASS',evidence:'EVIDENCE_INCOMPLETE',physical:'NOT_TESTED'};
  let seq=-1,at=-1;const seen=new Set();
  const reject=code=>{s.errors.push(code);s.failure=true;s.observation='FAIL';s.remaining='BLOCKED';};
  if(!enrolled||identityKeys.some(k=>k==='pid'? !Number.isInteger(enrolled[k])||enrolled[k]<=0:typeof enrolled[k]!=='string'||!enrolled[k].trim())||!['worker','parent','coordinator','monitor'].includes(enrolled.role)||!['head','tree'].every(k=>/^[a-f0-9]{40}$/.test(enrolled[k]))||!['planSha','sourceSha'].every(k=>/^[a-f0-9]{64}$/.test(enrolled[k]))){reject('IDENTITY_MISSING');return s;}
  for(const e of events??[]){
    if(e.synthetic!==true||identityKeys.some(k=>!equal(e.identity?.[k],enrolled[k]))){reject('IDENTITY_OR_DOMAIN');continue;}
    if(!Number.isFinite(e.at)||e.at<0||!Number.isInteger(e.seq)||e.seq<=seq||e.at<at||seen.has(e.id)){reject('ORDER_OR_DUPLICATE');continue;}
    seq=e.seq;at=e.at;seen.add(e.id);
    switch(e.type){
      case 'runner.fail':s.execution='FAIL';s.failure=true;s.remaining='BLOCKED';break;
      case 'runner.pass':if(s.execution!=='FAIL')s.execution='PASS';break;
      case 'stop.request':if(s.stop!=='NOT_REQUESTED'){reject('STOP_ORDER');break;}s.stop='REQUESTED';break;
      case 'stop.sent':if(s.stop!=='REQUESTED'){reject('STOP_ORDER');break;}s.stop='SENT';break;
      case 'stop.ack':if(s.stop!=='SENT'){reject('STOP_ORDER');break;}s.stop='ACKED';break;
      case 'stop.send-failed':case 'stop.refused':s.stop=e.type==='stop.refused'?'REJECTED':'SEND_FAILED';reject(e.type);break;
      case 'exit.confirmed':if(s.exit==='UNCONFIRMED'){s.lateEvidence.push(e);break;}s.exit='CONFIRMED';break;
      case 'exit.missing':s.exit='UNCONFIRMED';reject('EXIT_NOT_CONFIRMED');break;
      case 'resources.released':if(s.exit!=='CONFIRMED'){reject('RELEASE_BEFORE_EXIT');break;}s.resources='RELEASED';break;
      case 'save.begin':if(s.storage!=='NOT_STARTED'){reject('SAVE_ORDER');break;}s.storage='WRITING';break;
      case 'save.commit':if(s.storage!=='WRITING'||!Array.isArray(e.raw)||e.raw.length!==2||!equal(e.raw.map(r=>r.name).sort(),['clock','result'])||e.raw.some(r=>typeof r.base64!=='string'||Buffer.from(r.base64,'base64').length!==r.bytes||digest(Buffer.from(r.base64,'base64'))!==r.sha256)||!equal(e.receipt,e.raw)){reject('RECEIPT_OR_RAW');s.storage='INCOMPLETE';break;}s.storage='COMMITTED';s.evidence='SYNTHETIC_COMPLETE';break;
      case 'save.failed':s.storage='FAILED';s.evidence='EVIDENCE_INCOMPLETE';reject('SAVE_FAILURE');break;
      case 'monitor.failed':case 'worker.silent':case 'parent.silent':case 'communication.failed':case 'buffer.overflow':reject(e.type);break;
      default:reject('UNKNOWN_EVENT');
    }
  }
  return s;
}
