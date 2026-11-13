import {describe,it,expect} from 'vitest';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {validObservation,mutations} from '../tools/three-body-stage-ab-observation-fixture.mjs';
import {observationErrors} from '../tools/three-body-stage-aa-result.mjs';
import {controlled,requiredAudits} from '../tools/three-body-stage-ab-gate.mjs';
import {reviewGate} from '../tools/three-body-stage-ab-review.mjs';
import {decorate} from '../tools/three-body-stage-ab-locator.mjs';
import {preparationChecks} from '../tools/three-body-stage-aa-cohort.mjs';
import {original} from '../tools/three-body-stage-aa-original.mjs';
describe('Stage AB browser-free observation contract',()=>{
 it('accepts the explicitly synthetic complete record',()=>expect(observationErrors(validObservation())).toEqual([]));
 for(const [name,mutate]of Object.entries(mutations))it('rejects '+name,()=>{const o=validObservation();mutate(o);expect(observationErrors(o).length).toBeGreaterThan(0);});
 it('does not retrofit old evidence with wait records',()=>{const o=validObservation();delete o.schema;expect(observationErrors(o)).toContain('OBSERVATION_VERSION');});
 it('rejects final journal before the 200ms snapshot',()=>{const o=validObservation(),f=o.rows.pop();f.harnessMono=0;o.rows.unshift(f);expect(observationErrors(o)).toContain('FINAL_OBSERVATION_ORDER');});
 it('rejects malformed final evaluation brackets',()=>{const o=validObservation();delete o.rows.at(-1).begin;expect(observationErrors(o)).toContain('FINAL_OBSERVATION_ORDER');});
 it('keeps explicit later reset and manual refresh distinct from timer advance',()=>{const o=validObservation();o.rows.at(-1).value.journal=structuredClone(o.rows.at(-1).value.journal);o.rows.at(-1).value.journal.push({event:'pause-enter',pageMono:301,timeOrigin:1000,operationId:null},{event:'pause-exit',pageMono:301.1,timeOrigin:1000,operationId:null},{event:'refresh-enter',pageMono:301.2,timeOrigin:1000,operationId:null});expect(observationErrors(o)).toEqual([]);});
 it('preserves mock receiver, prototype, constructor, arguments and return',async()=>{
  class Locator{constructor(){this.identity=19;}async click(value){expect(this.identity).toBe(19);return value;} chain(){return this;}}
  const l=new Locator(),events=[],c={log:(e,v)=>events.push({e,...v}),now:()=>1,next:()=>'click-1',arm:async()=>{},disarm:async()=>{}};
  expect(decorate(l,'#sm-play',c)).toBe(l);expect(l.constructor.name).toBe('Locator');expect(Object.getPrototypeOf(l)).toBe(Locator.prototype);expect(l.chain()).toBe(l);expect(await l.click(42)).toBe(42);expect(events.map(x=>x.e)).toEqual(['play-click-issued','play-click-dispatch','play-click-returned']);
 });
 it('records mock click rejection and preserves failure',async()=>{const rows=[],error=Error('CLICK');const l={click:async()=>{throw error;}};decorate(l,'#sm-play',{log:(e,v)=>rows.push({e,...v}),next:()=>'click-1',arm:async()=>{},disarm:async()=>{}});await expect(l.click()).rejects.toBe(error);expect(rows.at(-1).error).toContain('CLICK');});
});
describe('Stage AB real controller, mock measurements only',()=>{
 for(const name of requiredAudits)for(const status of ['FAIL','BLOCKED','NOT_OBTAINED'])it(name+' '+status+' launches zero',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'ab-gate-')),checks=Object.fromEntries(requiredAudits.map(k=>[k,()=>({status:k===name?status:'PASS'})]));
  const r=controlled(path.join(root,'run'),checks,process.execPath,['-e','throw Error("MUST_NOT_RUN")']);expect(r.status).toBe('BLOCKED');expect(r.measurementLaunches).toBe(0);expect(JSON.parse(fs.readFileSync(path.join(root,'run/result.json'))).status).toBe('BLOCKED');
 });
 for(const value of [undefined,{}, {status:'garbage'}])it('missing/malformed audit blocks '+JSON.stringify(value),()=>{const root=fs.mkdtempSync(path.join(os.tmpdir(),'ab-gate-')),checks=Object.fromEntries(requiredAudits.map(k=>[k,()=>k==='review'?value:{status:'PASS'}]));expect(controlled(path.join(root,'run'),checks,process.execPath,['-e','throw Error("MUST_NOT_RUN")']).measurementLaunches).toBe(0);});
 it('audit exception does not prevent independent static audits',()=>{let count=0;const root=fs.mkdtempSync(path.join(os.tmpdir(),'ab-gate-')),checks=Object.fromEntries(requiredAudits.map(k=>[k,()=>{count++;if(k==='zip')throw Error('ZIP');return{status:'PASS'};}]));expect(controlled(path.join(root,'run'),checks,process.execPath,[]).measurementLaunches).toBe(0);expect(count).toBe(9);});
 for(const code of [0,7])it('mock child exit '+code+' retained',()=>{const root=fs.mkdtempSync(path.join(os.tmpdir(),'ab-gate-')),checks=Object.fromEntries(requiredAudits.map(k=>[k,()=>({status:'PASS'})]));const r=controlled(path.join(root,'run'),checks,process.execPath,['-e',`process.exitCode=${code}`]);expect(r.measurementLaunches).toBe(1);expect(r.status).toBe(code?'FAIL':'PASS');expect(r.process.status).toBe(code);});
 it('actual cohort uses live review audit and blocks incomplete input',()=>{const checks=preparationChecks({});expect(Object.keys(checks)).toEqual(requiredAudits);expect(checks.review().status).toBe('FAIL');expect(checks.source().status).toBe('FAIL');});
 it('review does not accept a filename without required identity',()=>expect(reviewGate({reviewFile:'anything'}).status).toBe('FAIL'));
 it('direct non-probe original entry cannot bypass the Stage AB prohibition',async()=>{const parent=fs.mkdtempSync(path.join(os.tmpdir(),'ab-direct-')),out=path.join(parent,'output');await expect(original(out)).rejects.toThrow('STAGE_AB_ORIGINAL_MEASUREMENT_BLOCKED');expect(fs.existsSync(out)).toBe(false);});
});
