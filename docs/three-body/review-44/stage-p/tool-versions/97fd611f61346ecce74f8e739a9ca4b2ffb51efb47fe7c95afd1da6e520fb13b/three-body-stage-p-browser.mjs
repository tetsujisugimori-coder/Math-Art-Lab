// Serialized into diagnostic pages only. No product entry imports this module.
export function installStageP(options) {
  const p = globalThis.__stageP = {
    options, flags: { dom: true, canvas: true, kernel: false }, spans: [], frames: [], requests: [], pauses: [], marks: [], longTasks: [],
    sequence: 0, active: false, pending: null, lastDraw: {}, requestedFrame: null,
    phase(name, fn) {
      if (!this.active) return fn();
      const id = ++this.sequence, begin = performance.now(), before = this.control.small();
      try { return fn(); } finally {
        const end = performance.now();
        this.spans.push({ id, name, begin, end, before, after: this.control.small() });
      }
    },
    pause(fn) {
      const begin = performance.now(), before = this.control?.small();
      try { return fn(); } finally { if (this.active) this.pauses.push({ begin, end: performance.now(), before, after: this.control.small() }); }
    },
    present() {
      const now = performance.now();
      if (this.active && options.mode !== 'off') this.frames.push({ at: now, wait: this.requestedFrame == null ? null : now - this.requestedFrame, ...this.control.small() });
      this.requestedFrame = null;
      if (this.pending && !this.control.small().playing) {
        const s = this.control.small();
        if (s.observed === String(s.step) && s.a === String(s.step) && (!s.ab || s.b === String(s.step))) {
          this.pending.T4 = now; this.pending.display = s; this.pending = null;
        }
      }
    },
    mark(index) {
      const name = `${options.runId}-clock-${index}`, before = performance.now();
      performance.mark(name);
      this.marks.push({ name, before, after: performance.now() });
    },
    result() { return { spans: this.spans, frames: this.frames, requests: this.requests, pauses: this.pauses, marks: this.marks, longTasks: this.longTasks, lastDraw: this.lastDraw }; }
  };
  if(options.mode==='deep'){
    const rect=HTMLCanvasElement.prototype.getBoundingClientRect;
    HTMLCanvasElement.prototype.getBoundingClientRect=function(...args){return this.id?.startsWith('tb-')?p.phase('native.getBoundingClientRect',()=>rect.apply(this,args)):rect.apply(this,args)};
    for(const name of ['stroke','fill','fillText','fillRect','clearRect','setTransform']){const original=CanvasRenderingContext2D.prototype[name];CanvasRenderingContext2D.prototype[name]=function(...args){return this.canvas.id?.startsWith('tb-')?p.phase('native.'+name,()=>original.apply(this,args)):original.apply(this,args)}}
    const set=Element.prototype.setAttribute;Element.prototype.setAttribute=function(key,...args){return this.id==='tb-graph-line'&&key==='d'?p.phase('native.graphAttribute',()=>set.call(this,key,...args)):set.call(this,key,...args)};
  }
  // OFF still has the same stop envelope and worker. It has no phase/frame observer.
  if (!['off', 'public'].includes(options.mode) && globalThis.PerformanceObserver?.supportedEntryTypes.includes('longtask')) {
    p.observer = new PerformanceObserver(list => { if (p.active) for (const e of list.getEntries()) p.longTasks.push({ begin: e.startTime, end: e.startTime + e.duration }); });
    p.observer.observe({ type: 'longtask', buffered: false });
  }
  p.workerStart = async function (duration, target, action = 'pause', synthetic = null) {
    const workerCode = `const stamp=()=>performance.now();let sequence=0,timer;
      onmessage=e=>{const x=e.data;if(x.type==='sync')postMessage({type:'sync',id:x.id,w1:stamp(),w2:stamp()});
        if(x.type==='start'){const start=stamp();timer=setInterval(()=>{const now=stamp();postMessage({type:'request',seq:++sequence,T0:now,deadline:now-start>=x.duration})},37)}};`;
    const blobUrl = URL.createObjectURL(new Blob([workerCode], { type: 'text/javascript' })), worker = new Worker(blobUrl);
    this.worker = worker; this.syncs = [];
    const sync = () => new Promise(resolve => {
      const id = Math.random().toString(36), p0 = performance.now();
      const handler = e => { if (e.data.type === 'sync' && e.data.id === id) { const p3 = performance.now(); worker.removeEventListener('message', handler); this.syncs.push({ p0, p3, ...e.data, offsetLow: p0 - e.data.w1, offsetHigh: p3 - e.data.w2 }); resolve(); } };
      worker.addEventListener('message', handler); worker.postMessage({ type: 'sync', id });
    });
    for (let i = 0; i < 8; i++) await sync();
    this.offset = this.syncs.reduce((a, b) => b.offsetHigh - b.offsetLow < a.offsetHigh - a.offsetLow ? b : a);
    this.begin = performance.now(); this.active = true; this.mark(0);
    let stopping = false;
    this.done = new Promise(resolve => {
      worker.addEventListener('message', async event => {
        if (event.data.type !== 'request' || stopping) return;
        const T1 = performance.now(), message = event.data, offset = (this.offset.offsetLow + this.offset.offsetHigh) / 2;
        const T0 = message.T0 + offset, uncertainty = (this.offset.offsetHigh - this.offset.offsetLow) / 2;
        let overlap;
        // Completion order is monotonic. Do not scan the entire accumulated run.
        for (let i = this.spans.length - 1; i >= 0; i--) {
          const s = this.spans[i]; if (s.end < T0 - uncertainty) break;
          if ((target === 'any' || s.name === target) && s.end - s.begin >= 50 && T0 >= s.begin + uncertainty && T0 <= s.end - uncertainty) { overlap = s; break; }
        }
        const request = { ...message, T0Worker: message.T0, T0, T1, uncertainty, stepAtReceive: this.control.small(), overlapId: overlap?.id ?? null };
        this.requests.push(request);
        if (message.deadline || (target && overlap)) {
          stopping = true; request.target = target; request.targetHit = !!overlap;
          this.pending = request;
          request.alreadyStopped=!this.control.small().playing;
          if(request.alreadyStopped)this.control.stop?.();
          else if (action === 'escape') document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
          else if (action === 'visibility') { Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange')); }
          else document.querySelector('#tb-play').click();
          const last = this.pauses.at(-1),stop=last?.begin>=T1?last:null; request.T2 = stop?.begin; request.T3 = stop?.end; request.stop = stop;
          await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
          if(options.mode==='public') {const s=this.control.small();if(s.observed===String(s.step)&&s.a===String(s.step)&&s.b===String(s.step)){request.T4=performance.now();request.display=s;request.T4Kind='public DOM/Canvas receipts after two rAFs';}}
          if (request.T4 == null && !this.flags.canvas && !this.flags.dom) { request.T4 = performance.now(); request.T4Kind = 'diagnostic-rAF-ack; display disabled'; }
          request.after = this.control.small();
          await new Promise(r => setTimeout(r, 100)); request.later = this.control.small();
          this.mark(1); this.active = false;
          for (let i = 0; i < 8; i++) await sync();
          worker.terminate(); URL.revokeObjectURL(blobUrl);
          resolve({ stop: request, syncs: this.syncs, begin: this.begin, end: performance.now(), state: this.control.snapshot() });
        }
      });
    });
    worker.postMessage({ type: 'start', duration });
    this.control.play();
    if (synthetic) setTimeout(() => {
      // Positive control only; never attributed to a naturally occurring stall.
      this.phase('synthetic-' + synthetic, () => { const end = performance.now() + 120; while (performance.now() < end) {} });
    }, 200);
    return { armed: true };
  };
}
