export function distribution(values) {
  const a = values.filter(Number.isFinite).sort((a, b) => a - b), rank = q => a[Math.max(0, Math.ceil(a.length * q) - 1)] ?? null;
  return { n: a.length, median: rank(.5), p95: rank(.95), p99: rank(.99), max: a.at(-1) ?? null, over50: a.filter(x => x >= 50).length, percentileIsGuarantee: false };
}
export function unionOverlap(events, begin, end) {
  const ranges = events.map(e => [Math.max(begin, e.ts / 1000), Math.min(end, (e.ts + e.dur) / 1000)]).filter(([a, b]) => b > a).sort((a, b) => a[0] - b[0]);
  let sum = 0, right = -Infinity;
  for (const [a, b] of ranges) { sum += Math.max(0, b - Math.max(a, right)); right = Math.max(right, b); }
  return sum;
}
export function completeEvents(events) {
  const stacks = new Map(), result = [];
  for (const e of events) {
    const key = `${e.pid}:${e.tid}`;
    if (e.ph === 'X' && Number.isFinite(e.dur)) result.push(e);
    else if (e.ph === 'B') { const stack = stacks.get(key) ?? []; stack.push(e); stacks.set(key, stack); }
    else if (e.ph === 'E') { const b = stacks.get(key)?.pop(); if (b) result.push({ ...b, ph: 'X', dur: e.ts - b.ts }); }
  }
  return result;
}
export function minimumPositiveDelta(times){const a=[...new Set(times.filter(Number.isFinite))].sort((a,b)=>a-b),gaps=a.slice(1).map((v,i)=>v-a[i]).filter(v=>v>1e-6);return gaps.length?Math.min(...gaps):null;}
export function analyzeTrace(events, data) {
  const anchors = data.marks.map(m => { const e = events.find(e => e.name === m.name && e.cat?.includes('user_timing')); return e ? { ...m, pid: e.pid, tid: e.tid, traceMs: e.ts / 1000, low: e.ts / 1000 - m.after, high: e.ts / 1000 - m.before } : null; }).filter(Boolean);
  const anchor = anchors[0], low = anchors.length ? Math.max(...anchors.map(x => x.low)) : null, high = anchors.length ? Math.min(...anchors.map(x => x.high)) : null;
  const intersection = low <= high, offset = anchor ? (intersection ? (low + high) / 2 : (anchor.low + anchor.high) / 2) : null;
  const completeMarkerSet=anchors.length===data.marks.length&&anchors.length>0;
  const beginWindow = anchor ? anchors[0].before + offset : null, endWindow = anchor ? anchors.at(-1).after + offset : null;
  const inWindow = e => beginWindow == null || e.ts / 1000 < endWindow && (e.ts + e.dur) / 1000 > beginWindow;
  const main = anchor ? events.filter(e => e.pid === anchor.pid && e.tid === anchor.tid) : [];
  const completed = completeEvents(events).filter(inWindow), mainCompleted = completeEvents(main).filter(inWindow);
  const gc = mainCompleted.filter(e => /GC|Scaveng|MarkCompact/.test(e.name));
  const waits=mainCompleted.filter(e=>/WaitForCommitCompletion|SyncToken::Wait|VerifyFlush|WaitableEvent/.test(e.name));
  const tasks = mainCompleted.filter(e => e.name === (mainCompleted.some(e => e.name === 'RunTask') ? 'RunTask' : 'ThreadControllerImpl::RunTask'));
  const clippedMs=e=>beginWindow==null?e.dur/1000:Math.max(0,Math.min(endWindow,(e.ts+e.dur)/1000)-Math.max(beginWindow,e.ts/1000));
  const quantum=minimumPositiveDelta(data.spans.flatMap(s=>[s.begin,s.end]).concat(data.marks.flatMap(m=>[m.before,m.after])));
  const names = Object.entries(events.reduce((o, e) => { o[e.name] = (o[e.name] ?? 0) + 1; return o; }, {})).sort((a, b) => b[1] - a[1]);
  const long = offset == null ? [] : data.spans.filter(s => s.end - s.begin >= 50).map(s => {
    const begin = s.begin + offset, end = s.end + offset, task = tasks.find(e => e.ts / 1000 <= begin && (e.ts + e.dur) / 1000 >= end);
    if(begin<beginWindow||end>endWindow)return{...s,duration:s.end-s.begin,attribution:'NOT_TESTED_OUTSIDE_CAPTURED_MARKS',gcOverlapMs:null};
    return { ...s, duration: s.end - s.begin, traceBeginMs: begin, traceEndMs: end, mainWaitOverlapMs:unionOverlap(waits,begin,end),waitIntervals:waits.filter(e=>e.ts/1000<end&&(e.ts+e.dur)/1000>begin).map(e=>({name:e.name,begin:e.ts/1000,durationMs:e.dur/1000,threadCpuMs:Number.isFinite(e.tdur)?e.tdur/1000:null})),gcOverlapMs: unionOverlap(gc, begin, end), gcIntervals:gc.filter(e=>e.ts/1000<end&&(e.ts+e.dur)/1000>begin).map(e=>({name:e.name,begin:e.ts/1000,durationMs:e.dur/1000,threadCpuMs:Number.isFinite(e.tdur)?e.tdur/1000:null})),jsOverlapMs: unionOverlap(mainCompleted.filter(e => /FunctionCall|EvaluateScript|V8.Execute/.test(e.name)), begin, end), styleLayoutOverlapMs: unionOverlap(mainCompleted.filter(e => /Layout|UpdateLayoutTree/.test(e.name)), begin, end),paintCompositeOverlapMs:unionOverlap(mainCompleted.filter(e=>/Paint|Composite|UpdateLayer/.test(e.name)),begin,end), enclosingTask: task ? { name: task.name, durationMs: task.dur / 1000, threadCpuMs: Number.isFinite(task.tdur) ? task.tdur / 1000 : null } : null };
  });
  return { anchors, window: { beginMs: beginWindow, endMs: endWindow, note: 'Boundary events are clipped in window distributions; full durations and full raw trace are preserved.' }, clock: anchor ? { status: !completeMarkerSet?'PARTIAL_MARKS':intersection ? 'ALIGNED' : 'ALIGNED_WITH_SPREAD',completeMarkerSet,expectedMarks:data.marks.length,foundMarks:anchors.length, offsetMs: offset, markBracketMs: intersection ? (high-low)/2 : Math.max(...anchors.map(x=>Math.abs((x.low+x.high)/2-offset)+(x.high-x.low)/2)), minObservedPositiveDeltaMs:quantum, accuracyGuaranteed:false, mainPid: anchor.pid, mainTid: anchor.tid, anchorOffsetSpreadMs: Math.max(...anchors.map(x => x.high)) - Math.min(...anchors.map(x => x.low)) } : { status: 'NOT_TESTED',completeMarkerSet:false },
    events: events.length, names, processes: events.filter(e => e.ph === 'M'), long,mainWaits:distribution(waits.map(clippedMs)), gc: distribution(gc.map(clippedMs)), tasks: distribution(tasks.map(clippedMs)), fullTaskIntervals:distribution(tasks.map(e=>e.dur/1000)),boundaryClippedTasks:tasks.filter(e=>Math.abs(clippedMs(e)-e.dur/1000)>1e-6).map(e=>({ts:e.ts,dur:e.dur,clippedMs:clippedMs(e)})),
    coverage: Object.fromEntries(Object.entries({ task: /RunTask/, javascript: /FunctionCall|V8.Execute|EvaluateScript/, timer: /TimerFire/, raf: /FireAnimationFrame/, canvas: /Canvas|SkCanvas|Skia/, styleLayout: /Layout|UpdateLayoutTree/, paintComposite: /Paint|Composite|DrawFrame/, gc: /GC|Scaveng|MarkCompact/, input: /EventDispatch|InputLatency/, worker: /Message|Worker/ }).map(([k, re]) => [k, names.some(([n]) => re.test(n)) ? 'OBSERVED' : 'NOT_OBSERVED'])),
    limitations: ['GPU presentation completion NOT_TESTED', 'OS context-switch/run-queue/swap NOT_TESTED', 'Elapsed task duration is not OS CPU time', 'Overlap is not proof of causality'],
    processDurations: Object.values(completed.reduce((o, e) => { const k = `${e.pid}:${e.tid}`; (o[k] ??= { pid: e.pid, tid: e.tid, count: 0, maxMs: 0 }).count++; o[k].maxMs = Math.max(o[k].maxMs, e.dur / 1000); return o; }, {})) };
}
