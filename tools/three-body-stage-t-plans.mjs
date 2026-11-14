// Explicit, bounded Stage T plans. All optional interventions are diagnostic.
export function stageTPlans(browser) {
 const mini={mini:true,canvas:'app',dom:'app',width:438,height:330,count:2,period:40,geometry:true,dpr:2,context:'readback',backend:'swiftshader',duration:1800,captureStage:'none'};
 function pairs(factor,a,b,base=mini){return [a,b,b,a].map((delta,order)=>({...base,...delta,factor,order,repeat:order<2?0:1,name:`${factor}-${order}`}));}
 const controls=[
  ...pairs('commands',{canvas:'app'},{canvas:'bitmap'}),
  ...pairs('resources',{canvas:'element'},{canvas:'none'},{...mini,geometry:false,dom:'none'}),
  ...pairs('dom',{dom:'app'},{dom:'none'}),
  ...pairs('geometry',{geometry:true},{geometry:false}),
  ...pairs('trace',{trace:true},{trace:false}),
  ...pairs('extra-cdp',{extraCdp:true},{extraCdp:false}),
  ...pairs('instrument',{instrument:true},{instrument:false}),
  ...pairs('load-split',{canvas:'app'},{canvas:'split'}),
  ...pairs('moving',{moving:false},{moving:true},{...mini,duration:3000}),
 ];
 for(let repeat=0;repeat<3;repeat++)for(const [name,extra] of [['native',{native:true}],['phase',{native:false}],['off',{native:false,instrument:false}]])controls.push({mini:false,source:'sender',target:'paint',duration:6000,trace:browser==='chromium',captureStage:'none',name:`anchor-${repeat}-${name}`,factor:'app-anchor',repeat,...extra});
 const capture=[];
 for(const context of ['readback','default']){
  const base={...mini,context,captureStage:'after-trace-end',trace:browser==='chromium',pixelCheck:true,duration:1200};
  const add=(name,a,b)=>capture.push(...pairs(context+'-'+name,a,b,base));
  if(browser==='chromium'){
   add('api-surface',{captureApi:'playwright'},{captureApi:'cdp-surface'});
   add('api-view',{captureApi:'cdp-surface'},{captureApi:'cdp-view'});
   add('metrics',{captureEmulation:false},{captureEmulation:true});
  }
  add('trace-order',{captureStage:'before-trace-end'},{captureStage:'after-trace-end'});
  add('readback',{preReadback:false},{preReadback:true});
  add('dpr',{dpr:2},{dpr:1});
  add('release',{releaseResources:false},{releaseResources:true,pixelCheck:false});
  add('commands',{canvas:'app'},{canvas:'bitmap'});
 }
 return {'t-controls':controls,'t-capture':capture};
}
