import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { gunzipSync, brotliCompressSync } from 'node:zlib';
import { sha256, reportIssues } from './three-body-stage-q-contracts.mjs';
import { inputStatistics } from './three-body-stage-q-metrics.mjs';
import { writeJson } from './three-body-stage-q-evidence.mjs';

const root = process.argv[2] ?? '.three-body-evidence/stage-r';
const destination = process.argv[3] ?? 'docs/three-body/review-44/stage-r';
const groups = ['capture-local', 'probe-local', 'probe-matched', 'probe-emulation', 'integration', 'repro-os', 'sender-targets-local'];
const rows = [], originals = [], requests = [], copies = [];
let credentialCandidates = 0;
function copy(file, target) {
  const bytes = fs.readFileSync(file);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, bytes);
  copies.push({ source: file.replaceAll('\\', '/'), file: target.replaceAll('\\', '/'), bytes: bytes.length, sha256: sha256(bytes) });
}
for (const group of groups) {
  const directory = path.join(root, group);
  const raw = path.join(directory, 'raw');
  if (!fs.existsSync(raw)) continue;
  for (const file of fs.readdirSync(raw).filter(file => file.endsWith('.json.gz'))) {
    const original = path.join(raw, file), encoded = fs.readFileSync(original), decoded = gunzipSync(encoded), report = JSON.parse(decoded);
    const data = report.data ?? report.partial?.data;
    const stop = report.result?.stop;
    const id = group + '/' + report.id;
    credentialCandidates += [...decoded.toString().matchAll(/gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|Bearer\s+[A-Za-z0-9._-]{20,}/g)].length;
    originals.push({ id, file: original.replaceAll('\\', '/'), bytes: encoded.length, sha256: sha256(encoded), decodedSha256: sha256(decoded) });
    rows.push({
      id, start: report.start, finish: report.finish, options: report.options,
      status: report.status ?? 'LEGACY_NOT_RECLASSIFIED', issues: reportIssues(report),
      browser: { name: report.browser?.name, version: report.browser?.version }, launchArgs: report.launchArgs,
      fixture: report.fixture, toolHashes: report.toolHashes, capture: report.capture,
      input: inputStatistics(data?.requests ?? []), phase: report.summary?.phases,
      nativeLong: (data?.spans ?? []).filter(span => span.name.startsWith('native.') && span.end - span.begin >= 50).map(span => ({ ...span, elapsedMs: span.end - span.begin })),
      stop: stop ? { Tminus1: stop.Tminus1, T0: stop.T0, T1: stop.T1, T2: stop.T2, T3: stop.T3, T4: stop.T4, target: stop.target, hit: stop.targetHit, overlapId: stop.overlapId, uncertainty: stop.uncertainty, extraWithinPause: stop.stop?.after.step - stop.stop?.before.step, extraAfterStop: stop.later.step - stop.after.step, abSameTime: !stop.later.ab || stop.later.step === stop.later.bStep, T4Kind: stop.T4Kind } : null,
      sender: report.senderProcess, hostClock: report.hostClock, syncs: report.syncs,
    });
    requests.push({ id, requests: data?.requests ?? [], sourceEncodedSha256: sha256(encoded) });
    if (report.trace?.file && fs.existsSync(report.trace.file)) {
      const bytes = fs.readFileSync(report.trace.file);
      originals.push({ id: id + '/trace', file: report.trace.file, bytes: bytes.length, sha256: sha256(bytes), decodedSha256: sha256(gunzipSync(bytes)) });
    }
  }
  for (const file of fs.readdirSync(directory).filter(file => file.endsWith('-manifest.json'))) copy(path.join(directory, file), path.join(destination, 'manifests', group, file));
  const sources = path.join(directory, 'sources');
  if (fs.existsSync(sources)) for (const file of fs.readdirSync(sources)) {
    const target = path.join(destination, 'sources', file);
    if (!copies.some(record => record.file === target.replaceAll('\\', '/'))) copy(path.join(sources, file), target);
  }
  const analyses = path.join(directory, 'report');
  if (fs.existsSync(analyses)) for (const file of fs.readdirSync(analyses).filter(file => file.endsWith('trace-excerpt.json') || ['checks.json', 'summary.json', 'raw-index.json'].includes(file))) copy(path.join(analyses, file), path.join(destination, 'raw-results', group, file));
  if (fs.existsSync(path.join(directory, 'artifact-index.json'))) copy(path.join(directory, 'artifact-index.json'), path.join(destination, 'raw-results', group, 'artifact-index.json'));
}
writeJson(path.join(destination, 'raw-results', 'local-runs.json'), { date: new Date().toISOString(), credentialCandidates, rows });
writeJson(path.join(destination, 'raw-results', 'originals.json'), { remoteCopy: 'LOCAL_ORIGINALS_NOT_UPLOADED; CI artifact is a distinct execution', files: originals });
fs.writeFileSync(path.join(destination, 'raw-results', 'requests.json.br'), brotliCompressSync(Buffer.from(JSON.stringify(requests))));
const regression = path.join(root, 'regression');
if (fs.existsSync(regression)) for (const file of fs.readdirSync(regression).filter(file => file.endsWith('.json'))) copy(path.join(regression, file), path.join(destination, 'raw-results', file));
const submission = '.three-body-evidence/stage-r-submission';
for (const file of ['unit-pipeline.log', 'unit-final.log', 'unit-final-2.log', 'unit-final-3.log', 'unit-final-4.log', 'unit-release.log', 'gui-development.json', 'gui-production.json', 'typecheck.log', 'build-development.log', 'build-production.log']) {
  if (fs.existsSync(path.join(submission, file))) copy(path.join(submission, file), path.join(destination, 'raw-results', file));
}
copy(path.join(root, 'probe-emulation/screenshots/capture-probe-chromium-001-probe-readback-playwright.png'), path.join(destination, 'screenshots', 'current-context.png'));
const protectedDiff = execFileSync('git', ['diff', '--name-only', '875a27c', '--', 'docs/three-body/review-44/stage-p', 'docs/three-body/review-44/stage-q'], { encoding: 'utf8' }).trim();
const walk = directory => fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? walk(path.join(directory, entry.name)) : [path.join(directory, entry.name)]);
const totalBytes = walk(destination).reduce((sum, file) => sum + fs.statSync(file).size, 0);
const inventory = walk(destination).filter(file => !file.endsWith('export-index.json')).map(file => ({ file: file.replaceAll('\\', '/'), bytes: fs.statSync(file).size, sha256: sha256(fs.readFileSync(file)) }));
writeJson(path.join(destination, 'raw-results', 'export-index.json'), { date: new Date().toISOString(), totalBytes, protectedStagePAndQDiff: protectedDiff, credentialCandidates, copies, inventory });
console.log(JSON.stringify({ runs: rows.length, originalFiles: originals.length, totalBytes, protectedDiff, credentialCandidates }));
if (protectedDiff || credentialCandidates) process.exitCode = 1;
