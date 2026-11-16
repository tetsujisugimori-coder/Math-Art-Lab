import {it,expect} from 'vitest';
import {cases,matches,enrollment} from '../tools/three-body-stage-ai-p2-fixtures.mjs';
import {reduceTrace,executionGate} from '../tools/three-body-stage-ai-contract.mjs';
for(const c of cases())it(c.issue+' '+c.id,()=>{
  const actual=reduceTrace(c.enrolled,c.events);
  expect(matches(actual,c.expected)).toBe(true);
  expect(actual.errors.length).toBeGreaterThan(0);
  if(c.id==='valid-raw-then-null')expect(actual.savedCommits).toHaveLength(1);
});
it('retains already known normal result despite malformed later evidence',()=>{
 const e={synthetic:true,id:'ok',seq:0,at:0,type:'runner.pass',identity:enrollment};
 expect(reduceTrace(enrollment,[e,null])).toMatchObject({execution:'PASS',observation:'FAIL',evidence:'EVIDENCE_INCOMPLETE',physical:'NOT_TESTED'});
});
it('bounded overflow retains observed FAIL',()=>{
 const es=Array.from({length:1025},(_,i)=>({synthetic:true,id:'id-'+i,seq:i,at:i,type:'runner.fail',identity:enrollment}));
 const r=reduceTrace(enrollment,es);expect(r).toMatchObject({execution:'FAIL',remaining:'BLOCKED'});expect(r.errors).toContain('EVENT_BUFFER_OVERFLOW');
});
it('does not swallow an unexpected internal/accessor exception as success',()=>{
 const e={get id(){throw Error('INTERNAL_ACCESSOR_FAILURE');}};
 expect(()=>reduceTrace(enrollment,[e])).toThrow('INTERNAL_ACCESSOR_FAILURE');
});
it('invalid approval never grants execution',()=>expect(executionGate({approved:true,pr:45,policy:'BYPASS'})).toMatchObject({allowed:false,status:'BLOCKED',approval:'APPROVAL_MISSING'}));
