"""Read-only independent correspondence check; uses Python stdlib, not producer code.
Exit0 certifies available evidence correspondence, never successful captures/performance.
"""
import gzip
import hashlib
import json
import math
import pathlib
import subprocess
import sys
from datetime import datetime, timezone

root = pathlib.Path(sys.argv[1]).resolve()
errors = []
def require(ok, code):
    if not ok:
        errors.append(code)
def digest(data):
    return hashlib.sha256(data).hexdigest()
def blob(data):
    return hashlib.sha1(b'blob ' + str(len(data)).encode() + b'\0' + data).hexdigest()
def canonical(value):
    return json.dumps(value, ensure_ascii=False, separators=(',', ':')).encode()
def read(name):
    p = (root / name).resolve()
    if not p.is_relative_to(root):
        raise ValueError('unsafe path')
    return p.read_bytes()
def git(*args):
    return subprocess.check_output(['git', *args], stderr=subprocess.DEVNULL)

result = {'verifier': 'independent Python stdlib, no imported producer/auditor module',
          'verifierSha256': digest(pathlib.Path(__file__).read_bytes()),
          'utc': datetime.now(timezone.utc).isoformat(), 'errors': errors}
try:
    m = json.loads(read('manifest.json'))
    b = json.loads(read('source-binding.json'))
    index = json.loads(read('artifact-index.json'))
    result.update(head=m['head'], tree=m['tree'], bindingId=b['id'])
    require(m['schema'] == 'stage-w-1', 'SCHEMA')
    require(m['sourceBinding'] == b and m['sources'] == b['files'], 'MANIFEST_BINDING')
    require(b['contract'] == 'stage-w-source-1', 'SOURCE_CONTRACT')
    body = {k: v for k, v in b.items() if k != 'id'}
    require(digest(canonical(body)) == b['id'], 'BINDING_DIGEST')
    e = b['execution']
    require(e['head'] == m['head'] and e['tree'] == m['tree'], 'HEAD_TREE_REFERENCE')
    require(git('rev-parse', m['head'] + '^{tree}').decode().strip() == m['tree'], 'GIT_TREE')
    require(e['diagnosticRevision'] == m['diagnosticContract'] == 'stage-w-1', 'REVISION')
    require(e['runner'] == 'tools/three-body-stage-w.mjs', 'RUNNER')
    require(len(b['files']) == len({s['file'] for s in b['files']}) == 15, 'SOURCE_SET')
    for s in b['files']:
        data = read(s['copy'])
        require(s['copy'] == 'sources/runtime/' + s['file'], 'SOURCE_PATH:' + s['file'])
        require(len(data) == s['bytes'] and digest(data) == s['sha256'] and blob(data) == s['runtimeBlobId'], 'SOURCE_BYTES:' + s['file'])
        logical = digest(data.replace(b'\r\n', b'\n'))
        require(logical == s['logicalSha256'], 'SOURCE_LOGICAL:' + s['file'])
        try:
            original = git('show', m['head'] + ':' + s['file'])
        except subprocess.CalledProcessError:
            original = None
        if original is None:
            require(s['headBlobId'] is None and s['headBlobSha256'] is None, 'HEAD_BLOB_MISSING:' + s['file'])
            relation = 'NOT_IN_HEAD_DIRTY_SNAPSHOT'
        else:
            require(blob(original) == s['headBlobId'] and digest(original) == s['headBlobSha256'], 'HEAD_BLOB:' + s['file'])
            require(digest(original.replace(b'\r\n', b'\n')) == s['headLogicalSha256'], 'HEAD_LOGICAL:' + s['file'])
            relation = 'BYTE_IDENTICAL' if original == data else 'CHECKOUT_NEWLINES_ONLY' if digest(original.replace(b'\r\n', b'\n')) == logical else 'DIRTY_RECORDED_SNAPSHOT'
        require(relation == s['headRelation'] and ('DIRTY' not in relation or bool(e['workingTree'])), 'HEAD_RELATION:' + s['file'])
    require(index['sourceBindingId'] == b['id'] and index['head'] == m['head'] and index['tree'] == m['tree'] and index['diagnosticRevision'] == m['diagnosticContract'], 'INDEX_BINDING')
    names = [s['file'] for s in index['files']]
    actual = {str(p.relative_to(root)).replace('\\', '/') for p in root.rglob('*') if p.is_file() and p.name != 'artifact-index.json'}
    require(len(names) == len(set(names)) and set(names) == actual, 'INDEX_SET')
    for s in index['files']:
        data = read(s['file'])
        require(len(data) == s['bytes'] and digest(data) == s['sha256'], 'INDEX_BYTES:' + s['file'])
    sequence = [('default', 'off'), ('readback', 'early'), ('default', 'late'), ('readback', 'off'), ('default', 'early'), ('readback', 'late'), ('readback', 'late'), ('default', 'early'), ('readback', 'off'), ('default', 'late'), ('readback', 'early'), ('default', 'off')]
    require(len(m['plans']) == len(m['runs']) == 12, 'PLAN_COUNT')
    ids, targets, failed, request_failed, completed, trace_count = set(), set(), 0, 0, 0, 0
    for n, entry in enumerate(m['runs']):
        require((entry['context'], entry['traceMode']) == sequence[n], 'PLAN_ORDER')
        require(entry['id'] not in ids, 'DUPLICATE_RUN')
        ids.add(entry['id'])
        if not entry.get('finishedUTC'):
            errors.append('UNEXECUTED:' + entry['id'])
            continue
        completed += 1
        data = read(entry['raw'])
        decoded = gzip.decompress(data)
        require(len(data) == entry['bytes'] and digest(data) == entry['sha256'] and digest(decoded) == entry['decodedSha256'], 'RAW_BYTES:' + entry['id'])
        require(digest(read(entry['summary'])) == entry['summarySha256'], 'SUMMARY_BYTES:' + entry['id'])
        r = json.loads(decoded)
        summary = json.loads(read(entry['summary']))
        require(all(summary.get(k) == r.get(k) for k in ['diagnosticContract', 'sourceReference', 'fixtureWindows', 'id', 'plan', 'status', 'issues', 'timestamps', 'image', 'readback', 'before', 'after']), 'SUMMARY_CONTENT:' + entry['id'])
        require(r['id'] == entry['id'] and r['plan'] == m['plans'][n] and r['status'] == entry['status'], 'RAW_MANIFEST:' + entry['id'])
        require(r['head'] == m['head'] and r['diagnosticContract'] == m['diagnosticContract'], 'RAW_HEAD_REVISION')
        failed += r['status'] != 'PASS'
        ref = r.get('sourceReference', {})
        require(ref.get('bindingId') == b['id'] and ref.get('executionHead') == m['head'] and ref.get('executionTree') == m['tree'] and ref.get('diagnosticRevision') == 'stage-w-1' and ref.get('runtimeSourceVerified') is True and ref.get('runner') == e['runner'], 'RAW_SOURCE:' + entry['id'])
        require(ref.get('runnerSha256') == next(s['sha256'] for s in b['files'] if s['file'] == e['runner']), 'RAW_RUNNER_SHA')
        q, o, t = r.get('request'), r.get('transport'), r['timestamps']
        if not q:
            errors.append('REQUEST_MISSING:' + entry['id'])
            continue
        require(q['method'] == 'Page.captureScreenshot' and q['timeoutMs'] == 5000, 'METHOD_DEADLINE')
        require(q['params'] == {'format': 'png', 'fromSurface': True, 'clip': {'x': 0, 'y': 0, 'width': 1280, 'height': 900, 'scale': 1}, 'captureBeyondViewport': False}, 'CAPTURE_PARAMETERS')
        require(q['session'] == r['session'] and r['session']['targetId'] not in targets, 'SESSION_TARGET')
        targets.add(r['session']['targetId'])
        require(o['contract'] == t['contract'] == 'stage-w-timing-1', 'TIMING_CONTRACT')
        require(t['T0'] == o['sendInvokedAt'] == q['start'] and t['wrapperStartedAt'] == o['wrapperStartedAt'] == q['wrapperStartedAt'] and t['wrapperStartedAt'] <= t['T0'], 'SEND_WRAPPER')
        require(t['deadlineAt'] == o['deadlineAt'] == t['T0'] + 5000, 'ABSOLUTE_DEADLINE')
        require(all(t[k] is None for k in ['T1', 'T2', 'T3']), 'INVENTED_ENDPOINT')
        require(all(t[k] == o[k] for k in ['lateCallbackAt', 'deadlineObservedAt', 'callbackObservedAt', 'responseKind', 'responsePhase']), 'CALLBACK_FIELDS')
        if q['status'] == 'PASS':
            require(t['T4'] == q['response'] == o['normalReplyAt'] == o['callbackObservedAt'] and t['T0'] <= t['T4'] <= t['deadlineAt'], 'ON_TIME_T4')
            require(o['responseKind'] == 'PROTOCOL_REPLY' and o['responsePhase'] == 'MEASURED_REQUEST' and o['lateCallbackAt'] is None and o['deadlineObservedAt'] is None, 'PASS_CALLBACK_KIND')
        else:
            require(t['T4'] is None and q['response'] is None and o['normalReplyAt'] is None, 'FAILURE_T4')
        if q['status'] == 'TIMEOUT':
            require(t['deadlineObservedAt'] == q['finished'] and t['deadlineObservedAt'] >= t['deadlineAt'], 'OBSERVED_DEADLINE')
        if o['lateCallbackAt'] is not None:
            require(o['lateCallbackAt'] == o['callbackObservedAt'] and o['lateCallbackAt'] >= o['deadlineObservedAt'] and o['responsePhase'] in ['POST_DEADLINE', 'BROWSER_CLEANUP'], 'LATE_CALLBACK')
        if q['status'] != 'PASS':
            request_failed += 1
            require(r['status'] != 'PASS', 'FALSE_PASS')
        require(r['before'] == r['after'] and r['before']['step'] == r['before']['bStep'] == 30 and not r['before']['playing'], 'FROZEN_STATE')
        require(not any(c['method'] in ['Page.getLayoutMetrics', 'Page.screenshot'] for c in r['calls']), 'FORBIDDEN_API')
        w = r['fixtureWindows']
        require(w['navigationInvokedAt'] < w['frozenReadyObservedAt'] <= w['frozenWaitEnd'] <= w['captureTreatmentWaitBegin'] <= w['captureTreatmentWaitEnd'] <= q['start'], 'WINDOW_ORDER')
        if entry['traceMode'] == 'early':
            require(r['trace']['startAcknowledgedAt'] < w['navigationInvokedAt'], 'TRACE_NOT_EARLY')
        if entry['traceMode'] == 'late':
            require(w['frozenWaitEnd'] <= r['trace']['startInvokedAt'] <= r['trace']['startAcknowledgedAt'] < q['start'], 'TRACE_NOT_LATE')
        if entry['traceMode'] == 'off':
            require(r['trace']['status'] == 'OFF' and not any(c['method'].startswith('Tracing.') for c in r['calls']), 'TRACE_OFF_INTERVENTION')
        else:
            trace_count += 1
            trace_bytes = read(r['trace']['file'])
            require(digest(trace_bytes) == r['trace']['sha256'] and len(trace_bytes) == r['trace']['bytes'], 'TRACE_BYTES')
            events = json.loads(gzip.decompress(trace_bytes))['traceEvents']
            anchors = []
            main = None
            for p in r['probes']:
                found = [x for x in events if (x.get('name') == 'clock_sync' and x.get('args', {}).get('sync_id') == p['name'])] if p['kind'] == 'browser' else [x for x in events if x.get('name') == p['name'] and 'user_timing' in x.get('cat', '')]
                require(p['status'] == 'PASS' and len(found) == 1, 'CLOCK_PROBE')
                if len(found) != 1:
                    continue
                x = found[0]
                if p['kind'] == 'page':
                    if main is None:
                        main = (x['pid'], x['tid'])
                    require(main == (x['pid'], x['tid']), 'CLOCK_PID_TID')
                anchors.append((x['ts'] / 1000 - p['end'], x['ts'] / 1000 - p['begin']))
            low, high = max(a[0] for a in anchors), min(a[1] for a in anchors)
            clock = r['traceAnalysis']['clock']
            require(low <= high and clock['status'] == 'BRACKETED' and math.isclose(low, clock['offsetLow'], abs_tol=1e-7) and math.isclose(high, clock['offsetHigh'], abs_tol=1e-7), 'CLOCK_INTERVAL')
        if r['image'].get('file'):
            image = read(r['image']['file'])
            import base64
            require(digest(image) == r['image']['sha256'] and image == base64.b64decode(q['result']['data']), 'IMAGE_PAYLOAD')
    require(completed == 12 and m['counts']['all']['completed'] == completed and m['counts']['all']['failed'] == failed and m['counts']['all']['unexecuted'] == 0, 'COUNTS')
    require(trace_count == 8, 'TRACE_COUNT')
    result.update(completed=completed, failedTrials=failed, captureTimeoutOrFailure=request_failed, traceStreams=trace_count, indexedFiles=len(names), sourceFiles=len(b['files']), productAcceptance='NOT_TESTED', acquisitionAcceptance='FAIL' if failed else 'PASS')
except Exception as exc:
    errors.append(type(exc).__name__ + ': ' + str(exc))
result['correspondence'] = 'FAIL' if errors else 'PASS'
if len(sys.argv) > 2:
    pathlib.Path(sys.argv[2]).write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')
print(json.dumps(result, ensure_ascii=False))
sys.exit(1 if errors else 0)
