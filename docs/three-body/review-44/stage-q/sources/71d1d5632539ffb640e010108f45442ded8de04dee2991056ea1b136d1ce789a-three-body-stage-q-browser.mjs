// Diagnostic pages only. No product entry imports this module.
export function installStageQ(options) {
  const q=globalThis.__stageQ=globalThis.__stageP={options,flags:{dom:true,canvas:true,history:true},spans:[],frames:[],requests:[],pauses:[],marks:[],lastDraw:{},active:false,pending:null,requestedFrame:null,sequence:0};
  q.phase=function(name,fn){if(!this.active||options.instrument===false)return fn();const id=++this.sequence,begin=performance.now();try{return fn();}finally{this.spans.push({id,name,begin,end:performance.now()});}};
  q.pause=function(fn){const before=this.control?.small(),begin=performance.now();try{return fn();}finally{if(this.active)this.pauses.push({begin,end:performance.now(),before,after:this.control.small()});}};
  q.present=function(){const at=performance.now(),s=this.control.small();if(this.active&&options.instrument!==false)this.frames.push({at,wait:this.requestedFrame==null?null:at-this.requestedFrame,...s});this.requestedFrame=null;if(this.pending&&!s.playing&&s.observed===String(s.step)&&s.a===String(s.step)&&(!s.ab||s.b===String(s.step))){this.pending.T4=at;this.pending.display=s;this.pending=null;}};
  q.mark=function(i){const name=`${options.id}-clock-${i}`,before=performance.now();performance.mark(name);this.marks.push({name,before,after:performance.now()});};
  q.result=()=>({spans:q.spans,frames:q.frames,requests:q.requests,pauses:q.pauses,marks:q.marks,lastDraw:q.lastDraw});
  q.receive=async function(message,offset,uncertainty){
    if(this.stopping)return;
    const T1=performance.now(),r={...message,Tminus1:message.planned+offset,T0:message.sent+offset,T1,uncertainty,stepAtReceive:this.control.small()};
    this.requests.push(r);
    const phase=this.spans.find(s=>s.end-s.begin>=50&&s.name===this.target&&r.T0>=s.begin+uncertainty&&r.T0<=s.end-uncertainty);
    if(!message.deadline&&!phase)return;
    this.stopping=true;r.target=this.target;r.targetHit=!!phase;r.overlapId=phase?.id??null;this.pending=r;
    if(this.options.mini)this.control.stop();
    else if(this.action==='escape')document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
    else if(this.action==='visibility'){Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));}
    else document.querySelector('#tb-play').click();
    const pause=this.pauses.at(-1);if(pause?.begin>=T1){r.T2=pause.begin;r.T3=pause.end;r.stop=pause;}
    await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
    r.after=this.control.small();await new Promise(resolve=>setTimeout(resolve,100));r.later=this.control.small();this.mark(1);this.active=false;
    this.finish={stop:r,begin:this.begin,end:performance.now(),state:this.control.snapshot()};this.resolve?.(this.finish);
    return r;
  };
  q.start=async function(duration,action='pause',target=null,source='worker',positive=null){
    this.action=action;this.target=target;this.stopping=false;this.done=new Promise(resolve=>this.resolve=resolve);this.syncs=[];
    if(source==='worker'){
      const workerCode=`let timers=[];onmessage=e=>{const x=e.data;if(x.type==='sync'){const a=performance.now();postMessage({type:'sync',id:x.id,w1:a,w2:performance.now()});}if(x.type==='start'){const start=performance.now()+100,n=Math.ceil(x.duration/x.interval);for(let i=1;i<=n;i++){const planned=start+i*x.interval;timers.push(setTimeout(()=>postMessage({type:'request',seq:i,planned,sent:performance.now(),deadline:i===n}),Math.max(0,planned-performance.now())));}if(x.positive==='worker')setTimeout(()=>{const end=performance.now()+120;while(performance.now()<end){}},180);}};`;
      const url=URL.createObjectURL(new Blob([workerCode],{type:'text/javascript'})),worker=new Worker(url);this.worker=worker;this.workerUrl=url;
      const sync=()=>new Promise(resolve=>{const id=Math.random(),p0=performance.now();const handler=e=>{if(e.data.type==='sync'&&e.data.id===id){const p3=performance.now();worker.removeEventListener('message',handler);this.syncs.push({...e.data,p0,p3,low:p0-e.data.w1,high:p3-e.data.w2});resolve();}};worker.addEventListener('message',handler);worker.postMessage({type:'sync',id});});
      this.sync=sync;for(let i=0;i<8;i++)await sync();const best=this.syncs.reduce((a,b)=>b.high-b.low<a.high-a.low?b:a);this.offset=(best.low+best.high)/2;this.uncertainty=(best.high-best.low)/2;
      worker.addEventListener('message',e=>{if(e.data.type==='request')void this.receive(e.data,this.offset,this.uncertainty);});
      worker.postMessage({type:'start',duration,interval:37,positive});
    }
    this.begin=performance.now();this.active=true;this.mark(0);this.control.play();
    if(positive==='main')setTimeout(()=>this.phase('synthetic-main',()=>{const end=performance.now()+120;while(performance.now()<end){}}),190);
    return{begin:this.begin};
  };
  q.collect=async function(){if(this.sync)for(let i=0;i<8;i++)await this.sync();this.worker?.terminate();if(this.workerUrl)URL.revokeObjectURL(this.workerUrl);return JSON.stringify({result:this.finish,data:this.result(),syncs:this.syncs});};
}

export function installMinimal(config,tapes) {
  const q=globalThis.__stageQ,host=document.querySelector('#canvases'),nodes=[],contexts=[];
  let timer=null,raf=0,playing=false,frame=0,disposed=false,drawn=0;
  const box=document.querySelector('#probe'),value=document.querySelector('#value'),svg=document.querySelector('#curve');
  const attrs={};const domText=Array.from({length:70},()=>{const n=document.createElement('span');document.querySelector('#values').append(n);return n;});
  if(config.warmWebgl){const cv=document.createElement('canvas'),gl=cv.getContext('webgl2')??cv.getContext('webgl');if(gl){gl.clearColor(.1,.2,.3,1);gl.clear(gl.COLOR_BUFFER_BIT);gl.getExtension('WEBGL_lose_context')?.loseContext();}q.warmWebgl=!!gl;}
  for(let i=0;i<(config.count??2);i++){
    if(config.canvas==='none'){const spacer=document.createElement('div');spacer.style.cssText=`width:${config.width}px;height:${config.height}px`;host.append(spacer);continue;}
    const cv=document.createElement('canvas');cv.style.cssText=`width:${config.width}px;height:${config.height}px;visibility:${config.hidden?'hidden':'visible'}`;cv.width=Math.round(config.width*devicePixelRatio);cv.height=Math.round(config.height*devicePixelRatio);host.append(cv);nodes.push(cv);
    contexts.push(config.canvas==='element'?null:cv.getContext('2d',{willReadFrequently:config.context!=='default',...(config.desync?{desynchronized:true}:{})}));
  }
  function replay(ctx,tape,begin=0,end=tape.length){for(let i=begin;i<end;i++){const [kind,key,args]=tape[i];if(kind==='set')ctx[key]=args;else if(key==='setTransform'){const a=[...args];a[0]=a[3]=devicePixelRatio;if(config.moving)a[4]=Math.sin(frame*.1);ctx[key](...a);}else ctx[key](...args);}}
  function draw(){for(let i=0;i<nodes.length;i++){const cv=nodes[i],ctx=contexts[i];if(config.geometry!==false)q.phase('geometry',()=>cv.getBoundingClientRect());if(!ctx||['element','context','bitmap'].includes(config.canvas))continue;
    if(config.canvas==='clear'){ctx.clearRect(0,0,cv.width,cv.height);continue;}
    if(config.canvas==='lines'){ctx.setTransform(devicePixelRatio,0,0,devicePixelRatio,0,0);ctx.beginPath();for(let j=0;j<3000;j++){const x=(j%1000)*config.width/1000,y=config.height/2+Math.sin(j*.02+frame*.01)*config.height*.3;j%1000===0?ctx.moveTo(x,y):ctx.lineTo(x,y);}ctx.stroke();continue;}
    const tape=tapes[i%tapes.length];if(config.canvas==='split'){const size=Math.ceil(tape.length/4),part=frame%4;replay(ctx,tape,part*size,Math.min(tape.length,(part+1)*size));}else replay(ctx,tape);
  }}
  if(config.canvas==='bitmap')for(let i=0;i<contexts.length;i++)if(contexts[i])replay(contexts[i],tapes[i%tapes.length]);
  function dom(){const mode=config.dom??'app';if(mode==='none')return;
    if(mode==='text'||mode==='app')for(let i=0;i<domText.length;i++)domText[i].textContent=`${i}: ${(frame*.001+i).toFixed(6)} `;
    if(mode==='attribute'||mode==='app')for(let i=0;i<16;i++)box.setAttribute('data-value-'+i,String(frame+i));
    if(mode==='svg'||mode==='app'){let d='';for(let i=0;i<1200;i++)d+=`${i?'L':'M'}${i/3},${50+30*Math.sin(i*.01+frame*.01)}`;svg.setAttribute('d',d);}
    if(mode==='geometry'||mode==='layout'||mode==='app'){if(mode==='layout')box.style.width=(400+frame%2)+'px';q.phase('dom-geometry',()=>box.getBoundingClientRect());}value.textContent=String(frame);
  }
  const render=()=>{raf=0;if(disposed)return;q.phase('paint',draw);q.phase('observe',dom);drawn=frame;attrs.observed=attrs.a=attrs.b=String(frame);q.present();};
  const schedule=()=>{if(!raf){q.requestedFrame=performance.now();raf=requestAnimationFrame(render);}};
  const tick=()=>{if(!playing)return;frame++;schedule();timer=setTimeout(tick,config.period??40);};
  q.control={small:()=>({step:frame,bStep:frame,ab:(config.count??2)===2,playing,disposed,timer:timer!==null,raf:!!raf,trail:0,graph:0,...attrs}),snapshot:()=>({small:q.control.small(),layout:{canvases:nodes.map(cv=>({width:cv.width,height:cv.height,rect:{width:cv.getBoundingClientRect().width,height:cv.getBoundingClientRect().height}}))},contextAttributes:contexts.map(c=>c?.getContextAttributes?.()??null),drawn}),play(){playing=true;timer=setTimeout(tick,config.period??40);},stop(){q.pause(()=>{playing=false;clearTimeout(timer);timer=null;if(raf)cancelAnimationFrame(raf);raf=0;});schedule();}};
  schedule();q.minConfig=config;
}
