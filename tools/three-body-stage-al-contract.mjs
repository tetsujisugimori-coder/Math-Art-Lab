import {isDeepStrictEqual as eq} from 'node:util';
export const gate=()=>({allowed:false,state:'PLAN_ONLY',status:'BLOCKED',approval:'APPROVAL_MISSING',decision:'HOLD',physical:'NOT_TESTED',qualificationStart:'NO'});
export function clockClaim(c){
 const valid=c?.actor==='M'?c.wallApi==='QueryPerformanceCounter/QueryPerformanceFrequency'&&c.cpuApi==='GetProcessTimes'&&c.wallUnit==='counts'&&c.cpuUnit==='100ns':['P','W'].includes(c?.actor)?c.wallApi==='performance.now'&&c.cpuApi==='process.cpuUsage'&&c.wallUnit==='ms'&&c.cpuUnit==='us':false;
 return {status:valid?'SPEC_VALID':'SPEC_INVALID',allowed:false};
}
const rec=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const nonblank=v=>typeof v==='string'&&v.trim().length>0;
export const boundaryRegistry={M:{envelope:['monitor.enrolled','monitor.exit-observed'],'monitor-failure':['monitor.enrolled','monitor.failure-observed']},P:{envelope:['parent.request','parent.receipt']},W:{envelope:['body.begin','body.end']}};
const signed=v=>typeof v==='string'&&/^-?(0|[1-9][0-9]*)$/.test(v)&&BigInt(v)>=-(1n<<63n)&&BigInt(v)<(1n<<63n);
const unsigned=v=>typeof v==='string'&&/^(0|[1-9][0-9]*)$/.test(v)&&BigInt(v)<(1n<<64n);
const domainKeys=['actor','trial','vmId','generation','incarnation','thread','origin','clockDomain'];
// Offline arithmetic over synthetic samples; never calls a clock/native API.
export function interval(p){
 const out={status:'INVALID',wall:null,cpu:{status:'NOT_OBTAINED'},errors:[],physical:'NOT_TESTED'};
 const bad=k=>{out.errors.push(k);return out;};
 if(!rec(p)||!rec(p.begin)||!rec(p.end))return {...bad('SAMPLES_NOT_OBTAINED'),status:'NOT_OBTAINED'};
 const a=p.begin,b=p.end;
 if(p.synthetic!==true||!rec(a.domain)||!rec(b.domain)||domainKeys.some(k=>typeof a.domain[k]!=='string'||!a.domain[k].trim()||a.domain[k]!==b.domain[k]))return bad('CLOCK_DOMAIN');
 const actor=a.domain.actor;
 if(actor==='R')return {...bad('R_CLOCK_PROVIDER_NOT_BOUND'),status:'NOT_OBTAINED'};
 if(!['M','P','W'].includes(actor))return bad('ACTOR');
 const expected=actor==='M'?['QueryPerformanceCounter','counts']:['performance.now','ms'];
 if(a.api!==expected[0]||b.api!==expected[0]||a.unit!==expected[1]||b.unit!==expected[1])return bad('API_OR_UNIT');
 if(a.ok!==true||b.ok!==true||a.raw===null||a.raw===undefined||b.raw===null||b.raw===undefined)return {...bad('ACQUISITION_NOT_OBTAINED'),status:'NOT_OBTAINED'};
 if(!rec(p.boundary)||!['id','begin','end'].every(k=>nonblank(p.boundary[k]))||!nonblank(a.event)||!nonblank(b.event)||!nonblank(a.id)||!nonblank(b.id)||a.boundaryId!==p.boundary.id||b.boundaryId!==p.boundary.id||a.event!==p.boundary.begin||b.event!==p.boundary.end||a.id===b.id||!Number.isSafeInteger(a.seq)||!Number.isSafeInteger(b.seq)||a.seq<0||b.seq<=a.seq)return bad('BOUNDARY');
 if(!eq(boundaryRegistry[actor]?.[p.boundary.id],[p.boundary.begin,p.boundary.end]))return bad('BOUNDARY_REGISTRY');
 if(actor==='M'){
  if(a.frequencyOk!==true||b.frequencyOk!==true)return {...bad('FREQUENCY_NOT_OBTAINED'),status:'NOT_OBTAINED'};
  if(!signed(a.raw)||!signed(b.raw)||!signed(a.frequency)||!signed(b.frequency)||BigInt(a.frequency)<=0n||a.frequency!==b.frequency)return bad('COUNTER_OR_FREQUENCY');
  const delta=BigInt(b.raw)-BigInt(a.raw);if(delta<0n||delta>=(1n<<63n))return bad('COUNTER_REVERSE_OR_OVERFLOW');
  out.wall={status:'SYNTHETIC_RECALCULATED',deltaCounts:String(delta),millisecondsRational:{numerator:String(delta*1000n),denominator:a.frequency}};
 }else{
  if(!Number.isFinite(a.raw)||!Number.isFinite(b.raw)||a.raw<0||b.raw<a.raw)return bad('NODE_COUNTER');
  out.wall={status:'SYNTHETIC_RECALCULATED',milliseconds:b.raw-a.raw};
 }
 if(p.cpu===undefined||p.cpu===null){out.status='PARTIAL';return out;}
 const c=p.cpu;
 if(rec(c)&&c.ok===false){out.status='PARTIAL';out.errors.push('CPU_NOT_OBTAINED');return out;}
 if(!rec(c)||c.ok!==true||c.beginId!==a.id||c.endId!==b.id||!eq(c.domain,a.domain))return bad('CPU_BOUNDARY_OR_DOMAIN');
 const api=actor==='M'?'GetProcessTimes':'process.cpuUsage',unit=actor==='M'?'100ns':'us';
 if(c.api!==api||c.unit!==unit||c.scope!=='PROCESS'||!rec(c.begin)||!rec(c.end))return bad('CPU_API_UNIT_SCOPE');
 if(actor==='M'){
  if(!['user','kernel'].every(k=>unsigned(c.begin[k])&&unsigned(c.end[k])&&BigInt(c.end[k])>=BigInt(c.begin[k])))return bad('CPU_COUNTER');
  out.cpu={status:'SYNTHETIC_RECALCULATED',scope:'PROCESS',unit:'100ns',user:String(BigInt(c.end.user)-BigInt(c.begin.user)),kernel:String(BigInt(c.end.kernel)-BigInt(c.begin.kernel))};
 }else{
  if(!['user','system'].every(k=>Number.isSafeInteger(c.begin[k])&&Number.isSafeInteger(c.end[k])&&c.begin[k]>=0&&c.end[k]>=c.begin[k]))return bad('CPU_COUNTER');
  out.cpu={status:'SYNTHETIC_RECALCULATED',scope:'PROCESS',unit:'us',user:c.end.user-c.begin.user,system:c.end.system-c.begin.system};
 }
 out.status='VALID';return out;
}
export const orphanStages=['JOB_CREATED','LIMITS_SET','ATTRIBUTES_READY','CREATED_SUSPENDED','MEMBERSHIP_CONFIRMED','RESUMED'];
export const nativeTargetKeys=['vmId','generation','ownerIncarnation','jobToken','processBirth','processHandle','threadHandle'];
// Flags represent synthetic original-receipt checks, never actual native success.
export function orphanTrace(events,enrolled){
 const s={stage:'NOT_STARTED',lastConfirmedStage:'NOT_STARTED',remaining:'NOT_STARTED',observation:'PASS',exit:'NOT_OBTAINED',release:'NOT_OBTAINED',lateEvidence:[],errors:[],physical:'NOT_TESTED'};let next=0;
 const reject=k=>{s.errors.push(k);s.observation='FAIL';s.remaining='BLOCKED';};
 if(!rec(enrolled)||nativeTargetKeys.some(k=>!nonblank(enrolled[k]))||!Array.isArray(events)||events.length>64){reject('ENROLLMENT_OR_CAPACITY');return s;}
 for(const e of events){
  if(!rec(e)||e.synthetic!==true){reject('EVENT_STRUCTURE');continue;}
  if(!rec(e.target)||nativeTargetKeys.some(k=>e.target[k]!==enrolled[k])){reject('TARGET_MISMATCH');continue;}
  if(e.type==='CREATOR_LOST'){reject('CREATOR_LOST_'+s.stage);s.stage='UNKNOWN';continue;}
  if(e.type==='STOP_ACK'){continue;}
  if(s.remaining==='BLOCKED'&&['EXIT_CONFIRMED','RELEASE_CONFIRMED'].includes(e.type)){s.lateEvidence.push(e);continue;}
  if(e.type==='EXIT_CONFIRMED'){if(e.handleProof===true&&next>=4)s.exit='SYNTHETIC_CONFIRMED';else reject('EXIT_NOT_PROVEN');continue;}
  if(e.type==='RELEASE_CONFIRMED'){if(s.exit==='SYNTHETIC_CONFIRMED'&&e.releaseProof===true)s.release='SYNTHETIC_RELEASED';else reject('RELEASE_NOT_PROVEN');continue;}
  if(s.remaining==='BLOCKED')continue;
  if(e.type!==orphanStages[next]||e.ok!==true||e.identityBound!==true||e.rEnrolled!==true||e.jobOwner!=='M'||e.jobInherited!==false||e.duplicateOrLeak!==false||e.nestedCompatible!==true||e.rightsVerified!==true||e.vmBound!==true||e.fallback!==false||e.breakaway!==false){reject('ORDER_OR_NATIVE_ADMISSION');continue;}
  if(e.type==='CREATED_SUSPENDED'&&(e.jobList!==true||e.suspended!==true||e.processThreadBirthBound!==true)){reject('CREATION_BINDING');continue;}
  if(e.type==='MEMBERSHIP_CONFIRMED'&&e.membershipProof!==true){reject('MEMBERSHIP_NOT_OBTAINED');continue;}
  if(e.type==='RESUMED'&&(e.resumeReceipt!==true||e.resumePreviousCount!==1)){reject('RESUME_NOT_PROVEN');continue;}
  s.stage=e.type;s.lastConfirmedStage=e.type;next++;
 }
 return s;
}
export const rIdentityKeys=['vmId','imageSha256','generation','hypervisorId','stationId','session','epoch'];
export function recoveryTrace(enrolled,events){
 const s={stop:'NOT_REQUESTED',accepted:'NOT_OBTAINED',vmStopped:'NOT_OBTAINED',guestExit:'NOT_OBTAINED',released:'NOT_OBTAINED',persisted:'NOT_OBTAINED',guarantee:'NONE',remaining:'NOT_STARTED',errors:[],physical:'NOT_TESTED'};let seq=-1;const nonces=new Set();
 const reject=k=>{s.errors.push(k);s.remaining='BLOCKED';};
 if(!rec(enrolled)||rIdentityKeys.some(k=>!nonblank(enrolled[k]))||!/^[a-f0-9]{64}$/.test(enrolled.imageSha256)||!Array.isArray(events)||events.length>64){reject('ENROLLMENT_OR_EVENTS');return s;}
 let admitted=false;
 for(const e of events){
  if(!rec(e)||e.synthetic!==true||!rec(e.identity)||rIdentityKeys.some(k=>e.identity[k]!==enrolled[k])||e.authenticated!==true||e.vmScopedAcl!==true||!nonblank(e.nonce)||nonces.has(e.nonce)||!Number.isSafeInteger(e.seq)||e.seq<=seq){reject('IDENTITY_AUTH_REPLAY');continue;}
  nonces.add(e.nonce);seq=e.seq;
  if(e.type==='ENROLL'){if(admitted||e.beforeGuest!==true){reject('ENROLL_LATE_OR_DUPLICATE');continue;}admitted=true;continue;}
  if(!admitted){reject('NOT_ENROLLED');continue;}
  if(['R_HANG','LINK_DOWN','KERNEL_HANG','ENDPOINT_FAILURE','ACL_DENIED','LEDGER_FAILURE','HEARTBEAT_LOST'].includes(e.type)){reject(e.type);continue;}
  // Once failed, late evidence cannot unblock or promote the frozen cohort.
  if(s.remaining==='BLOCKED')continue;
  if(e.type==='STOP_REQUEST')s.stop='REQUESTED';
  else if(e.type==='API_ACCEPTED'&&s.stop==='REQUESTED')s.accepted='SYNTHETIC_ACCEPTED';
  else if(e.type==='VM_STOPPED'&&e.freshStatus===true)s.vmStopped='SYNTHETIC_CONFIRMED';
  else if(e.type==='GUEST_EXIT'&&e.guestHandleProof===true)s.guestExit='SYNTHETIC_CONFIRMED';
  else if(e.type==='RESOURCE_RELEASED'&&e.resourceProof===true)s.released='SYNTHETIC_CONFIRMED';
  else if(e.type==='PERSISTED'&&e.receiptReadback===true)s.persisted='SYNTHETIC_CONFIRMED';
  else reject('UNKNOWN_OR_MISSING_INDEPENDENT_PROOF');
 }
 return s;
}
