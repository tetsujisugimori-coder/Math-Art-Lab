// Harness and page clocks are validated independently; operation IDs link events,
// never imply exact cross-domain timestamp calibration.
export function temporalErrors(o){const e=[],r=o?.rows;if(o?.schema!=='stop-observation-2'||!Array.isArray(r))return['OBSERVATION_VERSION'];
 if(r.some((x,i)=>!Number.isFinite(x.harnessMono)||(i&&x.harnessMono<r[i-1].harnessMono)))e.push('HARNESS_CLOCK_ORDER');if(r.some(x=>x.error))e.push('OBSERVATION_ERROR');
 const select=n=>r.filter(x=>x.event===n),wi=select('wait-issued'),wr=select('wait-returned'),states=select('state-after-200ms');
 if(wi.length!==1||wr.length!==1||states.length!==1)e.push('WAIT_PAIR_COUNT');
 else{const [a]=wi,[b]=wr,[s]=states;if(!/^wait-\d+$/.test(a.waitId)||a.waitId!==b.waitId||a.waitId!==s.waitId||a.ms!==200||b.ms!==200)e.push('WAIT_ID_OR_REQUEST');if(!(r.indexOf(a)<r.indexOf(b)&&r.indexOf(b)<r.indexOf(s)&&b.harnessMono-a.harnessMono>=200&&s.begin>=b.harnessMono&&s.end>=s.begin&&s.harnessMono>=s.end)||a.error||b.error)e.push('WAIT_ELAPSED_OR_ORDER');}
 const issued=select('play-click-issued'),returned=select('play-click-returned');
 if(issued.length!==2||returned.length!==2||new Set(issued.map(x=>x.operationId)).size!==2)e.push('CLICK_PAIR_COUNT');
 else for(let i=0;i<2;i++){const a=issued[i],b=returned[i];if(!/^click-\d+$/.test(a.operationId)||a.operationId!==b.operationId||a.error||b.error||r.indexOf(a)>=r.indexOf(b)||(i&&r.indexOf(returned[i-1])>=r.indexOf(a))||(wi[0]&&r.indexOf(b)>=r.indexOf(wi[0])))e.push('CLICK_PAIR_ORDER');}
 const s=states[0],j=s?.value?.journal,f=select('final-journal-read');if(!Array.isArray(j)||f.length!==1||!Array.isArray(f[0]?.value?.journal))return[...e,'PAGE_JOURNAL'];
 for(const [list,origin,end]of [[j,s.value.timeOrigin,s.value.now],[f[0].value.journal,f[0].value.timeOrigin,f[0].value.now]]){if(!Number.isFinite(origin)||!Number.isFinite(end)||list.some((x,i)=>!Number.isFinite(x.pageMono)||x.timeOrigin!==origin||x.pageMono>end||(i&&x.pageMono<list[i-1].pageMono)))e.push('PAGE_CLOCK_ORDER');}
 if(!(r.indexOf(f[0])>r.indexOf(s)&&Number.isFinite(f[0].begin)&&Number.isFinite(f[0].end)&&f[0].begin>=s.end&&f[0].end>=f[0].begin&&f[0].harnessMono>=f[0].end&&f[0].value.timeOrigin===s.value.timeOrigin&&f[0].value.now>=s.value.now))e.push('FINAL_OBSERVATION_ORDER');
 if(JSON.stringify(f[0].value.journal.slice(0,j.length))!==JSON.stringify(j))e.push('JOURNAL_PREFIX');
 const clicks=j.filter(x=>x.event==='click-capture'&&x.id==='sm-play');if(clicks.length!==2||clicks.some((x,i)=>x.operationId!==issued[i]?.operationId))e.push('CLICK_CAPTURE_BINDING');
 const stop=issued[1]?.operationId,ent=j.filter(x=>x.event==='pause-enter'&&x.operationId===stop),exit=j.filter(x=>x.event==='pause-exit'&&x.operationId===stop);
 if(ent.length!==1||exit.length!==1||!clicks[1]||!(j.indexOf(clicks[1])<j.indexOf(ent[0])&&j.indexOf(ent[0])<j.indexOf(exit[0])))e.push('STOP_HANDLER_PAIR');
 else if(j.slice(j.indexOf(exit[0])+1).some(x=>x.event==='advance-after')||f[0].value.journal.slice(j.indexOf(exit[0])+1).some(x=>x.event==='advance-after'))e.push('POST_STOP_ADVANCE');
 return e;
}
