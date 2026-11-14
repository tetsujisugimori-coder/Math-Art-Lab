// Small review copies only; all original raw/trace files remain in isolated storage.
import fs from 'node:fs';
import path from 'node:path';
import { gunzipSync, brotliCompressSync } from 'node:zlib';
import { sha256, reportIssues } from './three-body-stage-q-contracts.mjs';
import { inputStatistics } from './three-body-stage-q-metrics.mjs';
const root = process.argv[2] ?? '.three-body-evidence/stage-s';
const dest = process.argv[3] ?? 'docs/three-body/review-44/stage-s';
const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
const files = walk(root), originals = [], rows = [], requests = [], copies = [];
const write = (file, value) => { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n'); };
let credentialCandidates = 0;
for (const file of files.filter(f => /[/\\]raw[/\\].*\.json\.gz$/.test(f))) {
  const bytes = fs.readFileSync(file), decoded = gunzipSync(bytes), r = JSON.parse(decoded), data = r.data ?? r.partial?.data;
  const id = path.relative(root, file).replaceAll('\\', '/'), stop = r.result?.stop;
  originals.push({ file, sha256: sha256(bytes), decodedSha256: sha256(decoded), bytes: bytes.length });
  credentialCandidates += [...decoded.toString().matchAll(/gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|Bearer\s+[A-Za-z0-9._-]{20,}/g)].length;
  rows.push({ id, start: r.start, finish: r.finish, options: r.options, fixture: r.fixture, readbackPolicy: r.readbackPolicy ?? 'NOT_RECORDED_IN_EARLIER_SOURCE', browser: { name: r.browser?.name, version: r.browser?.version,
    featureStatusBefore: r.browser?.gpuInfo?.gpu?.featureStatus ?? 'NOT_TESTED', featureStatusAfter: r.browser?.gpuInfoAfter?.gpu?.featureStatus ?? 'NOT_TESTED', devices: r.browser?.gpuInfo?.gpu?.devices ?? 'NOT_TESTED' },
    toolHashes: r.toolHashes, launchArgs: r.launchArgs, status: r.status, issues: reportIssues(r), capture: r.capture,
    input: inputStatistics(data?.requests ?? []), phases: r.summary?.phases, sender: r.senderProcess, hostClock: r.hostClock,
    stop: stop ? { Tminus1: stop.Tminus1, T0: stop.T0, T1: stop.T1, T2: stop.T2, T3: stop.T3, T4: stop.T4, hit: stop.targetHit,
      overlapId: stop.overlapId, uncertainty: stop.uncertainty, extraWithinPause: stop.stop?.after.step - stop.stop?.before.step,
      extraAfterStop: stop.later.step - stop.after.step, final: stop.later, T4Kind: stop.T4Kind } : null });
  requests.push({ id, sourceSha256: sha256(bytes), requests: data?.requests ?? [] });
}
for (const file of files.filter(f => /[/\\]traces[/\\].*\.json\.gz$/.test(f))) {
  const bytes = fs.readFileSync(file);
  originals.push({ file, bytes: bytes.length, sha256: sha256(bytes), decodedSha256: sha256(gunzipSync(bytes)) });
}
for (const file of files.filter(f => /[/\\]raw[/\\].*-summary\.json$|[/\\]screenshots[/\\].*\.png$|-manifest\.json$/.test(f))) {
  const bytes = fs.readFileSync(file);
  originals.push({ file, bytes: bytes.length, sha256: sha256(bytes), kind: 'uncompressed original summary/image/manifest' });
}
const copy = (source, target) => {
  const bytes = fs.readFileSync(source);
  fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, bytes);
  copies.push({ source, file: target.replaceAll('\\', '/'), bytes: bytes.length, sha256: sha256(bytes) });
};
for (const file of files.filter(f => /[/\\]sources[/\\]/.test(f))) {
  const target = path.join(dest, 'sources', path.basename(file));
  const same = copies.find(c => c.file === target.replaceAll('\\', '/'));
  if (same && same.sha256 !== sha256(fs.readFileSync(file))) throw Error('Source hash-name collision');
  if (!same) copy(file, target);
}
for (const file of files.filter(f => f.endsWith('-manifest.json'))) copy(file, path.join(dest, 'manifests', path.relative(root, file)));
for (const file of files.filter(f => /[/\\]report(?:-v2)?[/\\][^/\\]+\.json$/.test(f))) copy(file, path.join(dest, 'raw-results', path.relative(root, file)));
for (const group of ['regression', 'submission']) {
  const d = path.join(root, group);
  if (fs.existsSync(d)) for (const file of fs.readdirSync(d).filter(f => (group === 'regression' && f.endsWith('.json')) || /\.log$|gui-.*\.json$|etw-availability\.json$|preservation\.json$|drive-result\.json$|storage-availability\.json$|analysis-exits\.json$/.test(f))) copy(path.join(d, file), path.join(dest, 'raw-results', group, file));
}
const exporter = 'tools/three-body-stage-s-export.mjs';
copy(exporter, path.join(dest, 'sources', sha256(fs.readFileSync(exporter)) + '-three-body-stage-s-export.mjs'));
copy(path.join(root, 'emulation-local', 'screenshots', 'emulation-chromium-001-emulation-readback-off.png'), path.join(dest, 'screenshots', 'current-context.png'));
write(path.join(dest, 'raw-results', 'local-runs.json'), { date: new Date().toISOString(), rows, credentialCandidates });
write(path.join(dest, 'raw-results', 'originals.json'), { files: originals, remoteCopy: 'NOT_UPLOADED; CI reproductions are distinct runs' });
fs.writeFileSync(path.join(dest, 'raw-results', 'requests.json.br'), brotliCompressSync(Buffer.from(JSON.stringify(requests))));
const inventory = walk(dest).filter(file => !file.endsWith('export-index.json')).map(file => ({ file: file.replaceAll('\\', '/'), bytes: fs.statSync(file).size, sha256: sha256(fs.readFileSync(file)) }));
const bytes = inventory.reduce((sum, file) => sum + file.bytes, 0);
if (bytes > 10_000_000 || credentialCandidates) throw Error('Evidence export budget or credential-pattern review requires attention');
write(path.join(dest, 'raw-results', 'export-index.json'), { date: new Date().toISOString(), bytes, inventory, copies, credentialCandidates });
console.log(JSON.stringify({ runs: rows.length, originals: originals.length, exported: inventory.length, bytes, credentialCandidates }));
