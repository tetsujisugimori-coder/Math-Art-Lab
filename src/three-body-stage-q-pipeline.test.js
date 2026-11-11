import { afterEach, expect, test, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { gzipSync } from 'node:zlib';
import { categories, classifyLegacy, reportIssues } from '../tools/three-body-stage-q-contracts.mjs';
import { auditSuite, auditAnalysis, writeJson, writeArtifactIndex, verifyArtifactIndex } from '../tools/three-body-stage-q-evidence.mjs';
import { executeSuite, executeNode, finalize } from '../tools/three-body-stage-q-pipeline.mjs';
import { deliverFromSender } from '../tools/three-body-stage-q-sender.mjs';
import { capturePage } from '../tools/three-body-stage-q-capture.mjs';

const parent = path.resolve('test-results');
const directories = [];
function temporaryRoot() {
  fs.mkdirSync(parent, { recursive: true });
  const root = fs.mkdtempSync(path.join(parent, 'stage-r-unit-'));
  directories.push(root);
  return root;
}
afterEach(() => {
  vi.useRealTimers();
  for (const root of directories.splice(0)) {
    if (!root.startsWith(parent + path.sep) || !path.basename(root).startsWith('stage-r-unit-')) throw Error('Unsafe cleanup target');
    fs.rmSync(root, { recursive: true, force: true });
  }
});

function fixture(root, name, { captureFailure = false, environmentFailure = false } = {}) {
  const id = name + '-chromium-001-fixture';
  const options = { name: 'fixture' };
  const issue = environmentFailure
    ? { category: categories.missing, code: 'ENVIRONMENT', error: 'Browser unavailable', runId: id }
    : { category: categories.screenshot, code: 'SCREENSHOT_TIMEOUT_OR_ERROR', error: 'page.screenshot timeout 5000ms', runId: id };
  const errors = captureFailure || environmentFailure ? [issue.error] : [];
  const status = environmentFailure ? 'BLOCKED' : captureFailure ? 'FAIL' : 'PASS';
  const summary = { id, errors };
  const report = { id, options, errors, issues: errors.length ? [issue] : [], status, finish: '2026-11-11', summary };
  const file = path.join(root, 'raw', id + '.json.gz');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, gzipSync(JSON.stringify(report)));
  writeJson(path.join(root, 'raw', id + '-summary.json'), summary);
  writeJson(path.join(root, name + '-chromium-working-manifest.json'), {
    schema: 2, status, finished: '2026-11-11',
    plannedCount: 1, plannedRuns: [options],
    runs: [{ id, file, status, started: '2026-11-11', finished: '2026-11-11' }],
    counts: { planned: 1, attempted: 1, completed: 1, failed: captureFailure ? 1 : 0, unexecuted: 0 },
  });
  return { id, file };
}

test('legacy screenshot errors retain E classification without inventing a physics failure', () => {
  const error = 'TimeoutError: page.screenshot: Timeout 5000ms exceeded';
  expect(classifyLegacy(error)).toBe(categories.screenshot);
  expect(reportIssues({ id: 'old', errors: [error] })).toEqual([expect.objectContaining({ category: categories.screenshot, error })]);
});

test('screenshot failure preserves complete run evidence and permits the next independent suite', async () => {
  const root = temporaryRoot();
  const manifest = { browser: 'chromium', suites: ['capture', 'host'].map(name => ({ name, planned: 1, status: 'PLANNED' })) };
  const execute = async args => {
    const name = args.find(arg => arg.startsWith('--suite=')).split('=')[1];
    fixture(root, name, { captureFailure: name === 'capture' });
    return { code: name === 'capture' ? 1 : 0 };
  };
  expect((await executeSuite(manifest, 'capture', root, execute)).status).toBe('FAIL');
  expect((await executeSuite(manifest, 'host', root, execute)).status).toBe('PASS');
  expect(manifest.blocker).toBeUndefined();
  expect(auditSuite(root, 'capture', 'chromium', 1).counts).toEqual({ planned: 1, attempted: 1, completed: 1, failed: 1, unexecuted: 0 });
});

test('mandatory environment failure blocks later suites without attempting their child process', async () => {
  const root = temporaryRoot();
  const manifest = { browser: 'chromium', suites: ['ci', 'host'].map(name => ({ name, planned: 1, status: 'PLANNED' })) };
  let calls = 0;
  const execute = async () => { calls++; fixture(root, 'ci', { environmentFailure: true }); return { code: 1 }; };
  expect((await executeSuite(manifest, 'ci', root, execute)).status).toBe('BLOCKED');
  expect((await executeSuite(manifest, 'host', root, execute)).status).toBe('BLOCKED');
  expect(calls).toBe(1);
});

test('corrupted raw evidence blocks downstream acquisition', async () => {
  const root = temporaryRoot();
  const manifest = { browser: 'chromium', suites: [{ name: 'ci', planned: 1, status: 'PLANNED' }] };
  const execute = async () => { const { file } = fixture(root, 'ci'); fs.writeFileSync(file, 'not gzip'); return { code: 0 }; };
  const result = await executeSuite(manifest, 'ci', root, execute);
  expect(result.status).toBe('BLOCKED');
  expect(result.issues.some(issue => issue.category === categories.evidence)).toBe(true);
});

test('missing run summaries are evidence failures even when the child exited successfully', () => {
  const root = temporaryRoot();
  const { id } = fixture(root, 'ci');
  fs.unlinkSync(path.join(root, 'raw', id + '-summary.json'));
  expect(auditSuite(root, 'ci', 'chromium', 1).issues).toContainEqual(expect.objectContaining({ code: 'RUN_SUMMARY_MISMATCH', category: categories.evidence }));
});

test('absent suites report NOT_TESTED and preserve the planned count', () => {
  const result = auditSuite(temporaryRoot(), 'long', 'chromium');
  expect(result.status).toBe('NOT_TESTED');
  expect(result.counts.unexecuted).toBe(4);
});

test('analysis separately reports baseline mismatch and observational budget excess', () => {
  const root = temporaryRoot();
  const { id } = fixture(root, 'ci');
  const audit = auditSuite(root, 'ci', 'chromium', 1);
  writeJson(path.join(root, 'report', 'raw-index.json'), audit.files);
  writeJson(path.join(root, 'report', 'summary.json'), { runs: [{ id, file: audit.files[0].file, math: { phase: false }, budget: { scope: 'PRODUCT_OBSERVED_WINDOW', verdict: 'PARTIAL' } }] });
  const issues = auditAnalysis(root, [audit]);
  expect(issues.map(issue => issue.category)).toEqual([categories.math, categories.performance]);
});

test('artifact index records partial completeness and detects byte changes', () => {
  const root = temporaryRoot();
  writeJson(path.join(root, 'pipeline-manifest.json'), { runId: 'test', completeness: { allRunsCompleted: false, evidenceComplete: false } });
  fs.writeFileSync(path.join(root, 'sample.txt'), 'original');
  const index = writeArtifactIndex(root);
  expect(index.completeness.evidenceComplete).toBe(false);
  expect(verifyArtifactIndex(root)).toEqual([]);
  fs.writeFileSync(path.join(root, 'sample.txt'), 'altered');
  expect(verifyArtifactIndex(root)).toEqual([expect.objectContaining({ file: 'sample.txt' })]);
});

test('actual nonzero child exit is retained in a readable log', async () => {
  const root = temporaryRoot();
  const file = path.join(root, 'child.log');
  const result = await executeNode(['-e', "console.error('capture failed');process.exit(3)"], file);
  expect(result.code).toBe(3);
  expect(fs.readFileSync(file, 'utf8')).toContain('capture failed');
});

test('retrying a completed suite cannot overwrite its recorded result', async () => {
  const manifest = { suites: [{ name: 'capture', status: 'FAIL' }] };
  await expect(executeSuite(manifest, 'capture', temporaryRoot(), () => { throw Error('must not execute'); })).rejects.toThrow('already attempted');
});

test('dedicated sender has a separate PID and retains scheduled and actual send times', async () => {
  const deliveries = [];
  const result = await deliverFromSender(180, 0, 0, message => deliveries.push(message));
  expect(result.status).toBe('PASS');
  expect(result.pid).not.toBe(process.pid);
  expect(result.clock).toHaveLength(16);
  expect(deliveries).toHaveLength(5);
  expect(deliveries.at(-1).deadline).toBe(true);
  expect(deliveries.every(message => Number.isFinite(message.planned) && Number.isFinite(message.sent) && message.pid === result.pid)).toBe(true);
});

function completedPipeline(root, processCode = 0, checkCode = 0) {
  const { id } = fixture(root, 'ci');
  const audit = auditSuite(root, 'ci', 'chromium', 1);
  writeJson(path.join(root, 'report', 'raw-index.json'), audit.files);
  writeJson(path.join(root, 'report', 'summary.json'), { runs: [{ id, file: audit.files[0].file, math: { phase: true }, budget: { scope: 'PRODUCT_OBSERVED_WINDOW', verdict: 'PASS_OBSERVED_WINDOW' } }] });
  return {
    browser: 'chromium', preflight: { status: 'PASS' }, analysis: { status: checkCode ? 'FAIL' : 'PASS', report: { code: 0 }, check: { code: checkCode } },
    suites: [{ name: 'ci', planned: 1, status: processCode ? 'FAIL' : 'PASS', process: { code: processCode }, issues: processCode ? [{ category: categories.measurement, code: 'CHILD_EXIT', error: 'exit ' + processCode }] : [] }],
  };
}

test('finalization retains a nonzero child exit when recovered raw data all pass', () => {
  const root = temporaryRoot();
  const manifest = completedPipeline(root, 3);
  finalize(manifest, root);
  expect(manifest.status).toBe('FAIL');
  expect(manifest.issues).toContainEqual(expect.objectContaining({ code: 'CHILD_EXIT' }));
});

test('finalization retains checker failure independently of raw acceptance', () => {
  const root = temporaryRoot();
  const manifest = completedPipeline(root, 0, 1);
  finalize(manifest, root);
  expect(manifest.status).toBe('FAIL');
  expect(manifest.issues).toContainEqual(expect.objectContaining({ code: 'VALIDATOR_EXIT' }));
});

test('unfinished manifest and run status disagreement cannot be accepted as full evidence', () => {
  const root = temporaryRoot();
  fixture(root, 'ci');
  const file = path.join(root, 'ci-chromium-working-manifest.json');
  const manifest = JSON.parse(fs.readFileSync(file));
  delete manifest.finished;
  manifest.runs[0].status = 'RUNNING';
  writeJson(file, manifest);
  const result = auditSuite(root, 'ci', 'chromium', 1);
  expect(result.status).toBe('BLOCKED');
  expect(result.issues.map(issue => issue.code)).toContain('RUN_TERMINAL_MISMATCH');
});

test('analysis row duplication is detected even when the row count matches', () => {
  const root = temporaryRoot();
  completedPipeline(root);
  const audit = auditSuite(root, 'ci', 'chromium', 1);
  const file = path.join(root, 'report', 'summary.json');
  const summary = JSON.parse(fs.readFileSync(file));
  summary.runs[0].id = 'another-run';
  writeJson(file, summary);
  expect(auditAnalysis(root, [audit])).toContainEqual(expect.objectContaining({ code: 'ANALYSIS_RUN_SET' }));
});

test('sender delivery errors produce FAIL while retaining actual request timestamps', async () => {
  const record = await deliverFromSender(37, 0, 0, () => { throw Error('relay unavailable'); });
  expect(record.status).toBe('FAIL');
  expect(record.errors).toContain('Error: relay unavailable');
  expect(record.requests[0].sent).toBeTypeOf('number');
});

test('existing analysis files cannot substitute for unfinished checker execution', () => {
  const root = temporaryRoot();
  const manifest = completedPipeline(root);
  delete manifest.analysis;
  finalize(manifest, root);
  expect(manifest.status).toBe('FAIL');
  expect(manifest.completeness.analysisCompleted).toBe(false);
  expect(manifest.issues).toContainEqual(expect.objectContaining({ code: 'ANALYSIS_NOT_COMPLETED' }));
});

test('CDP metrics preparation is included in the five second capture deadline', async () => {
  vi.useFakeTimers();
  const promise = capturePage({}, { send: () => new Promise(() => {}) }, path.join(temporaryRoot(), 'capture.png'), 'cdp-surface');
  const rejected = expect(promise).rejects.toThrow('capture timeout 5000ms');
  await vi.advanceTimersByTimeAsync(5001);
  await rejected;
});

test.each(['summary.json', 'raw-index.json'])('P3-05: corrupt %s cannot report analysis acquired', file => {
  const root = temporaryRoot();
  const manifest = completedPipeline(root);
  fs.writeFileSync(path.join(root, 'report', file), '{invalid JSON');
  finalize(manifest, root);
  expect(manifest.status).toBe('FAIL');
  expect(manifest.completeness.analysisAcquired).toBe(false);
  expect(manifest.completeness.evidenceComplete).toBe(false);
  expect(manifest.completeness.acceptance).toBe('NOT_ACCEPTED');
  expect(manifest.analysisAvailability.status).toBe('UNREADABLE');
  expect(manifest.analysisAvailability.files.every(file => file.present && file.bytesReadable)).toBe(true);
  expect(manifest.completeness.analysisCompleted).toBe(true);
  expect(manifest.completeness.analysisProcessSucceeded).toBe(true);
  expect(manifest.completeness.analysisVerified).toBe(false);
});

test('P3-05: healthy evidence distinguishes acquisition, process completion, success and verification', () => {
  const root = temporaryRoot();
  const manifest = completedPipeline(root);
  finalize(manifest, root);
  expect(manifest.analysisAvailability.status).toBe('AVAILABLE');
  expect(manifest.completeness).toEqual({ allRunsCompleted: true, analysisAcquired: true, analysisCompleted: true,
    analysisProcessSucceeded: true, analysisVerified: true, evidenceComplete: true, acceptance: 'ACCEPTED_OBSERVED_WINDOW' });
});

test('P3-05: missing summary retains the remaining raw index availability', () => {
  const root = temporaryRoot();
  const manifest = completedPipeline(root);
  fs.unlinkSync(path.join(root, 'report', 'summary.json'));
  finalize(manifest, root);
  expect(manifest.analysisAvailability.status).toBe('ABSENT');
  expect(manifest.analysisAvailability.files.map(file => file.present)).toEqual([false, true]);
  expect(manifest.completeness).toMatchObject({ analysisAcquired: false, analysisCompleted: true, analysisVerified: false, evidenceComplete: false, acceptance: 'NOT_ACCEPTED' });
});

test.each(['summary.json', 'raw-index.json'])('P3-05: parseable but invalid %s schema cannot be acquired as analysis', file => {
  const root = temporaryRoot();
  const manifest = completedPipeline(root);
  writeJson(path.join(root, 'report', file), null);
  finalize(manifest, root);
  expect(manifest.analysisAvailability.status).toBe('INVALID_SCHEMA');
  expect(manifest.completeness).toMatchObject({ analysisAcquired: false, analysisVerified: false, evidenceComplete: false, acceptance: 'NOT_ACCEPTED' });
});

test.each(['duplicate', 'missing'])('P3-05: readable %s run set is acquired but not verified', mode => {
  const root = temporaryRoot();
  const manifest = completedPipeline(root);
  const file = path.join(root, 'report', 'summary.json'), summary = JSON.parse(fs.readFileSync(file));
  summary.runs = mode === 'duplicate' ? [summary.runs[0], summary.runs[0]] : [];
  writeJson(file, summary);
  finalize(manifest, root);
  expect(manifest.analysisAvailability.status).toBe('AVAILABLE');
  expect(manifest.completeness).toMatchObject({ analysisAcquired: true, analysisCompleted: true, analysisVerified: false, evidenceComplete: false, acceptance: 'NOT_ACCEPTED' });
});

test.each(['report', 'check'])('P3-05: abnormal %s exit is completed but unsuccessful with complete readable evidence', process => {
  const root = temporaryRoot();
  const manifest = completedPipeline(root);
  manifest.analysis[process].code = 7;
  manifest.analysis.status = 'FAIL';
  finalize(manifest, root);
  expect(manifest.status).toBe('FAIL');
  expect(manifest.completeness).toMatchObject({ analysisAcquired: true, analysisCompleted: true,
    analysisProcessSucceeded: false, analysisVerified: true, evidenceComplete: true, acceptance: 'NOT_ACCEPTED' });
  expect(manifest.issues).toContainEqual(expect.objectContaining({ code: 'VALIDATOR_EXIT' }));
});

test('P3-05: interrupted report process cannot imply completed analysis', () => {
  const root = temporaryRoot();
  const manifest = completedPipeline(root);
  manifest.analysis.report = { code: null, signal: 'SIGTERM' };
  manifest.analysis.status = 'FAIL';
  finalize(manifest, root);
  expect(manifest.completeness).toMatchObject({ analysisAcquired: true, analysisCompleted: false,
    analysisProcessSucceeded: false, evidenceComplete: false, acceptance: 'NOT_ACCEPTED' });
});

test('P3-05: inconsistent process status cannot override an abnormal exit code', () => {
  const root = temporaryRoot();
  const manifest = completedPipeline(root);
  manifest.analysis.report.code = 3;
  finalize(manifest, root);
  expect(manifest.status).toBe('FAIL');
  expect(manifest.completeness.analysisProcessSucceeded).toBe(false);
});

test('P3-05: artifact byte change during finalization persists failed completeness', () => {
  const root = temporaryRoot();
  const manifest = completedPipeline(root);
  const originalRename = fs.renameSync;
  let changed = false;
  const spy = vi.spyOn(fs, 'renameSync').mockImplementation((source, target) => {
    originalRename(source, target);
    if (!changed && target === path.join(root, 'artifact-index.json')) {
      changed = true;
      fs.writeFileSync(path.join(root, 'raw', 'ci-chromium-001-fixture-summary.json'), 'changed');
    }
  });
  try {
    expect(() => finalize(manifest, root)).toThrow('Artifact index failed verification');
  } finally { spy.mockRestore(); }
  expect(manifest.status).toBe('FAIL');
  expect(manifest.completeness.evidenceComplete).toBe(false);
  expect(manifest.completeness.acceptance).toBe('NOT_ACCEPTED');
  const saved = JSON.parse(fs.readFileSync(path.join(root, 'pipeline-manifest.json')));
  expect(saved.issues).toContainEqual(expect.objectContaining({ code: 'ARTIFACT_INDEX_FAILED' }));
});

test('P3-05: unreadable artifact index cannot leave a PASS manifest', () => {
  const root = temporaryRoot(), manifest = completedPipeline(root), originalRename = fs.renameSync;
  let changed = false;
  const spy = vi.spyOn(fs, 'renameSync').mockImplementation((source, target) => {
    originalRename(source, target);
    if (!changed && target === path.join(root, 'artifact-index.json')) {
      changed = true;
      fs.writeFileSync(target, '{invalid JSON');
    }
  });
  try { expect(() => finalize(manifest, root)).toThrow(); } finally { spy.mockRestore(); }
  expect(manifest.status).toBe('FAIL');
  expect(manifest.completeness.evidenceComplete).toBe(false);
  expect(manifest.completeness.acceptance).toBe('NOT_ACCEPTED');
  expect(fs.readFileSync(path.join(root, 'artifact-index-failure.json'), 'utf8')).toBe('{invalid JSON');
});

test('P3-05: artifact completeness metadata and file sets must agree with the saved manifest and bytes', () => {
  const root = temporaryRoot();
  writeJson(path.join(root, 'pipeline-manifest.json'), { runId: 'index-test', completeness: { evidenceComplete: false } });
  const index = writeArtifactIndex(root);
  index.completeness.evidenceComplete = true;
  index.files = [];
  writeJson(path.join(root, 'artifact-index.json'), index);
  expect(verifyArtifactIndex(root)).toEqual(expect.arrayContaining([
    expect.objectContaining({ code: 'ARTIFACT_INDEX_METADATA' }),
    expect.objectContaining({ code: 'ARTIFACT_INDEX_FILE_SET' }),
  ]));
});
