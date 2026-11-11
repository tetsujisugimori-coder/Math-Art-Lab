import fs from 'node:fs';
import path from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { categories } from './three-body-stage-q-contracts.mjs';
import { suiteCounts, writeJson, auditSuite, readAnalysis, auditAnalysis, writeArtifactIndex, verifyArtifactIndex } from './three-body-stage-q-evidence.mjs';

export async function executeNode(args, logFile) {
  fs.mkdirSync(path.dirname(logFile), { recursive: true });
  const log = fs.openSync(logFile, 'w');
  return new Promise(resolve => {
    const child = spawn(process.execPath, args, { windowsHide: true, stdio: ['ignore', log, log] });
    let launchError;
    child.on('error', error => { launchError = String(error); });
    child.on('close', (code, signal) => {
      fs.closeSync(log);
      resolve({ code, signal, launchError: launchError ?? null });
    });
  });
}

export async function executeSuite(manifest, name, root, execute = executeNode) {
  const suite = manifest.suites.find(suite => suite.name === name);
  if (!suite || suite.status !== 'PLANNED') throw Error('Suite absent or already attempted: ' + name);
  if (manifest.blocker) {
    suite.status = 'BLOCKED';
    suite.reason = manifest.blocker;
    return suite;
  }
  suite.status = 'RUNNING';
  manifest.status = 'RUNNING';
  suite.started = new Date().toISOString();
  writeJson(path.join(root, 'pipeline-manifest.json'), manifest);
  try {
    suite.process = await execute([
      '--expose-gc', 'tools/three-body-stage-q.mjs',
      `--suite=${name}`, `--browser=${manifest.browser}`, `--output=${root}`,
    ], path.join(root, 'logs', name + '.log'));
  } catch (error) {
    suite.process = { code: null, launchError: String(error) };
  }
  const audit = auditSuite(root, name, manifest.browser, suite.planned);
  Object.assign(suite, { status: audit.status, counts: audit.counts, issues: audit.issues });
  if (suite.process.code !== 0 && !audit.issues.length) {
    suite.status = 'FAIL';
    suite.issues.push({ category: categories.measurement, code: 'CHILD_EXIT', error: JSON.stringify(suite.process) });
  }
  if (audit.status === 'BLOCKED' || suite.process.launchError) manifest.blocker = 'Environment or evidence integrity failure in ' + name;
  suite.finished = new Date().toISOString();
  writeJson(path.join(root, 'pipeline-manifest.json'), manifest);
  return suite;
}

function initialize(root, browser) {
  const file = path.join(root, 'pipeline-manifest.json');
  if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file));
  const head = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  const names = ['ci', 'mechanism', 'smoke', 'capture', 'screen', 'long', 'host', 'sender', 'lifecycle', 'targets', 'sender-targets'];
  if (browser === 'chromium') names.splice(names.indexOf('capture') + 1, 0, 'capture-probe', 'emulation');
  if (process.platform === 'win32' && browser === 'chromium') names.push('os');
  const manifest = {
    schema: 2, runId: `${process.env.GITHUB_RUN_ID ?? 'local'}-${process.platform}-${browser}-${Date.now()}`,
    head, browser, status: 'PLANNED', created: new Date().toISOString(),
    environment: { platform: process.platform, node: process.version },
    completeness: { allRunsCompleted: false, analysisAcquired: false, analysisCompleted: false,
      analysisProcessSucceeded: false, analysisVerified: false, evidenceComplete: false, acceptance: 'NOT_EVALUATED' },
    suites: names.map(name => ({ name, planned: suiteCounts[name], status: 'PLANNED' })),
  };
  writeJson(file, manifest);
  return manifest;
}

async function preflight(manifest, root) {
  try {
    const browsers = await import('@playwright/test');
    if (!fs.existsSync(browsers[manifest.browser].executablePath())) throw Error('Browser executable absent');
    execFileSync('git', ['cat-file', '-e', 'b07ccec1205ca99a1112ab8db951efbe94a51f74:src/three-body.ts']);
    fs.mkdirSync(path.join(root, 'logs'), { recursive: true });
    manifest.preflight = { status: 'PASS', finished: new Date().toISOString() };
  } catch (error) {
    manifest.preflight = { status: 'BLOCKED', error: String(error), category: categories.missing };
    manifest.blocker = 'Mandatory environment preparation failed';
  }
}

async function analyze(manifest, root) {
  if (manifest.blocker) {
    manifest.analysis = { status: 'BLOCKED', reason: manifest.blocker };
    return;
  }
  const report = await executeNode(['--expose-gc', 'tools/three-body-stage-q-report.mjs', root], path.join(root, 'logs', 'analysis.log'));
  const check = await executeNode(['tools/three-body-stage-q-check.mjs', root, `--ci=${manifest.browser}`], path.join(root, 'logs', 'checks.log'));
  manifest.analysis = { report, check, status: report.code === 0 && check.code === 0 ? 'PASS' : 'FAIL' };
}

export function finalize(manifest, root) {
  if (manifest.preflight?.status !== 'PASS') manifest.blocker ??= 'Mandatory preparation was not completed; inspect CI setup steps';
  for (const suite of manifest.suites) {
    if (suite.status === 'PLANNED' || suite.status === 'RUNNING') {
      suite.status = 'BLOCKED';
      suite.reason = manifest.blocker ?? 'Step not completed; inspect CI job log';
    }
  }
  const audits = manifest.suites.map(suite => auditSuite(root, suite.name, manifest.browser, suite.planned));
  const acquisition = readAnalysis(root);
  manifest.analysisAvailability = { status: acquisition.status, files: acquisition.files };
  let analysisIssues;
  try { analysisIssues = auditAnalysis(root, audits, acquisition); }
  catch (error) { analysisIssues = [{ category: categories.evidence, code: 'ANALYSIS_AUDIT_ERROR', error: String(error) }]; }
  const processIssues = manifest.suites.flatMap(suite => (suite.issues ?? []).filter(issue => issue.code === 'CHILD_EXIT').map(issue => ({ ...issue, suite: suite.name })));
  const analysisCompleted = ['PASS', 'FAIL'].includes(manifest.analysis?.status) && Number.isInteger(manifest.analysis?.report?.code) && Number.isInteger(manifest.analysis?.check?.code);
  const analysisProcessSucceeded = analysisCompleted && manifest.analysis.status === 'PASS' && manifest.analysis.report.code === 0 && manifest.analysis.check.code === 0;
  if (!analysisCompleted) processIssues.push({ category: categories.missing, code: 'ANALYSIS_NOT_COMPLETED', error: 'Report and checker processes did not both finish', scope: 'analysis process completion' });
  if (manifest.analysis?.status === 'FAIL' || (analysisCompleted && !analysisProcessSucceeded)) {
    processIssues.push({ category: categories.measurement, code: 'VALIDATOR_EXIT', error: JSON.stringify(manifest.analysis), scope: 'analysis/check process result; full diagnostics in logs/analysis.log and logs/checks.log' });
  }
  const issues = audits.flatMap(audit => audit.issues).concat(analysisIssues, processIssues);
  for (const suite of manifest.suites) {
    const audit = audits.find(audit => audit.name === suite.name);
    suite.counts = audit.counts;
    suite.issues = audit.issues.concat(analysisIssues.filter(issue => issue.runId?.startsWith(suite.name + '-')), processIssues.filter(issue => issue.suite === suite.name));
    suite.runOutcomes = (audit.runs ?? []).map(run => {
      const categories = [...new Set(suite.issues.filter(issue => issue.runId === run.id).map(issue => issue.category))];
      const hardFailure = categories.some(category => category !== 'C_PERFORMANCE');
      let status = hardFailure ? 'FAIL' : categories.length ? 'PARTIAL' : run.acquisitionStatus;
      if (run.acquisitionStatus === 'BLOCKED') status = 'BLOCKED';
      if (run.acquisitionStatus === 'PLANNED') status = 'NOT_TESTED';
      return { ...run, status, categories };
    });
    if (suite.status !== 'BLOCKED') {
      const hardFailure = suite.issues.some(issue => issue.category !== categories.performance);
      suite.status = hardFailure ? 'FAIL' : suite.issues.length ? 'PARTIAL' : audit.status;
    }
  }
  manifest.counts = audits.reduce((sum, audit) => {
    for (const key of ['planned', 'attempted', 'completed', 'failed', 'unexecuted']) sum[key] += audit.counts[key];
    return sum;
  }, { planned: 0, attempted: 0, completed: 0, failed: 0, unexecuted: 0 });
  manifest.issues = issues;
  manifest.evaluatedRunCounts = {
    failed: manifest.suites.flatMap(suite => suite.runOutcomes).filter(run => run.status === 'FAIL').length,
    partial: manifest.suites.flatMap(suite => suite.runOutcomes).filter(run => run.status === 'PARTIAL').length,
    scope: 'Includes analysis outcomes; counts.failed above records acquisition failures',
  };
  manifest.completeness = {
    allRunsCompleted: manifest.counts.completed === manifest.counts.planned,
    analysisAcquired: acquisition.acquired,
    analysisCompleted,
    analysisProcessSucceeded,
    analysisVerified: acquisition.acquired && !analysisIssues.some(issue => [categories.evidence, categories.missing].includes(issue.category)),
    evidenceComplete: !issues.some(issue => [categories.screenshot, categories.evidence, categories.missing].includes(issue.category)),
    acceptance: issues.length ? 'NOT_ACCEPTED' : 'ACCEPTED_OBSERVED_WINDOW',
  };
  const hardFailure = issues.some(issue => issue.category !== categories.performance);
  manifest.status = manifest.blocker ? 'BLOCKED' : hardFailure ? 'FAIL' : issues.length ? 'PARTIAL' : 'PASS';
  manifest.finished = new Date().toISOString();
  writeJson(path.join(root, 'suite-audit.json'), { audits, analysisIssues });
  writeJson(path.join(root, 'pipeline-manifest.json'), manifest);
  writeArtifactIndex(root);
  const invalid = verifyArtifactIndex(root);
  if (invalid.length) {
    try { fs.copyFileSync(path.join(root, 'artifact-index.json'), path.join(root, 'artifact-index-failure.json')); }
    catch (error) { manifest.issues.push({ category: categories.evidence, code: 'ARTIFACT_INDEX_SNAPSHOT_FAILED', error: String(error) }); }
    manifest.issues.push({ category: categories.evidence, code: 'ARTIFACT_INDEX_FAILED', error: JSON.stringify(invalid) });
    manifest.status = 'FAIL';
    manifest.completeness.evidenceComplete = false;
    manifest.completeness.acceptance = 'NOT_ACCEPTED';
    writeJson(path.join(root, 'pipeline-manifest.json'), manifest);
    writeArtifactIndex(root);
    throw Error('Artifact index failed verification: ' + JSON.stringify(invalid));
  }
}

async function main() {
  const args = Object.fromEntries(process.argv.slice(2).map(value => {
    const [key, setting] = value.replace(/^--/, '').split('=');
    return [key, setting ?? true];
  }));
  const root = args.output ?? 'test-results/stage-q';
  const manifest = initialize(root, args.browser ?? 'chromium');
  if (args.init !== undefined) return;
  if (args.preflight !== undefined) await preflight(manifest, root);
  else if (args.suite) await executeSuite(manifest, args.suite, root);
  else if (args.analyze !== undefined) await analyze(manifest, root);
  else if (args.finalize !== undefined) finalize(manifest, root);
  else throw Error('Select init, preflight, suite, analyze or finalize');
  if (args.finalize === undefined) writeJson(path.join(root, 'pipeline-manifest.json'), manifest);
  console.log(JSON.stringify({ status: manifest.status, suites: manifest.suites.map(suite => ({ name: suite.name, status: suite.status, counts: suite.counts })), completeness: manifest.completeness }));
  let status = 'PASS';
  if (args.suite) status = manifest.suites.find(suite => suite.name === args.suite).status;
  if (args.analyze !== undefined) status = manifest.analysis.status;
  if (args.finalize !== undefined) status = manifest.status;
  if (manifest.blocker || status !== 'PASS') process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
