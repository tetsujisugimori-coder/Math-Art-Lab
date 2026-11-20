import fs from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { clockBracket } from '../../../tools/three-body-stage-q-metrics.mjs';
import { distribution } from '../../../tools/three-body-stage-p-analysis.mjs';
const dir = process.argv[2] + '/raw', rows = [];
for (const name of fs.readdirSync(dir).filter(n => n.endsWith('.json.gz'))) {
  const bytes = fs.readFileSync(dir + '/' + name), r = JSON.parse(gunzipSync(bytes)), s = r.result.stop, sender = r.senderProcess;
  if (!sender) continue;
  const beginSource = clockBracket(sender.clock.slice(0, 8)), endSource = clockBracket(sender.clock.slice(8));
  const beginPage = clockBracket(r.hostClock.slice(0, 8)), endPage = clockBracket(r.hostClock.slice(8));
  const hops = r.data.requests.map(q => {
    const sent = sender.requests.find(m => m.seq === q.seq);
    return { seq: q.seq, scheduledSend: sent.sent - sent.planned,
      senderHarness: sent.harnessReceived - sent.sent - beginSource.offset,
      harnessPage: q.T1 - sent.harnessReceived - beginPage.offset,
      senderHarnessUncertainty: beginSource.halfWidth, harnessPageUncertainty: beginPage.halfWidth };
  });
  let hit = null;
  if (s.targetHit) {
    const sent = sender.requests.find(m => m.seq === s.seq), span = r.data.spans.find(p => p.id === s.overlapId);
    const low = sent.sent + Math.min(beginSource.low + beginPage.low, endSource.low + endPage.low);
    const high = sent.sent + Math.max(beginSource.high + beginPage.high, endSource.high + endPage.high);
    hit = { span, envelope: { low, high }, inside: low >= span.begin && high <= span.end };
    // A nominal runtime HIT without the full before/after envelope is not confirmed.
    hit.nominal=true;
  }
  const within = s.stop.after.step - s.stop.before.step, after = s.later.step - s.after.step;
  const safe = !within && !after && (!s.later.ab || s.later.bStep === s.later.step) && !s.later.playing && !s.later.timer && !s.later.raf;
  if (!safe || sender.pid === sender.harnessPid) throw Error('Stop/PID contract failed');
  rows.push({ id: r.id, rawSha256: createHash('sha256').update(bytes).digest('hex'), distinctPid: true,
    senderPid: sender.pid, harnessPid: sender.harnessPid, beginSource, endSource, beginPage, endPage,
    sourceSent: sender.requests.length, pageAccepted: r.data.requests.length, ignoredAfterStop: sender.requests.length - r.data.requests.length,
    hops, hopDistributions: Object.fromEntries(['scheduledSend', 'senderHarness', 'harnessPage'].map(k => [k, distribution(hops.map(h => h[k]))])),
    stop: { Tminus1: s.Tminus1, T0: s.T0, T1: s.T1, T2: s.T2, T3: s.T3, T4: s.T4 }, hit, verdict: r.options.instrument === false ? 'NOT_TESTED_TARGET_INSTRUMENT_OFF' : hit ? hit.inside ? 'HIT' : 'NOT_TESTED_CLOCK_ENVELOPE' : 'TARGET_MISS',
    extraWithinPause: within, extraAfterStop: after, final: s.later, postCapture: r.capture.after, safe });
}
const result = { date: new Date().toISOString(), rows, scope: 'Dedicated source → IPC → harness → page, not physical input. Midpoint estimates may be negative within brackets; clock precision/nonlinear drift not guaranteed.' };
fs.writeFileSync(process.argv[3], JSON.stringify(result, null, 2));
console.log(JSON.stringify({ rows: rows.length, hits: rows.filter(r => r.verdict === 'HIT').length, misses: rows.filter(r => r.verdict === 'TARGET_MISS').length, notTested: rows.filter(r => r.verdict.startsWith('NOT_TESTED')).length, unsafe: rows.filter(r => !r.safe).length }));
