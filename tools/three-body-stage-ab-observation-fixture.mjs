// Synthetic contract fixture only; never presented as browser acquisition.
export function validObservation(){const s={playing:false,timer:null,internalStep:13,domStep:'13'},journal=[{event:'click-capture',operationId:'click-1',id:'sm-play',pageMono:10,timeOrigin:1000},{event:'click-capture',operationId:'click-2',id:'sm-play',pageMono:20,timeOrigin:1000},{event:'pause-enter',operationId:'click-2',pageMono:21,timeOrigin:1000},{event:'pause-exit',operationId:'click-2',pageMono:22,timeOrigin:1000,...s}];return{schema:'stop-observation-2',observer:true,rows:[{event:'play-click-issued',operationId:'click-1',harnessMono:1},{event:'play-click-returned',operationId:'click-1',harnessMono:2},{event:'play-click-issued',operationId:'click-2',harnessMono:3},{event:'play-click-returned',operationId:'click-2',harnessMono:4},{event:'step-read',harnessMono:5,value:'13'},{event:'wait-issued',waitId:'wait-1',ms:200,harnessMono:6},{event:'wait-returned',waitId:'wait-1',ms:200,harnessMono:206},{event:'state-after-200ms',waitId:'wait-1',harnessMono:208,begin:207,end:208,value:{now:300,timeOrigin:1000,domStep:'13',playing:'false',state:s,journal}},{event:'final-journal-read',harnessMono:210,begin:209,end:210,error:null,value:{journal,now:302,timeOrigin:1000}}]};}
export const mutations={
 missingWait:o=>o.rows=o.rows.filter(r=>!r.event.startsWith('wait-')),
 wrongWait:o=>o.rows.find(r=>r.event==='wait-issued').ms=199,
 missingReturn:o=>o.rows=o.rows.filter(r=>r.event!=='wait-returned'),
 wrongWaitId:o=>o.rows.find(r=>r.event==='wait-returned').waitId='other',
 shortElapsed:o=>o.rows.find(r=>r.event==='wait-returned').harnessMono=100,
 reversedWait:o=>{const a=o.rows.findIndex(r=>r.event==='wait-issued'),b=o.rows.findIndex(r=>r.event==='wait-returned');[o.rows[a],o.rows[b]]=[o.rows[b],o.rows[a]];},
 observationBeforeWait:o=>o.rows.find(r=>r.event==='state-after-200ms').begin=10,
 duplicateWait:o=>o.rows.splice(5,0,{...o.rows[5]}),
 wrongClickId:o=>o.rows[3].operationId='click-1',
 reversedClick:o=>[o.rows[0],o.rows[1]]=[o.rows[1],o.rows[0]],
 missingCapture:o=>o.rows.find(r=>r.event==='state-after-200ms').value.journal.splice(0,1),
 wrongCapture:o=>o.rows.find(r=>r.event==='state-after-200ms').value.journal[1].operationId='other',
 reversedPause:o=>{const j=o.rows.find(r=>r.event==='state-after-200ms').value.journal;[j[2],j[3]]=[j[3],j[2]];},
 duplicatePause:o=>o.rows.find(r=>r.event==='state-after-200ms').value.journal.push({...o.rows.find(r=>r.event==='state-after-200ms').value.journal[3]}),
 wrongClock:o=>o.rows.find(r=>r.event==='state-after-200ms').value.journal[2].timeOrigin=2000,
 postPauseAdvance:o=>o.rows.find(r=>r.event==='state-after-200ms').value.journal.push({event:'advance-after',pageMono:23,timeOrigin:1000}),
 wrongDOM:o=>o.rows.find(r=>r.event==='state-after-200ms').value.domStep='14',
 stillPlaying:o=>o.rows.find(r=>r.event==='state-after-200ms').value.state.playing=true,
 observationError:o=>o.rows.find(r=>r.event==='state-after-200ms').error='evaluate failed'
};
