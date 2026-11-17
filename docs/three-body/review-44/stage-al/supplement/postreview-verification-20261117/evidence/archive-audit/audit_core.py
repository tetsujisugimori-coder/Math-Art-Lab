from pathlib import Path, PurePosixPath
from collections import Counter
import base64, datetime, hashlib, json, subprocess, zipfile, zlib

ROOT=Path.cwd()
CASE=ROOT/'.three-body-evidence/stage-al-p3-verification-20261117'
AUDIT=CASE/'independent-zip-audit-core'
ORIGIN=Path('C:/Users/tetsu/Dev-Artifact-Archive/Math-Art-Lab/PR-44/Stage-AL-20261116/p3-formal-verification-20261117/01-core/original-evidence.zip')
RETRIEVED=AUDIT/'retrieved-original-evidence.zip'
PRODUCER=CASE/'original-evidence.zip'
HEAD='88b9a85ee901084929afdc208ab5921d4f2a7c99'
TREE='254e168697086fb38b01134951b7c89d7c14934a'
FIX='17346c435f15d354423def224937720221d1736d'
EXPECTED_ZIP_SHA='32668802687489006ed3163378bd9233a9c3e592a921a1cd3a62a7a8cb9061a8'
EXPECTED_MANIFEST_SHA='33d68b19a2dd6c3c0e0f819530f9687ccf7da5e6de3568bf317ee606e3b89c22'
sha=lambda b:hashlib.sha256(b).hexdigest()
crc=lambda b:f'{zlib.crc32(b)&0xffffffff:08x}'
blob=lambda typ,b:hashlib.sha1(typ.encode()+b' '+str(len(b)).encode()+b'\0'+b).hexdigest()
checks=[]
def check(ok,name,details=None):
    checks.append({'id':name,'status':'PASS' if ok else 'FAIL','details':details})
    if not ok:raise AssertionError(name)
def read_json(z,name):return json.loads(z.read(name))
def byte_compare(a,b):
    total=0
    with a.open('rb') as f,b.open('rb') as g:
        while True:
            x,y=f.read(1048576),g.read(1048576)
            if x!=y:return False,total
            total+=len(x)
            if not x:return True,total
def test_keys(j):
    rows=[]
    for suite in j['testResults']:
        name=suite['name'].replace('\\','/').split('/src/')[-1]
        for a in suite['assertionResults']:rows.append((name,a['fullName'],a['status']))
    return rows

try:
    origin_before=ORIGIN.stat()
    data=RETRIEVED.read_bytes()
    check(len(data)==836750 and sha(data)==EXPECTED_ZIP_SHA,'fresh_retrieval_external_zip_size_sha',{'bytes':len(data),'sha256':sha(data)})
    equal,count=byte_compare(ORIGIN,RETRIEVED)
    check(equal and count==836750,'actual_persistent_windows_zip_whole_bytes',{'bytesCompared':count,'origin':str(ORIGIN)})
    equal,count=byte_compare(PRODUCER,RETRIEVED)
    check(equal and count==836750,'producer_zip_whole_bytes',{'bytesCompared':count,'producer':str(PRODUCER)})
    persistent_receipt=json.loads(ORIGIN.with_name('capture-receipt.json').read_bytes())
    working_receipt=json.loads(CASE.joinpath('stored-core-receipt.json').read_bytes())
    check(persistent_receipt==working_receipt,'capture_receipt_actual_persistent_vs_producer')
    check(persistent_receipt['zipBytes']==836750 and persistent_receipt['zipSha256']==EXPECTED_ZIP_SHA and persistent_receipt['sourceHead']==HEAD and persistent_receipt['sourceTree']==TREE,'capture_receipt_external_constants')
    with zipfile.ZipFile(RETRIEVED) as z:
        infos=z.infolist();names=[i.filename for i in infos]
        check(len(infos)==343 and len(names)==len(set(names)),'zip_unique_343_entries')
        check(all(not i.is_dir() and not PurePosixPath(i.filename).is_absolute() and '..' not in PurePosixPath(i.filename).parts and '\\' not in i.filename for i in infos),'zip_safe_file_paths')
        check(z.testzip() is None,'zip_testzip_crc_all_entries')
        manifest_raw=z.read('manifest.json');manifest=json.loads(manifest_raw)
        check(len(manifest_raw)==75275 and sha(manifest_raw)==EXPECTED_MANIFEST_SHA and crc(manifest_raw)=='d0d03644','manifest_external_size_sha_crc')
        check(persistent_receipt['manifestBytes']==len(manifest_raw) and persistent_receipt['manifestSha256']==sha(manifest_raw) and persistent_receipt['manifestCrc32']==crc(manifest_raw),'manifest_receipt_binding')
        check(manifest['sourceHead']==HEAD and manifest['sourceTree']==TREE and manifest['payloadFiles']==342,'manifest_source_and_count')
        payload=manifest['payload'];expected_paths=[r['path'] for r in payload]
        check(len(payload)==342 and len(set(expected_paths))==342 and set(expected_paths)==set(names)-{'manifest.json'},'payload_exact_path_set_and_count')
        payload_checked=[]
        for r in payload:
            raw=z.read(r['path']);info=z.getinfo(r['path'])
            check(len(raw)==r['bytes']==info.file_size and sha(raw)==r['sha256'] and crc(raw)==r['crc32']==f'{info.CRC:08x}','payload:'+r['path'])
            payload_checked.append({'path':r['path'],'bytes':len(raw),'sha256':sha(raw),'crc32':crc(raw)})
        check(sum(r['bytes'] for r in payload)==manifest['payloadBytes'],'manifest_total_payload_bytes')
        check(f"{z.getinfo('manifest.json').CRC:08x}"=='d0d03644','manifest_zip_directory_crc')
        source=read_json(z,'bindings/source-binding.json')
        check(source['head']==HEAD and source['tree']==TREE and source['fixCommit']==FIX and len(source['rows'])==129,'source_binding_exact_target_129')
        check(len({r['file'] for r in source['rows']})==129,'source_binding_unique_paths')
        query=''.join(HEAD+':'+r['file']+'\n' for r in source['rows'])
        git_check=subprocess.run(['git','cat-file','--batch-check'],input=query.encode(),capture_output=True,check=True).stdout.decode().splitlines()
        check(len(git_check)==129,'repository_git_object_count')
        sources=[]
        for r,answer in zip(source['rows'],git_check):
            raw=z.read(r['gitPath']);working=z.read(r['workingPath']);parts=answer.split()
            check(r['commit']==HEAD and parts==[r['gitBlob'],'blob',str(len(raw))] and blob('blob',raw)==r['gitBlob'],'source_git_blob:'+r['file'])
            check(len(raw)==r['gitBytes'] and sha(raw)==r['gitSha256'] and len(working)==r['workingBytes'] and sha(working)==r['workingSha256'],'source_raw_sizes_sha:'+r['file'])
            check(sha(raw.replace(b'\r\n',b'\n'))==r['logicalSha256']==sha(working.replace(b'\r\n',b'\n')),'source_logical_equivalence:'+r['file'])
            sources.append({'file':r['file'],'gitBlob':r['gitBlob'],'gitSha256':sha(raw),'workingSha256':sha(working)})
        commit_raw=z.read('bindings/source-commit.raw');tree_raw=z.read('bindings/source-tree.raw')
        check(blob('commit',commit_raw)==HEAD and commit_raw.splitlines()[0]==('tree '+TREE).encode(),'source_commit_object_and_tree_link')
        check(blob('tree',tree_raw)==TREE,'source_tree_object')
        check(subprocess.check_output(['git','cat-file','commit',HEAD])==commit_raw and subprocess.check_output(['git','cat-file','tree',TREE])==tree_raw,'actual_repository_commit_tree_raw_bytes')
        review=read_json(z,'independent-review/review-conclusion.json')
        check(review['reviewer']=='al_p3_source_review' and review['targetHead']==HEAD and review['targetTree']==TREE and review['fixCommit']==FIX and review['newP1P2']==[],'independent_review_exact_source_and_scope')
        reviewed=read_json(z,'independent-review/github-source-binding.json')['rows']
        check(len(reviewed)==12,'direct_github_review_12_file_versions')
        for r in reviewed:
            path='independent-review/'+r['version']+'/'+r['file'];raw=z.read(path);api=read_json(z,path+'.api.json')
            check(len(raw)==r['bytes'] and sha(raw)==r['sha256'] and blob('blob',raw)==r['gitBlob'] and api['sha']==r['gitBlob'] and base64.b64decode(api['content'])==raw,'review_github_raw_blob:'+r['version']+':'+r['file'])
            if r['version']=='updated':check(raw==z.read('git-source/'+r['file']),'review_vs_test_source:'+r['file'])
        formal=read_json(z,'records/vitest-updated.json');independent=read_json(z,'independent-review/vitest-independent.json')
        formal_rows=test_keys(formal);independent_rows=test_keys(independent)
        check(len(formal_rows)==686 and formal['numPassedTests']==686 and formal['numFailedTests']==0 and all(r[2]=='passed' for r in formal_rows),'formal_686_per_test_pass')
        check(Counter(formal_rows)==Counter(independent_rows),'independent_686_same_per_test_ids_results')
        inventory=read_json(z,'records/test-inventory.json')
        check(inventory['executedHead']==HEAD and inventory['oldHead']=='a627fa944b31b2e98e2dcb3908e2d84d62cd302f' and inventory['prior672AllPresent'] and inventory['counts']=={'passed':686} and inventory['unexecuted']==0 and sum(r['count'] for r in inventory['additional14'])==14,'formal_inventory_672_plus_14')
        old=read_json(z,'git-source/docs/three-body/review-44/stage-al/supplement/evidence/vitest-final.json')
        before=Counter((a,b) for a,b,_ in test_keys(old));after=Counter((a,b) for a,b,_ in formal_rows)
        check(sum(before.values())==672 and not(before-after) and sum((after-before).values())==14,'old672_and_new14_independent_multiset')
        run=read_json(z,'records/vitest-run.json')
        check(run['head']==HEAD and run['tree']==TREE and run['exit']==0 and 'tools/three-body-stage-al-tests.config.mjs' in run['command'],'run_command_exit_source_identity')
        gate=read_json(z,'records/gate.result.json');gate_output=read_json(z,'records/gate.stdout.bin')
        check(gate['exit']==2 and gate_output['allowed'] is False and gate_output['status']=='BLOCKED' and gate_output['approval']=='APPROVAL_MISSING' and gate_output['physical']=='NOT_TESTED','always_deny_gate_result')
        for task in ['typecheck','build']:check(read_json(z,'records/'+task+'.result.json')['exit']==0,'recorded_'+task+'_exit0_not_rerun_by_auditor')
        old_zip_checks=[]
        for r in read_json(z,'records/existing-zip-index.json'):
            if r.get('status')=='READ_ONLY_INDEX':
                raw=Path(r['path']).read_bytes();check(len(raw)==r['bytes'] and sha(raw)==r['sha256'],'old_original_zip_unchanged:'+r['path']);old_zip_checks.append({'path':r['path'],'bytes':len(raw),'sha256':sha(raw)})
    origin_after=ORIGIN.stat()
    check(origin_before.st_size==origin_after.st_size and origin_before.st_mtime_ns==origin_after.st_mtime_ns,'persistent_original_unchanged_during_audit')
    report={'status':'INDEPENDENT_ORIGINAL_ZIP_VERIFIED','auditor':'al_p3_archive_audit','auditorDistinctFromSaver':True,'completedUTC':datetime.datetime.now(datetime.timezone.utc).isoformat(),'origin':str(ORIGIN),'retrieved':str(RETRIEVED.resolve()),'producer':str(PRODUCER.resolve()),'zipBytes':836750,'zipSha256':EXPECTED_ZIP_SHA,'manifestSha256':EXPECTED_MANIFEST_SHA,'manifestCrc32':'d0d03644','entries':343,'payloadFiles':342,'sourceFiles':129,'sourceHead':HEAD,'sourceTree':TREE,'reviewer':'al_p3_source_review','checks':checks,'payload':payload_checked,'sources':sources,'oldZipRechecks':old_zip_checks,'notVerified':['physical durability beyond file re-read','physical VM/Job/native/IPC/R or hardware safety','future final publication/submission ZIP (separate audit)'],'claimScope':'Actual approved Windows ZIP retrieved into fresh auditor copy; full bytes/size/SHA, all ZIP paths/sizes/SHA/CRC, manifest,129 Git source blobs, commit/tree, review-source and per-test correspondence checked. This does not itself perform GitHub submission or authorize physical activity.'}
    out=AUDIT/'audit-result.json';out.write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
    (AUDIT/'audit-report.md').write_text('# Independent original ZIP audit\n\nPASS within static/synthetic preservation scope. The saved Windows ZIP was read from '+str(ORIGIN)+' and retrieved into a fresh auditor-owned copy. All836750 bytes match producer and fixed SHA256 '+EXPECTED_ZIP_SHA+'.343 ZIP entries (342 payload + manifest), all sizes/SHA256/CRC32, manifest SHA/CRC,129 source Git blobs and commit/tree '+HEAD+' / '+TREE+',12 independent GitHub source versions and686 formal/independent per-test IDs/results match. Prior original ZIP remains unchanged.\n\nThis auditor is distinct from saver/root and source reviewer. No source, persistent original ZIP or receipt was modified. Physical safety/durability beyond reread, future publication and submission ZIP are not verified by this core audit. Detailed checked values: audit-result.json; acquisition origin: acquisition.json.\n\nCompleted '+report['completedUTC']+' (UTC).\n',encoding='utf-8')
    print(json.dumps({k:report[k] for k in ['status','zipBytes','zipSha256','entries','payloadFiles','sourceFiles','sourceHead','sourceTree']}))
except Exception as e:
    report={'status':'BLOCKED','auditor':'al_p3_archive_audit','error':repr(e),'checks':checks,'utc':datetime.datetime.now(datetime.timezone.utc).isoformat()}
    (AUDIT/'audit-failure.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({'status':'BLOCKED','error':repr(e)}));raise
