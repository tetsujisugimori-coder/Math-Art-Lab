import {orphanStages,rIdentityKeys,boundaryRegistry} from './three-body-stage-al-contract.mjs';
export const claimCases=[
 {id:'native-node-wall',claim:{actor:'M',wallApi:'performance.now',cpuApi:'GetProcessTimes',wallUnit:'ms',cpuUnit:'100ns'},valid:false},
 {id:'native-node-cpu',claim:{actor:'M',wallApi:'QueryPerformanceCounter/QueryPerformanceFrequency',cpuApi:'process.cpuUsage',wallUnit:'counts',cpuUnit:'us'},valid:false},
 {id:'original-native-node-both',claim:{actor:'M',wallApi:'performance.now',cpuApi:'process.cpuUsage',wallUnit:'ms',cpuUnit:'us'},valid:false},
 {id:'native-correct',claim:{actor:'M',wallApi:'QueryPerformanceCounter/QueryPerformanceFrequency',cpuApi:'GetProcessTimes',wallUnit:'counts',cpuUnit:'100ns'},valid:true},
 {id:'node-correct',claim:{actor:'W',wallApi:'performance.now',cpuApi:'process.cpuUsage',wallUnit:'ms',cpuUnit:'us'},valid:true}
];
export function packet(actor='M'){
 const domain={actor,trial:'synthetic-trial',vmId:'synthetic-vm',generation:'synthetic-generation',incarnation:'synthetic-birth',thread:'control-thread',origin:'synthetic-boot',clockDomain:'synthetic-domain'};
 const native=actor==='M',api=native?'QueryPerformanceCounter':'performance.now',unit=native?'counts':'ms';
 const begin={id:'begin',seq:1,event:'begin',boundaryId:'envelope',domain,api,unit,raw:native?'100':'1',ok:true},end={id:'end',seq:2,event:'end',boundaryId:'envelope',domain:{...domain},api,unit,raw:native?'200':2,ok:true};if(!native)begin.raw=1;else {begin.frequency=end.frequency='1000';begin.frequencyOk=end.frequencyOk=true;}
 const cpu={domain:{...domain},beginId:'begin',endId:'end',ok:true,api:native?'GetProcessTimes':'process.cpuUsage',scope:'PROCESS',unit:native?'100ns':'us',begin:native?{user:'10',kernel:'10'}:{user:10,system:10},end:native?{user:'20',kernel:'30'}:{user:20,system:30}};
 const names=boundaryRegistry[actor].envelope;begin.event=names[0];end.event=names[1];return {synthetic:true,boundary:{id:'envelope',begin:names[0],end:names[1]},begin,end,cpu};
}
export const intervalFaults={domain:p=>p.end.domain.incarnation='other',actor:p=>p.end.domain.actor='P',missing:p=>p.end=null,reverse:p=>p.end.raw='99',unit:p=>p.end.unit='ms',frequency:p=>p.end.frequency='2000',zeroFrequency:p=>p.begin.frequency=p.end.frequency='0',overflow:p=>p.end.raw=String(1n<<63n),api:p=>p.end.api='performance.now',failed:p=>p.end.ok=false,boundary:p=>p.end.event='STOP_ACK',span:p=>p.end.boundaryId='other',cpuApi:p=>p.cpu.api='QueryPerformanceCounter',cpuUnit:p=>p.cpu.unit='us',cpuThread:p=>p.cpu.scope='THREAD',cpuReverse:p=>p.cpu.end.user='1',cpuMissing:p=>p.cpu.end.user=null,cpuBoundary:p=>p.cpu.endId='STOP_ACK',cpuDomain:p=>p.cpu.domain.trial='foreign',rUnbound:p=>{p.begin.domain.actor=p.end.domain.actor='R';}};
export const nativeTarget={vmId:'vm',generation:'generation',ownerIncarnation:'M-birth',jobToken:'job',processBirth:'child-birth',processHandle:'process-handle',threadHandle:'thread-handle'};
export const nativeEvent=type=>({synthetic:true,type,target:{...nativeTarget},ok:true,identityBound:true,rEnrolled:true,jobOwner:'M',jobInherited:false,duplicateOrLeak:false,nestedCompatible:true,rightsVerified:true,vmBound:true,fallback:false,breakaway:false,jobList:true,suspended:true,processThreadBirthBound:true,membershipProof:true,resumeReceipt:true,resumePreviousCount:1});
export const nativeEvents=()=>orphanStages.map(nativeEvent);
export const nativeFaults={jobList:es=>es[3].jobList=false,createFailure:es=>es[3].ok=false,nested:es=>es[0].nestedCompatible=false,rights:es=>es[1].rightsVerified=false,inherit:es=>es[1].jobInherited=true,duplicate:es=>es[2].duplicateOrLeak=true,membership:es=>es[4].membershipProof=false,birth:es=>es[3].processThreadBirthBound=false,resume:es=>es[5].resumeReceipt=false,fallback:es=>es[3].fallback=true,breakaway:es=>es[0].breakaway=true,pidReuse:es=>es[4].target.processBirth='foreign',process:es=>es[4].target.processHandle='foreign',vm:es=>es[4].target.vmId='foreign',rMissing:es=>es[0].rEnrolled=false,owner:es=>es[0].jobOwner='other'};
export const rIdentity=Object.fromEntries(rIdentityKeys.map(k=>[k,k==='imageSha256'?'a'.repeat(64):'synthetic-'+k]));
export const rEnrollmentEvidence=()=>({
 kind:'SYNTHETIC_EXTERNAL_LEDGER',durable:true,independentReadback:true,
 nonceLedgerReady:true,targetBound:true,epochBound:true,
 recordId:'synthetic-enrollment-record',readbackRecordId:'synthetic-enrollment-record',
 recordSha256:'b'.repeat(64),readbackSha256:'b'.repeat(64)
});
export const rEvent=(type,i=0,extra={})=>({synthetic:true,type,identity:{...rIdentity},authenticated:true,vmScopedAcl:true,nonce:'n-'+i,seq:i,beforeGuest:true,...(type==='ENROLL'?{enrollmentEvidence:rEnrollmentEvidence()}:{}),...extra});
