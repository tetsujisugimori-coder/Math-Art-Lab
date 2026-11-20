import { fork } from 'node:child_process';
import { clockBracket } from './three-body-stage-q-metrics.mjs';

export async function deliverFromSender(duration, pageOffset, pageUncertainty, deliver) {
  const child = fork(new URL('./three-body-stage-q-sender-child.mjs', import.meta.url), [], { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe', 'ipc'] });
  const record = { kind: 'dedicated send-only OS process; browser delivery relayed by harness', pid: child.pid, harnessPid: process.pid, clock: [], requests: [], errors: [] };
  const pendingSync = new Map();
  const deliveries = [];
  let resolveDone, rejectDone;
  const done = new Promise((resolve, reject) => { resolveDone = resolve; rejectDone = reject; });
  done.catch(() => {}); // A setup error can precede awaiting the request phase.
  const closed = new Promise(resolve => child.once('close', resolve));
  child.on('error', error => { record.errors.push(String(error)); rejectDone(error); });
  child.stderr.on('data', bytes => record.errors.push(bytes.toString()));
  child.on('message', message => {
    const hostReceived = performance.now();
    if (message.type === 'sync') {
      const pending = pendingSync.get(message.id);
      if (pending) {
        record.clock.push({ ...message, hostBefore: pending.before, hostAfter: hostReceived, low: pending.before - message.received, high: hostReceived - message.sent });
        pendingSync.delete(message.id);
        pending.resolve();
      }
    }
    if (message.type === 'request') {
      const request = { ...message, harnessReceived: hostReceived };
      record.requests.push(request);
      deliveries.push(Promise.resolve().then(() => deliver(message, record.offset + pageOffset, record.uncertainty + pageUncertainty)).catch(error => { request.error = String(error); record.errors.push(request.error); }));
    }
    if (message.type === 'done') resolveDone();
  });
  async function sync() {
    const id = record.clock.length;
    let timer;
    await new Promise((resolve, reject) => {
      pendingSync.set(id, { before: performance.now(), resolve: () => { clearTimeout(timer); resolve(); } });
      timer = setTimeout(() => { pendingSync.delete(id); reject(Error('Sender clock sync timeout 2000ms')); }, 2000);
      child.send({ type: 'sync', id });
    });
  }
  let deadline;
  try {
    for (let i = 0; i < 8; i++) await sync();
    const bracket = clockBracket(record.clock);
    record.offset = bracket.offset;
    record.uncertainty = bracket.halfWidth;
    child.send({ type: 'start', duration, interval: 37 });
    await Promise.race([done, new Promise((_, reject) => { deadline = setTimeout(() => reject(Error('Sender requests incomplete')), duration + 10000); })]);
    await Promise.all(deliveries);
    for (let i = 0; i < 8; i++) await sync();
    record.endClock = clockBracket(record.clock.slice(8));
    record.status = record.errors.length ? 'FAIL' : 'PASS';
    return record;
  } catch (error) {
    record.status = 'FAIL';
    record.errors.push(String(error));
    return record;
  } finally {
    clearTimeout(deadline);
    if (child.connected) child.disconnect();
    child.kill();
    await closed;
  }
}
