// Send-only OS process. It has no browser, network or simulation dependency.
let started = false;
process.on('message', message => {
  if (message.type === 'sync') {
    const received = performance.now();
    process.send({ type: 'sync', id: message.id, received, sent: performance.now() });
  }
  if (message.type === 'start' && !started) {
    started = true;
    const begin = performance.now() + 100;
    const count = Math.ceil(message.duration / message.interval);
    for (let i = 1; i <= count; i++) {
      const planned = begin + i * message.interval;
      setTimeout(() => {
        process.send({ type: 'request', seq: i, planned, sent: performance.now(), deadline: i === count, pid: process.pid, source: 'dedicated-send-only-node-process' });
        if (i === count) process.send({ type: 'done' });
      }, Math.max(0, planned - performance.now()));
    }
  }
});
