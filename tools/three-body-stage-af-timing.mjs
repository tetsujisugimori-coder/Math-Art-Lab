// Fixed before validation; rationale: docs/three-body/review-44/stage-af/protocol.md.
export const wallTolerance = (...values) => 32 * Number.EPSILON * Math.max(1, ...values.map(Math.abs));
export const categoryCalls = {initialization:1, verlet:126518, invariants:12652, assertion:253040, rk4:1, finalRms:1};
const finite = x => typeof x === 'number' && Number.isFinite(x) && x >= 0;
export function validateTiming(r, expected) {
  const errors = [];
  if (expected && (r?.mode !== expected.mode || (r?.id !== undefined && r.id !== expected.id))) errors.push('PLAN_ID_MODE');
  if (r?.id !== undefined && ![{id:'ae-A1',mode:'OFF'},{id:'ae-B1',mode:'ON'},{id:'ae-B2',mode:'ON'},{id:'ae-A2',mode:'OFF'}].some(p=>p.id===r.id&&p.mode===r.mode)) errors.push('RESULT_ID_MODE');
  if (r?.mode === 'OFF') {
    if (r.unclassifiedWallMs !== null) errors.push('OFF_UNCLASSIFIED');
    for (const k of Object.keys(categoryCalls)) {
      const c = r.categories?.[k];
      if (!c || c.observed !== 0 || c.threadObserved !== 0 || c.wallMs !== 0 || c.cpuUs !== 0 || c.threadUs !== 0) errors.push('OFF_ACCUMULATOR:'+k);
    }
  } else if (r?.mode === 'ON') {
    const values = Object.keys(categoryCalls).map(k=>r.categories?.[k]?.wallMs);
    const body = r.envelope?.wallMs, residual = r.unclassifiedWallMs;
    if (!values.every(finite) || !finite(body) || !finite(residual)) errors.push('WALL_REQUIRED');
    else {
      const sum = values.reduce((a,b)=>a+b,0), recomputed = body-sum;
      if (recomputed < 0 || Math.abs(residual-recomputed) > wallTolerance(body,sum,residual)) errors.push('WALL_SUM');
    }
  }
  return errors;
}
