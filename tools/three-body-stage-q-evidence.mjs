import fs from 'node:fs';
import path from 'node:path';
import { gunzipSync } from 'node:zlib';
import { categories, reportIssues, sha256, suiteState } from './three-body-stage-q-contracts.mjs';

export const suiteCounts = Object.freeze({
  ci: 4, smoke: 4, capture: 36, 'capture-probe': 18, screen: 72,
  long: 4, host: 9, sender: 9, 'sender-targets': 9, lifecycle: 15, targets: 9, os: 6,
});

export function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temporary = file + '.tmp';
  fs.writeFileSync(temporary, JSON.stringify(value, null, 2) + '\n');
  fs.renameSync(temporary, file);
}

export function auditSuite(root, name, browser, expected = suiteCounts[name]) {
  const issues = [];
  const add = (category, code, error, runId = null) => issues.push({ category, code, error, runId });
  const manifestFile = path.join(root, `${name}-${browser}-working-manifest.json`);
  const counts = { planned: expected, attempted: 0, completed: 0, failed: 0, unexecuted: expected };
  const files = [];
  if (!fs.existsSync(manifestFile)) {
    add(categories.missing, 'MANIFEST_ABSENT', manifestFile);
    return { name, status: 'NOT_TESTED', counts, issues, files };
  }
  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(manifestFile));
  } catch (error) {
    add(categories.evidence, 'MANIFEST_UNREADABLE', String(error));
    return { name, status: 'BLOCKED', counts, issues, files };
  }
  if (manifest.plannedCount !== expected || manifest.plannedRuns?.length !== expected || manifest.runs?.length !== expected) {
    add(categories.evidence, 'PLAN_MISMATCH', `Expected ${expected} planned entries`);
  }
  if (!manifest.finished || !['PASS', 'FAIL', 'PARTIAL', 'BLOCKED'].includes(manifest.status)) add(categories.evidence, 'MANIFEST_UNFINALIZED', manifestFile);
  const ids = new Set();
  for (const [index, entry] of (manifest.runs ?? []).entries()) {
    if (ids.has(entry.id)) add(categories.evidence, 'DUPLICATE_RUN', entry.id, entry.id);
    ids.add(entry.id);
    if (!fs.existsSync(entry.file)) {
      if (entry.started || ['PASS', 'FAIL'].includes(entry.status)) add(categories.evidence, 'RAW_ABSENT', entry.file, entry.id);
      else add(categories.missing, 'UNEXECUTED', entry.status, entry.id);
      continue;
    }
    counts.attempted++;
    try {
      const encoded = fs.readFileSync(entry.file);
      const decoded = gunzipSync(encoded);
      const report = JSON.parse(decoded);
      files.push({ id: entry.id, file: entry.file, sha256: sha256(encoded), decodedSha256: sha256(decoded) });
      if (report.id !== entry.id || JSON.stringify(report.options) !== JSON.stringify(manifest.plannedRuns[index])) add(categories.evidence, 'RAW_PLAN_MISMATCH', entry.file, entry.id);
      if (manifest.schema >= 2 && (entry.status !== report.status || entry.finished !== report.finish)) add(categories.evidence, 'RUN_TERMINAL_MISMATCH', JSON.stringify({ entry, rawStatus: report.status, rawFinish: report.finish }), entry.id);
      if (report.finish) counts.completed++;
      else add(categories.missing, 'RUN_UNFINISHED', entry.file, entry.id);
      const runIssues = reportIssues(report);
      issues.push(...runIssues);
      if (report.status === 'FAIL') counts.failed++;
      if (report.status === 'BLOCKED') add(categories.missing, 'ENVIRONMENT_BLOCKED', 'Browser preparation failed', entry.id);
      const summaryFile = path.join(root, 'raw', `${entry.id}-summary.json`);
      if (!fs.existsSync(summaryFile) || JSON.stringify(JSON.parse(fs.readFileSync(summaryFile))) !== JSON.stringify(report.summary)) add(categories.evidence, 'RUN_SUMMARY_MISMATCH', summaryFile, entry.id);
      if (report.capture?.file) {
        if (!fs.existsSync(report.capture.file) || sha256(fs.readFileSync(report.capture.file)) !== report.capture.sha256) add(categories.evidence, 'SCREENSHOT_HASH', report.capture.file, entry.id);
      }
      if (report.capture?.status === 'FAIL' && !runIssues.some(issue => issue.category === categories.screenshot)) add(categories.evidence, 'UNCLASSIFIED_CAPTURE', 'Capture failed without an E_SCREENSHOT issue', entry.id);
      if (report.trace) {
        if (!fs.existsSync(report.trace.file)) add(categories.evidence, 'TRACE_ABSENT', report.trace.file, entry.id);
        else {
          const trace = fs.readFileSync(report.trace.file);
          if (report.trace.sha256 && sha256(trace) !== report.trace.sha256) add(categories.evidence, 'TRACE_HASH', report.trace.file, entry.id);
          if (!Array.isArray(JSON.parse(gunzipSync(trace)).traceEvents)) add(categories.evidence, 'TRACE_SCHEMA', report.trace.file, entry.id);
        }
      }
    } catch (error) {
      add(categories.evidence, 'RAW_UNREADABLE', String(error), entry.id);
    }
  }
  counts.unexecuted = expected - counts.attempted;
  if (manifest.counts && ['planned', 'attempted', 'completed', 'failed', 'unexecuted'].some(key => manifest.counts[key] !== counts[key])) add(categories.evidence, 'COUNT_MISMATCH', JSON.stringify({ manifest: manifest.counts, audited: counts }));
  const blocked = issues.some(issue => issue.category === categories.evidence || issue.code === 'ENVIRONMENT_BLOCKED');
  return {
    name, counts, files, issues, runs: manifest.runs.map(entry => ({ id: entry.id, acquisitionStatus: entry.status })),
    status: suiteState({ ...counts, blocked }),
  };
}

export function auditAnalysis(root, audits) {
  const issues = [];
  const summaryFile = path.join(root, 'report', 'summary.json');
  const indexFile = path.join(root, 'report', 'raw-index.json');
  if (!fs.existsSync(summaryFile) || !fs.existsSync(indexFile)) return [{ category: categories.missing, code: 'ANALYSIS_ABSENT', error: 'Analysis or raw index not acquired' }];
  const rows = JSON.parse(fs.readFileSync(summaryFile)).runs;
  const index = JSON.parse(fs.readFileSync(indexFile));
  const files = audits.flatMap(audit => audit.files);
  if (index.length !== files.length || rows.length !== files.length) issues.push({ category: categories.evidence, code: 'ANALYSIS_COUNT', error: 'raw / analysis / index counts differ' });
  for (const file of files) {
    const matching = index.filter(row => row.id === file.id);
    if (matching.length !== 1 || matching[0].file.replaceAll('\\', '/') !== file.file.replaceAll('\\', '/') || matching[0].sha256 !== file.sha256 || matching[0].decodedSha256 !== file.decodedSha256) issues.push({ category: categories.evidence, code: 'ANALYSIS_HASH', runId: file.id, error: 'Index file/hash differs from raw' });
    const summaries = rows.filter(row => row.id === file.id);
    if (summaries.length !== 1 || summaries[0].file?.replaceAll('\\', '/') !== file.file.replaceAll('\\', '/')) issues.push({ category: categories.evidence, code: 'ANALYSIS_RUN_SET', runId: file.id, error: 'Analysis row missing, duplicated or referring to a different raw file' });
  }
  for (const row of rows) {
    if (row.options?.trace && row.browser?.name === 'chromium' && (!row.trace?.clock?.completeMarkerSet || row.trace.dataLoss === true)) issues.push({ category: categories.measurement, code: 'TRACE_VALIDATION', runId: row.id, error: 'Trace missing, clock markers incomplete or data lost' });
    if (row.options?.positive === 'worker' && row.input.scheduledToSend.max < 50) issues.push({ category: categories.measurement, code: 'WORKER_POSITIVE_CONTROL', runId: row.id, error: 'Worker timer-delay control was not detected' });
    if (row.options?.positive === 'main' && (!row.stop?.targetHit || row.input.sendToReceive.max < 50)) issues.push({ category: categories.measurement, code: 'MAIN_POSITIVE_CONTROL', runId: row.id, error: 'Synthetic main delay or HIT was not detected' });
    if (row.math?.phase === false || row.math?.history === false || row.math?.publicPosition === false) issues.push({ category: categories.math, code: 'BASELINE_MISMATCH', runId: row.id, error: JSON.stringify(row.math) });
    if (row.draw?.a === false || row.draw?.b === false || row.frames?.mismatch || row.stop?.extraWithinPause || row.stop?.extraAfterStop || row.stop?.atomic === false) issues.push({ category: categories.safety, code: 'STATE_DISPLAY_MISMATCH', runId: row.id, error: JSON.stringify({ draw: row.draw, frames: row.frames, stop: row.stop }) });
    if (row.budget.scope !== 'SYNTHETIC_DETECTOR_NOT_PRODUCT' && row.budget.verdict !== 'PASS_OBSERVED_WINDOW') issues.push({ category: categories.performance, code: row.budget.verdict, runId: row.id, error: JSON.stringify(row.budget) });
  }
  return issues;
}

export function writeArtifactIndex(root) {
  const indexFile = path.join(root, 'artifact-index.json');
  const walk = directory => fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? walk(path.join(directory, entry.name)) : [path.join(directory, entry.name)]);
  const files = walk(root).filter(file => file !== indexFile && !file.endsWith('.tmp')).map(file => {
    const bytes = fs.readFileSync(file);
    return { file: path.relative(root, file).replaceAll('\\', '/'), bytes: bytes.length, sha256: sha256(bytes) };
  });
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'pipeline-manifest.json')));
  const record = { date: new Date().toISOString(), runId: manifest.runId, completeness: manifest.completeness, files };
  writeJson(indexFile, record);
  return record;
}

export function verifyArtifactIndex(root) {
  const index = JSON.parse(fs.readFileSync(path.join(root, 'artifact-index.json')));
  return index.files.filter(record => {
    const file = path.resolve(root, record.file);
    const inside = file.startsWith(path.resolve(root) + path.sep);
    return !inside || !fs.existsSync(file) || sha256(fs.readFileSync(file)) !== record.sha256;
  });
}
