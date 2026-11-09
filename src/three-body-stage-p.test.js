import { describe, it, expect } from 'vitest';
import { distribution, unionOverlap, completeEvents, analyzeTrace, minimumPositiveDelta, intervalQuery } from '../tools/three-body-stage-p-analysis.mjs';

describe('Stage P trace evidence analysis', () => {
  it('matches brute-force overlap for nested tasks, gaps and exact boundaries', () => {
    const items=[{begin:100,end:120},{begin:0,end:1000},{begin:5,end:10},{begin:20,end:30},{begin:2000,end:2100}];
    const query=intervalQuery(items,x=>x.begin,x=>x.end);
    for(const [begin,end] of [[0,5],[10,20],[25,28],[119,121],[999,1001],[1100,1200],[2100,2200]]){
      expect(query(begin,end)).toEqual(items.filter(x=>x.begin<end&&x.end>begin).sort((a,b)=>a.begin-b.begin));
    }
  });
  it('keeps outliers and gives nearest-rank percentiles without claiming a guarantee', () => {
    expect(distribution([1, 2, 1000])).toEqual({ n: 3, median: 2, p95: 1000, p99: 1000, max: 1000, over50: 1, percentileIsGuarantee: false });
    expect(distribution([]).max).toBeNull();
  });
  it('counts nested GC overlap once and clips to the measured interval', () => {
    const e = [{ ts: 1000, dur: 5000 }, { ts: 2000, dur: 2000 }, { ts: 8000, dur: 4000 }];
    expect(unionOverlap(e, 2, 10)).toBe(6);
  });
  it('pairs synchronous B/E on their own thread and excludes incomplete intervals', () => {
    const e = [{ ph: 'B', pid: 1, tid: 1, name: 'a', ts: 10 }, { ph: 'B', pid: 1, tid: 2, name: 'b', ts: 12 }, { ph: 'E', pid: 1, tid: 1, ts: 20 }];
    expect(completeEvents(e)).toEqual([{ ...e[0], ph: 'X', dur: 10 }]);
  });
  it('does not invent clock alignment or interval attribution when marks are missing', () => {
    const x = analyzeTrace([], { marks: [], spans: [{ begin: 0, end: 500 }] });
    expect(x.clock.status).toBe('NOT_TESTED'); expect(x.long).toEqual([]);
  });
  it('attributes only the marked renderer main thread and rejects a background-GC false positive', () => {
    const marks = [{ name: 'clock-0', before: 0, after: 0 }, { name: 'clock-1', before: 200, after: 200 }];
    const events = [{ name: 'clock-0', cat: 'blink.user_timing', ts: 1000000, pid: 1, tid: 2 }, { name: 'clock-1', cat: 'blink.user_timing', ts: 1200000, pid: 1, tid: 2 }, { name: 'V8.GC', ph: 'X', ts: 1020000, dur: 100000, pid: 1, tid: 3 }, { name: 'RunTask', ph: 'X', ts: 1000000, dur: 200000, pid: 1, tid: 2 }];
    const x = analyzeTrace(events, { marks, spans: [{ begin: 20, end: 120 }] });
    expect(x.clock.offsetMs).toBe(1000); expect(x.long[0].gcOverlapMs).toBe(0); expect(x.long[0].enclosingTask.threadCpuMs).toBeNull();
  });
  it('does not mix duplicate nested task labels into the canonical task count', () => {
    const events = [{ name: 'c', cat: 'blink.user_timing', ts: 1000, pid: 1, tid: 1 }, { name: 'RunTask', ph: 'X', ts: 1000, dur: 100, pid: 1, tid: 1 }, { name: 'ThreadControllerImpl::RunTask', ph: 'X', ts: 1000, dur: 100, pid: 1, tid: 1 }];
    expect(analyzeTrace(events, { marks: [{ name: 'c', before: 0, after: 1 }], spans: [] }).tasks.n).toBe(1);
  });
  it('does not infer perfect clock accuracy from equal rounded clock reads', () => {
    expect(minimumPositiveDelta([0, 0, 0])).toBeNull();
    expect(minimumPositiveDelta([0, 0, .1, .2, 50])).toBeCloseTo(.1, 10);
  });
  it('preserves full boundary-task duration while clipping its measured-window statistic', () => {
    const events = [{ name: 'a', cat: 'blink.user_timing', ts: 1000000, pid: 1, tid: 1 }, { name: 'b', cat: 'blink.user_timing', ts: 1100000, pid: 1, tid: 1 }, { name: 'RunTask', ph: 'X', ts: 500000, dur: 1500000, pid: 1, tid: 1 }];
    const x = analyzeTrace(events, { marks: [{ name: 'a', before: 0, after: 0 }, { name: 'b', before: 100, after: 100 }], spans: [] });
    expect(x.tasks.max).toBe(100); expect(x.fullTaskIntervals.max).toBe(1500); expect(x.boundaryClippedTasks).toHaveLength(1);
  });
  it('does not turn a missing initial trace marker into zero GC attribution', () => {
    const events = [{ name: 'b', cat: 'blink.user_timing', ts: 1200000, pid: 1, tid: 1 }];
    const x = analyzeTrace(events, { marks: [{ name: 'a', before: 0, after: 0 }, { name: 'b', before: 200, after: 200 }], spans: [{ begin: 20, end: 120 }] });
    expect(x.clock.completeMarkerSet).toBe(false);expect(x.clock.status).toBe('PARTIAL_MARKS');expect(x.long[0].gcOverlapMs).toBeNull();
  });
});
