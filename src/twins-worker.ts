import {createRenderRunner,type RenderRequest} from './twins-render';
// A structural type keeps the worker isolated from DOM Window APIs without changing repository tsconfig.
const scope=self as unknown as {onmessage:((event:MessageEvent)=>void)|null;postMessage:(message:unknown,transfer?:Transferable[])=>void};
const runner=createRenderRunner(callback=>setTimeout(callback,0),result=>scope.postMessage({type:'done',...result},[result.buffer]));
scope.onmessage=event=>{
 const message=event.data as {type:string;request:RenderRequest};
 if(message.type==='cancel'){runner.cancel();return;}
 if(message.type!=='render')return;
 try{runner.start(message.request);}catch(error){scope.postMessage({type:'error',id:message.request.id,message:(error as Error).message});}
};
