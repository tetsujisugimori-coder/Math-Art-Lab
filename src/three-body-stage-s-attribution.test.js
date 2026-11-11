import { expect, test } from 'vitest';
import { attributeTrace } from '../tools/three-body-stage-s-attribution.mjs';

test('elapsed JS/native intervals and overlapping raster events cannot become inferred CPU or waiting causes', () => {
  const data = { marks: [{ name: 'begin', before: 0, after: 0 }, { name: 'end', before: 1000, after: 1000 }],
    spans: [{ id: 1, name: 'native.geometry', begin: 100, end: 500 }] };
  const event = (name, ts, dur, pid = 1, tid = 2) => ({ name, ts, dur, ph: 'X', pid, tid });
  const result = attributeTrace([
    { name: 'begin', ts: 1000000, cat: 'blink.user_timing', ph: 'R', pid: 1, tid: 2 },
    { name: 'end', ts: 2000000, cat: 'blink.user_timing', ph: 'R', pid: 1, tid: 2 },
    { ...event('RunTask', 1100000, 400000), tdur: 30000 },
    event('FunctionCall', 1100000, 400000), { ...event('Layout', 1120000, 1000), tdur: 200 },
    event('RasterTask', 1200000, 200000, 3, 4),
  ], data);
  const sample = result.samples.find(s => s.kind === 'native.geometry');
  expect(sample.wallMs).toBe(400);
  expect(sample.enclosingTask.threadCpuMs).toBe(30);
  expect(sample.overlap.javascript.mainUnionWallMs).toBe(400);
  expect(sample.overlap.rasterization).toMatchObject({ mainUnionWallMs: 0, allThreadsUnionWallMs: 200 });
  expect(sample.overlap.synchronousGC.mainUnionWallMs).toBe(0);
  expect(sample.overlap.layout.longestEvent).toMatchObject({ wallMs: 1, threadCpuMs: 0.2 });
  expect(result.rootCause).toBe('UNKNOWN');
  expect(result.osScheduler).toBe('NOT_TESTED_KERNEL_EVENTS');
  expect(result.gpuPresentation).toBe('NOT_TESTED');
});

test('missing clock markers produce NOT_TESTED instead of zero CPU or zero latency', () => {
  const result = attributeTrace([], { spans: [], marks: [{ name: 'missing', before: 0, after: 1 }] });
  expect(result.status).toBe('NOT_TESTED_CLOCK');
  expect(result.mainTaskCpu).toBeUndefined();
  expect(result.samples).toBeUndefined();
});
