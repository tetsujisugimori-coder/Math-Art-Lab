import {sources as vSources} from './three-body-stage-v-contracts.mjs';
export {traceParameters,parametersFor,methodFor,timedRequest,stoppedFrame,observeCleanup,counts,observeSend,measuredRequest,timingOf} from './three-body-stage-v-contracts.mjs';
export const baseline='1e2e895826e69ab0ce8ad06e92d3e8c60a081313';
export const sources=[...vSources,'tools/three-body-stage-w.mjs','tools/three-body-stage-w-contracts.mjs','tools/three-body-stage-w-audit.mjs'];
export function plans(){const sequence=[['default','off'],['readback','early'],['default','late'],['readback','off'],['default','early'],['readback','late'],['readback','late'],['default','early'],['readback','off'],['default','late'],['readback','early'],['default','off']],seen={};return sequence.map(([context,traceMode],i)=>({id:`w-${String(i+1).padStart(2,'0')}-${context}-${traceMode}`,kind:'capture',context,traceMode,trace:traceMode!=='off',readback:false,repeat:seen[context+traceMode]=(seen[context+traceMode]??0)+1}));}
