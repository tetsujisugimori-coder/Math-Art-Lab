import {digest} from './three-body-stage-ah-contract.mjs';
export const enrollment={session:'fixture-session',incarnation:'fixture-birth',parentIncarnation:'fixture-parent',role:'monitor',pid:42,trial:'ah-O2',head:'a'.repeat(40),tree:'b'.repeat(40),planSha:'c'.repeat(64),sourceSha:'d'.repeat(64),channel:'fixture-channel',peer:'fixture-peer',clockDomain:'fixture-clock'};
const ev=(type='runner.pass',seq=0)=>({synthetic:true,id:`e-${seq}`,seq,at:seq,type,identity:{...enrollment}});
export function cases(){
  const rows=[];
  const add=(id,issue,events,execution='UNKNOWN')=>rows.push({id,issue,enrolled:{...enrollment},events,expected:{execution,observation:'FAIL',remaining:'BLOCKED',evidence:'EVIDENCE_INCOMPLETE',physical:'NOT_TESTED',failure:true}});
  const badIds=[['missing',undefined],['null',null],['empty',''],['space','   '],['number',12],['array',[]],['object',{}]];
  for(const [name,id] of badIds){const e=ev();if(name==='missing')delete e.id;else e.id=id;add('id-'+name,'P2-AI05',[e]);}
  add('id-duplicate','P2-AI05',[ev('runner.fail'),{...ev('runner.pass',1),id:'e-0'}],'FAIL');
  add('id-invalid-then-pass','P2-AI05',[{...ev(),id:''},ev('runner.pass',1)]);
  add('fail-then-invalid-id','P2-AI05',[ev('runner.fail'),{...ev('runner.pass',1),id:null}],'FAIL');
  for(const [name,v]of [['null',null],['undefined',undefined],['number',7],['string','event'],['array',[]]])add('element-'+name,'P3-AI06',[v]);
  for(const [name,v]of [['object',{}],['number',7],['string','events'],['null',null],['undefined',undefined]])add('events-'+name,'P3-AI06',v);
  for(const [name,v]of [['missing',undefined],['null',null],['array',[]],['string','identity']]){const e=ev();if(name==='missing')delete e.identity;else e.identity=v;add('identity-'+name,'P3-AI06',[e]);}
  for(const [name,v]of [['missing',undefined],['null',null],['number',1],['array',[]],['unknown','bad.type']]){const e=ev();if(name==='missing')delete e.type;else e.type=v;add('type-'+name,'P3-AI06',[e]);}
  for(const field of ['seq','at'])for(const [name,v]of [['missing',undefined],['null',null],['string','1'],['negative',-1],['nan',NaN],['infinity',Infinity]]){const e=ev();if(name==='missing')delete e[field];else e[field]=v;add(field+'-'+name,'P3-AI06',[e]);}
  const raw=['clock','result'].map(name=>({name,base64:'e30=',bytes:2,sha256:digest('{}')}));
  add('raw-null','P3-AI06',[ev('save.begin'),{...ev('save.commit',1),raw:[null,raw[1]],receipt:raw}]);
  for(const [name,receipt]of [['null',null],['object',{}],['element-null',[null,raw[1]]]])add('receipt-'+name,'P3-AI06',[ev('save.begin'),{...ev('save.commit',1),raw,receipt}]);
  add('fail-then-null','P3-AI06',[ev('runner.fail'),null],'FAIL');
  add('valid-raw-then-null','P3-AI06',[ev('save.begin'),{...ev('save.commit',1),raw,receipt:raw},null]);
  return rows;
}
export function matches(actual,expected){return Object.entries(expected).every(([k,v])=>Object.is(actual?.[k],v));}
// Tagged values preserve undefined/NaN/Infinity rather than silently JSON-coercing them.
export const encode=value=>JSON.stringify(value,(_k,v)=>v===undefined?{$value:'undefined'}:typeof v==='number'&&!Number.isFinite(v)?{$value:String(v)}:v,2);
