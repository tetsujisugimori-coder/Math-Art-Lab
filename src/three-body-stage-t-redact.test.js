import {it,expect} from 'vitest';
import {anonymous,personalPathCandidates} from '../tools/three-body-stage-t-redact.mjs';
it('removes personal roots from single, doubled, slash and file URL error paths',()=>{
 const paths=[String.raw`C:\Users\example-person\private\raw.json`,String.raw`C:\\Users\\example-person\\private\\raw.json`,'C:/Users/example-person/private/raw.json','file:///C:/Users/example-person/private/raw.json'];
 for(const original of paths){expect(personalPathCandidates(original)).toBe(1);const copy=anonymous(original);expect(copy).not.toContain('example-person');expect(personalPathCandidates(copy)).toBe(0);}
});
it('preserves nested measurement values, hashes and relative evidence identities',()=>{
 const input={T0:1.234,uncertainty:.1,sha256:'abc',pass:false,items:[null,3,{error:String.raw`C:\Users\example-person\raw.log`,file:'local/raw/run.json.gz'}]};const copy=anonymous(input);
 expect(copy).toEqual({...input,items:[null,3,{error:String.raw`<user-home>\raw.log`,file:'local/raw/run.json.gz'}]});expect(input.items[2].error).toContain('example-person');
});
it('keeps public repository names and nonpersonal relative paths intact',()=>{
 const value='tetsujisugimori-coder/Math-Art-Lab docs/three-body/stage-t';expect(anonymous(value)).toBe(value);expect(personalPathCandidates(value)).toBe(0);
});
