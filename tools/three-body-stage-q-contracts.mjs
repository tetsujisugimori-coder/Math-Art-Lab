import { createHash } from 'node:crypto';

export const categories = Object.freeze({
  math: 'A_MATH',
  safety: 'B_STOP_DISPLAY',
  performance: 'C_PERFORMANCE',
  measurement: 'D_MEASUREMENT',
  screenshot: 'E_SCREENSHOT',
  evidence: 'F_EVIDENCE',
  missing: 'G_NOT_ACQUIRED',
});

export function recordIssue(report, category, code, error, scope) {
  const issue = {
    category, code, scope, runId: report.id,
    at: performance.now(), clock: 'harness Node monotonic milliseconds',
    error: String(error),
  };
  (report.issues ??= []).push(issue);
  report.errors.push(issue.error);
  return issue;
}

export function classifyLegacy(error) {
  const message = String(error);
  if (message.includes('page.screenshot')) return categories.screenshot;
  if (/continued after stop|pending work|A\/B mismatch|display mismatch|component remains|lesson state|rapid pause/.test(message)) return categories.safety;
  if (/missing stop|deadline/.test(message)) return categories.missing;
  return categories.measurement;
}

export function reportIssues(report) {
  const explicit = report.issues ?? [];
  const legacy = (report.errors ?? []).filter(error => !explicit.some(issue => issue.error === error));
  return explicit.concat(legacy.map(error => ({
    category: classifyLegacy(error), code: 'LEGACY_ERROR',
    runId: report.id, error, scope: 'legacy error retained verbatim',
  })));
}

export function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

export function suiteState({ planned, completed, failed, blocked = false, partial = false }) {
  if (blocked) return 'BLOCKED';
  if (failed) return 'FAIL';
  if (!completed) return 'NOT_TESTED';
  if (completed !== planned || partial) return 'PARTIAL';
  return 'PASS';
}
