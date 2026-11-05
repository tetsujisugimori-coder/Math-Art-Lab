// Independent review audit: closed-form price is the oracle, not nextStep.
// Run from repository root with Node.js 24: node docs/cobweb/review/analytic-audit.mjs
import {initialPoint,nextStep,stopReason,validMarket,tracePoint} from '../../../src/cobweb.ts';

let cases=0,maxResidual=0,maxCornerResidual=0;
for(const b of [0.5,0.7,1,1.3,2])
for(const d of [0.25,0.65,1,1.2,2])
for(const f of [0,0.1,0.5,0.9,1]){
  const m={a:120,c:0,b,d,initialPrice:120/b*f};
  if(!validMarket(m))throw new Error('valid grid rejected');
  const peq=120/(b+d);
  let point=initialPoint(m);
  for(let t=1;t<=20;t++){
    const step=nextStep(m,point,t);
    const expected=peq+(-d/b)**t*(m.initialPrice-peq);
    const residual=Math.abs(step.to.price-expected);
    maxResidual=Math.max(maxResidual,residual);
    if(residual>1e-6*Math.max(1,Math.abs(expected)))throw new Error(JSON.stringify({b,d,t,residual}));
    const cornerResidual=Math.abs(tracePoint(step,0.5).quantity-step.to.quantity);
    maxCornerResidual=Math.max(maxCornerResidual,cornerResidual);
    if(cornerResidual>1e-10)throw new Error('incorrect horizontal corner');
    if(stopReason(m,step))break;
    if(Math.abs(120-b*step.to.price-step.to.quantity)>1e-10)throw new Error('demand not cleared');
    point=step.to;cases++;
  }
}
console.log(JSON.stringify({independentAnalyticUpdates:cases,maxAbsolutePriceResidual:maxResidual,maxCornerResidual}));
