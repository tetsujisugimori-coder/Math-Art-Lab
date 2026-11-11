import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, it, expect } from 'vitest';
import { copyAndVerify, fileIdentity, filesBelow, archiveEvidence } from '../tools/three-body-stage-t-archive.mjs';
const fixtures=[];
function fixture(){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'stage-t-archive-test-'));fixtures.push(root);
 const repo=path.join(root,'repo'),approved=path.join(root,'approved');fs.mkdirSync(repo);fs.mkdirSync(approved);
 const stages=Object.fromEntries(['stage-p','stage-q','stage-r','stage-s'].map(stage=>{fs.mkdirSync(path.join(repo,stage));fs.writeFileSync(path.join(repo,stage,'raw.bin'),Buffer.from([0,255,1,2]));return[stage,[stage]];}));
 return{repositoryRoot:repo,approvedRoot:approved,archiveRelative:'archive',stages,head:'0'.repeat(40),repository:'test/repo',pr:44,reserveBytes:0};
}
afterEach(()=>{for(const root of fixtures.splice(0)){
 const resolved=fs.realpathSync(root),temporary=fs.realpathSync(os.tmpdir())+path.sep;
 if(!resolved.startsWith(temporary)||!path.basename(resolved).startsWith('stage-t-archive-test-'))throw Error('Unsafe temporary fixture cleanup');
 fs.rmSync(resolved,{recursive:true});
}});
describe('Stage T exclusive archive and independent readback',()=>{
 it('verifies bytes, hashes and the complete source/destination sets; an identical rerun preserves files',async()=>{
  const c=fixture(),a=await copyAndVerify(c);expect(a.status).toBe('LOCAL_BACKUP_VERIFIED');expect(a.rows).toHaveLength(4);
  expect(a.stages.every(s=>s.status==='LOCAL_BACKUP_VERIFIED')).toBe(true);
  const file=path.join(c.approvedRoot,'archive/stage-p/stage-p/raw.bin'),before=fs.statSync(file).mtimeMs;
  const b=await copyAndVerify(c);expect(b.rows.every(r=>r.disposition==='REUSED_IDENTICAL')).toBe(true);expect(fs.statSync(file).mtimeMs).toBe(before);expect(b.collectionSha256).toBe(a.collectionSha256);
 });
 it('rejects a changed destination before copying or overwriting anything',async()=>{
  const c=fixture();await copyAndVerify(c);const file=path.join(c.approvedRoot,'archive/stage-p/stage-p/raw.bin');fs.writeFileSync(file,'tampered');
  await expect(copyAndVerify(c)).rejects.toThrow('DESTINATION_COLLISION');expect(fs.readFileSync(file,'utf8')).toBe('tampered');
 });
 it('rejects extra destination evidence rather than claiming a complete file set',async()=>{
  const c=fixture();await copyAndVerify(c);fs.writeFileSync(path.join(c.approvedRoot,'archive/stage-p/extra'),'extra');
  await expect(copyAndVerify(c)).rejects.toThrow('EXTRA_DESTINATION_FILE');
 });
 it('does not make evidence copies with insufficient capacity or a missing scope',async()=>{
  const c=fixture();await expect(copyAndVerify(c,{freeBytes:0n})).rejects.toThrow('INSUFFICIENT_CAPACITY');expect(fs.existsSync(path.join(c.approvedRoot,'archive'))).toBe(false);
  c.stages['stage-p']=['missing'];await expect(copyAndVerify(c)).rejects.toThrow('MISSING_OR_UNSAFE_SOURCE');
 });
 it('rejects traversal and overlapping scopes',async()=>{
  const c=fixture();c.archiveRelative='../../outside';await expect(copyAndVerify(c)).rejects.toThrow('UNSAFE_ARCHIVE_ROOT');
  c.archiveRelative='archive';c.stages['stage-p'].push('stage-p');await expect(copyAndVerify(c)).rejects.toThrow('DUPLICATE_SCOPE');
 });
 it('streams exact binary identity and keeps platform claims explicit',async()=>{
  const c=fixture(),file=filesBelow(path.join(c.repositoryRoot,'stage-p'))[0];const id=await fileIdentity(file);expect(id.size).toBe(4);expect(id.sha256).toMatch(/^[0-9a-f]{64}$/);
  if(process.platform!=='win32')await expect(archiveEvidence(c)).rejects.toThrow('BACKUP_BLOCKED_NOT_WINDOWS');
  else expect((await archiveEvidence(c,{inventoryOnly:true})).status).toBe('INVENTORIED');
 });
 it('supports a separately scoped later stage without changing old archives',async()=>{
  const c=fixture();const first=await copyAndVerify(c);
  c.stageNames=['stage-t'];c.stages={'stage-t':['stage-p']};
  const second=await copyAndVerify(c);expect(second.stages[0].stage).toBe('stage-t');expect(second.rows).toHaveLength(1);
  expect(second.status).toBe('LOCAL_BACKUP_VERIFIED');
  c.stageNames=['../escape'];await expect(copyAndVerify(c)).rejects.toThrow('INVALID_STAGE_NAMES');
  expect(first.rows.every(r=>fs.existsSync(path.join(c.approvedRoot,'archive',r.archiveRelative)))).toBe(true);
 });
});
