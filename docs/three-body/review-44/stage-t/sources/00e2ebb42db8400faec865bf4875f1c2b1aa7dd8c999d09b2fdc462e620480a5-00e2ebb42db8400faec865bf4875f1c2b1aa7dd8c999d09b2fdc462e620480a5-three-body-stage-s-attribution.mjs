// Trace overlap is observational evidence, never a decomposition of waiting causes.
import { analyzeTrace, completeEvents, unionOverlap, distribution } from './three-body-stage-p-analysis.mjs';
import { clockBracket } from './three-body-stage-q-metrics.mjs';

const groups = {
  javascript: /FunctionCall|V8.Execute|EvaluateScript/,
  layout: /^Layout$|UpdateLayoutTree/,
  paint: /^Paint$|^PrePaint$|^PaintImage$/,
  rasterization: /RasterTask|RasterBufferImpl::Playback|Rasterize/,
  compositing: /Composite|DrawFrame|Commit|ActivateLayerTree/,
  synchronousGC: /GC|Scaveng|MarkCompact/,
  recordedWait: /WaitForCommitCompletion|SyncToken::Wait|VerifyFlush|WaitableEvent/,
};

export function attributeTrace(events, data, capture = null) {
  const analysis = analyzeTrace(events, data), clock = analysis.clock;
  if (!clock.completeMarkerSet) return { status: 'NOT_TESTED_CLOCK', clock };
  const completed = completeEvents(events), main = completed.filter(e => e.pid === clock.mainPid && e.tid === clock.mainTid);
  const taskName = main.some(e => e.name === 'RunTask') ? 'RunTask' : 'ThreadControllerImpl::RunTask';
  const tasks = main.filter(e => e.name === taskName);
  const inWindow = e => e.ts / 1000 >= analysis.window.beginMs && (e.ts + e.dur) / 1000 <= analysis.window.endMs;
  const maximum = tasks.filter(inWindow).sort((a, b) => b.dur - a.dur)[0];
  const overlaps = (begin, end) => Object.fromEntries(Object.entries(groups).map(([name, regex]) => {
    const observed = completed.filter(e => regex.test(e.name) && e.ts / 1000 < end && (e.ts + e.dur) / 1000 > begin);
    const sameMain = observed.filter(e => e.pid === clock.mainPid && e.tid === clock.mainTid);
    const longest = observed.reduce((a, b) => !a || b.dur > a.dur ? b : a, null);
    return [name, { mainUnionWallMs: unionOverlap(sameMain, begin, end), allThreadsUnionWallMs: unionOverlap(observed, begin, end),
      eventCount: observed.length, identities: [...new Set(observed.map(e => `${e.pid}:${e.tid}`))], names: [...new Set(observed.map(e => e.name))],
      longestEvent: longest ? { name: longest.name, pid: longest.pid, tid: longest.tid, tsUs: longest.ts, wallMs: longest.dur / 1000,
        threadCpuMs: Number.isFinite(longest.tdur) ? longest.tdur / 1000 : null } : null }];
  }));
  const describe = (kind, begin, end, source = {}) => {
    const task = tasks.find(e => e.ts / 1000 <= begin && (e.ts + e.dur) / 1000 >= end);
    return { kind, ...source, traceBeginMs: begin, traceEndMs: end, wallMs: end - begin,
      enclosingTask: task ? { pid: task.pid, tid: task.tid, tsUs: task.ts, durUs: task.dur,
        threadCpuMs: Number.isFinite(task.tdur) ? task.tdur / 1000 : null } : null,
      overlap: overlaps(begin, end), interpretation: 'Union elapsed overlap is clipped to this sample. longestEvent wall/CPU are full event values. Nested categories are not additive; enclosing Task CPU belongs to the entire Task. No allocation of wall minus CPU to causes.' };
  };
  const samples = (data.spans ?? []).filter(s => s.end - s.begin >= 50).map(s => describe(s.name, s.begin + clock.offsetMs, s.end + clock.offsetMs, { diagnosticSpanId: s.id }));
  if (maximum) samples.push(describe('maximum-main-task', maximum.ts / 1000, (maximum.ts + maximum.dur) / 1000));
  let screenshot = { status: 'NOT_TESTED', reason: 'No trace-active screenshot interval' };
  if (capture?.traceActive && Number.isFinite(capture.begin) && capture.clockBefore?.length && capture.clockAfter?.length) {
    const before = clockBracket(capture.clockBefore), after = clockBracket(capture.clockAfter);
    const begin = capture.begin + before.offset + clock.offsetMs;
    const finish = capture.acquiredAt ?? capture.end;
    const end = finish + after.offset + clock.offsetMs;
    screenshot = { status: 'OBSERVED_ELAPSED_RANGE', api: capture.api ?? 'playwright', captureStatus: capture.status,
      before, after, clockUncertaintyMs: Math.max(before.halfWidth, after.halfWidth) + clock.markBracketMs,
      ...describe('capture-api', begin, end), scope: 'Host→page→trace projection, outside physics measurement window; GPU presentation and exact native wait NOT_TESTED' };
  }
  return { status: 'OBSERVED', clock, workerIdentities: (data.workerMarks ?? []).map(mark => ({ name: mark.name,
    events: events.filter(e => e.name === mark.name).map(e => ({ pid: e.pid, tid: e.tid, tsUs: e.ts })) })),
    coverage: Object.fromEntries(Object.entries(groups).map(([name, regex]) => [name, completed.some(e => regex.test(e.name)) ? 'OBSERVED' : 'NOT_OBSERVED'])),
    mainTaskWall: distribution(tasks.filter(inWindow).map(e => e.dur / 1000)),
    mainTaskCpu: distribution(tasks.filter(inWindow).map(e => Number.isFinite(e.tdur) ? e.tdur / 1000 : NaN)),
    samples, screenshot, osScheduler: 'NOT_TESTED_KERNEL_EVENTS', gpuPresentation: 'NOT_TESTED', rootCause: 'UNKNOWN' };
}
