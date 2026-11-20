// Reuse the immutable Stage Q tape and unmodified minimal Canvas/DOM renderer.
import {build} from 'esbuild';import fs from 'node:fs';import {execFileSync} from 'node:child_process';import {createHash} from 'node:crypto';
import {installStageQ,installMinimal} from './three-body-stage-q-browser.mjs';
const sha=x=>createHash('sha256').update(x).digest('hex');
export async function makeFixture(){
 const base='b07ccec1205ca99a1112ab8db951efbe94a51f74';
 const code=await build({stdin:{contents:"export * from './src/three-body.ts';export * from './src/three-body-state.ts';export * from './src/three-body-render.ts';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',write:false,plugins:[{name:'immutable-u-fixture',setup(b){b.onLoad({filter:/src[\\/].*\.ts$/},a=>({contents:execFileSync('git',['show',base+':src/'+a.path.split(/[\\/]/).at(-1)],{encoding:'utf8'}),loader:'ts'}));}}]});
 const m=await import(`data:text/javascript;base64,${Buffer.from(code.outputFiles[0].text).toString('base64')}`),comparison=m.createComparison(m.presets[0].config,0,'x',1e-6);
 for(let i=0;i<26000;i+=2000)m.advanceComparison(comparison,2000);globalThis.devicePixelRatio=2;
 const tapes=[comparison.a,comparison.b].map(e=>{const tape=[],ctx=new Proxy({},{get:(_,key)=>(...args)=>tape.push(['call',key,args]),set:(_,key,value)=>{tape.push(['set',key,value]);return true;}}),canvas={width:876,height:660,dataset:{},getBoundingClientRect:()=>({width:438,height:330}),getContext:()=>ctx};
 m.drawOrbit(canvas,e.phase,e.config,e.trail,{x:0,y:0,span:4,follow:true},{trails:true,center:true,velocity:true,acceleration:true,axes:true,bodies:true,glow:true,length:6000,opacity:.7},0,'r');return tape;});
 const metadata={base,sourcePhysicsStep:26000,tapeSha256:sha(JSON.stringify(tapes)),commands:tapes.map(t=>t.length),comparisonSha256:sha(JSON.stringify(comparison)),livePhysics:false};
 function boot(config,tapes,id){
  installStageQ({id,mini:true,instrument:false,native:false,context:config.context});installMinimal(config,tapes);
 }
 // Functions are injected as source, keeping the original fixture code unchanged.
 const html=(context,id)=>`<!doctype html><html><head><meta charset="utf-8"><style>body{margin:16px;background:#eef2f8;color:#162538;font:14px system-ui}#canvases{display:flex;gap:16px}#probe{width:400px}#values span{display:inline-block;min-width:70px}canvas{background:#070c19}</style></head><body><button id="stop">停止</button><output id="value">0</output><div id="canvases"></div><div id="probe"><div id="values"></div><svg width="400" height="100"><path id="curve" stroke="blue" fill="none"/></svg></div><script>
 const installStageQ=${installStageQ.toString()},installMinimal=${installMinimal.toString()};
 (${boot.toString()})(${JSON.stringify({mini:true,context,canvas:'app',dom:'app',width:438,height:330,count:2,period:40,geometry:true})},${JSON.stringify(tapes)},${JSON.stringify(id)});
 const q=globalThis.__stageQ;
 q.uMetadata={canvases:[...document.querySelectorAll('#canvases canvas')].map(cv=>({width:cv.width,height:cv.height,styleWidth:cv.style.width,styleHeight:cv.style.height,context:cv.getContext('2d').getContextAttributes?.()??null})),innerWidth,innerHeight,dpr:devicePixelRatio};
 let resolve,stopped=false;q.uReady=new Promise(r=>resolve=r);const present=q.present.bind(q);
 q.present=()=>{present();const state=q.control.small();if(!stopped&&state.step>=30){stopped=true;q.control.stop();return;}if(stopped&&!state.playing&&!state.timer&&!state.raf)resolve({state,metadata:q.uMetadata});};
 document.querySelector('#stop').onclick=()=>q.control.stop();q.control.play();
 </script></body></html>`;
 return{html,metadata,canonicalSha256:sha(html('__CONTEXT__','__RUN_ID__'))};
}
