import {orchestrate} from './three-body-stage-y-control.mjs';
export const requiredAudits=['zip','extraction','manifest','sha','source','observer','review','plan','evidence'];
export function auditAll(checks){const rows=requiredAudits.map(name=>{try{const value=checks[name]?.();return{name,...value,status:value?.status??'NOT_OBTAINED'};}catch(error){return{name,status:'FAIL',error:String(error)};}});return{status:rows.every(r=>r.status==='PASS')?'PASS':'FAIL',rows};}
export function controlled(root,checks,command,args){return orchestrate(root,{diagnostic:true,complete:true,source:true,evidence:true,cleanup:true},{command,args},()=>auditAll(checks));}
