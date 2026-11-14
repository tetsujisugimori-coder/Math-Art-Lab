"""Read-only stdlib verifier. Does not import any producer/auditor module."""
import sys, json, hashlib, gzip, subprocess
from pathlib import Path
root=Path(sys.argv[1]); out=Path(sys.argv[2]); errors=[]
def h(b): return hashlib.sha256(b).hexdigest()
def j(p): return json.loads(p.read_text(encoding='utf-8'))
def git(*a): return subprocess.check_output(['git',*a],stderr=subprocess.DEVNULL)
def check(ok,label):
    if not ok: errors.append(label)
ix=j(root/'artifact-index.json'); listed=[r['file'] for r in ix['files']]
actual=[p.relative_to(root).as_posix() for p in root.rglob('*') if p.is_file() and p!=root/'artifact-index.json']
check(len(set(listed))==len(listed) and set(listed)==set(actual),'INDEX_SET')
for r in ix['files']:
    p=Path(r['file']); check(not p.is_absolute() and '..' not in p.parts,'INDEX_PATH')
    try:
        b=(root/p).read_bytes(); check(len(b)==r['bytes'] and h(b)==r['sha256'],'INDEX_BYTES '+r['file'])
    except Exception: errors.append('INDEX_MISSING '+r['file'])
m=j(root/'manifest.json'); binding=j(root/'source-binding.json'); execution=binding['execution']
body={k:v for k,v in binding.items() if k!='id'}
check(h(json.dumps(body,ensure_ascii=False,separators=(',',':')).encode())==binding['id'],'BINDING_ID')
check(m['sourceBinding']==binding and execution['head']==m['head'] and execution['tree']==m['tree'] and git('rev-parse',m['head']+'^{tree}').decode().strip()==m['tree'],'HEAD_TREE')
for s in binding['files']:
    b=(root/s['copy']).read_bytes(); blob=hashlib.sha1(b'blob '+str(len(b)).encode()+b'\0'+b).hexdigest()
    check(h(b)==s['sha256'] and len(b)==s['bytes'] and blob==s['runtimeBlobId'],'SOURCE_RAW '+s['file'])
    try: original=git('show',m['head']+':'+s['file'])
    except subprocess.CalledProcessError: original=None
    if original is not None: check(h(original)==s['headBlobSha256'] and git('rev-parse',m['head']+':'+s['file']).decode().strip()==s['headBlobId'],'SOURCE_GIT '+s['file'])
    else: check(s['headBlobId'] is None,'SOURCE_GIT_MISSING '+s['file'])
records=[]
for row in m['runs']:
    if not row.get('finishedUTC'): continue
    if m['schema']=='stage-x-b-1':
        encoded=(root/row['raw']).read_bytes(); decoded=gzip.decompress(encoded); r=json.loads(decoded)
        check(h(encoded)==row['encodedSha256'] and h(decoded)==row['rawSha256'] and r['id']==row['id'],'RAW_HASH '+row['id'])
        ref=r['sourceReference']; t=r['transport']; q=r.get('request'); times=r['timestamps']
        check(all(times.get(k) is None for k in ['T1','T2','T3']),'INTERNAL_ENDPOINT '+row['id'])
        if q:
            cutoff=t['sendInvokedAt']+12000; w=r['observationWindow']
            check(w['plannedEnd']==cutoff and w['plannedStart']==t['sendInvokedAt'] and w['postDeadlineStart']==t['sendInvokedAt']+5000 and w['endObservedAt']>=cutoff and r['cleanup']['begin']>=cutoff,'WINDOW '+row['id'])
            end=r['trace'].get('endRequested'); check(end is not None and end>=t['sendInvokedAt']+(5500 if row['group']=='A' else 12000),'TRACE_END '+row['id'])
            if q['status']=='PASS': check(t['responseKind']=='PROTOCOL_REPLY' and times['T4']==q['response']==t['normalReplyAt'] and times['T4']<=t['deadlineAt'] and t['deadlineObservedAt'] is None,'ON_TIME '+row['id'])
            else: check(times['T4'] is None and q['response'] is None,'FAILED_T4 '+row['id'])
            expected='PASS_WITHIN_DEADLINE' if q['status']=='PASS' else 'PROTOCOL_ERROR' if q['status']=='PROTOCOL_ERROR' else 'TIMEOUT_WITH_LATE_REPLY' if t['responseKind']=='PROTOCOL_REPLY' and t['callbackObservedAt'] is not None and t['callbackObservedAt']<=cutoff else 'TIMEOUT_WITHOUT_REPLY'
            check(r['classification']==expected,'CLASS '+row['id'])
        for image in r['images']:
            b=(root/image['file']).read_bytes(); check(h(b)==image['sha256'] and len(b)==image['bytes'],'PNG '+row['id'])
        records.append({'id':r['id'],'classification':r['classification'],'T4':times['T4']})
    else:
        ref=row['sourceReference']; directory=root/row['id']; source=j(directory/'product-source-index.json')
        for s in source['files']:
            original=git('show',row['head']+':'+s['file']); check(h(original)==s['sha256'],'A_GIT_SOURCE '+row['id']+'/'+s['file'])
            b=(directory/'app'/s['file']).read_bytes()
            if row['instrument'] and s['file']=='src/segregation-view.ts':
                derivation=j(directory/'instrumentation.json'); text=b.decode()
                for ins in reversed(derivation['inserts']): text=text.replace(ins['after'],ins['before'],1)
                check(h(b)==derivation['instrumentedSha256'] and text.encode()==original,'A_INSERTION '+row['id'])
            else: check(b==original,'A_BYTES '+row['id']+'/'+s['file'])
        eq=j(directory/'test-source-equivalence.json'); original=(directory/'test-source-original.ts').read_bytes(); derived=(directory/'driver/segregation.spec.ts').read_bytes()
        check(h(original)==eq['originalSha256'] and h(derived)==eq['derivedSha256'] and derived.replace(b"from './stage-x-fixture.mjs'",b"from '@playwright/test'")==original,'TEST_BODY '+row['id'])
        records.append({'id':row['id'],'status':row['status'],'instrument':row['instrument']})
    check(ref and ref['bindingId']==binding['id'] and ref['executionHead']==m['head'] and ref['executionTree']==m['tree'] and ref['runtimeSourceVerified'] is True,'RAW_SOURCE_REFERENCE '+row['id'])
result={'verifier':'Independent Python stdlib, no producer imports','verifierSha256':h(Path(__file__).read_bytes()),'head':m['head'],'tree':m['tree'],'counts':m['counts'],'correspondence':'FAIL' if errors else 'PASS','errors':errors,'records':records,'scope':'Byte/source/window consistency only. Original acquisition and observer failures are unchanged; no root-cause or performance acceptance.'}
out.write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8'); print(json.dumps({'correspondence':result['correspondence'],'errors':errors,'counts':m['counts']}));sys.exit(bool(errors))
