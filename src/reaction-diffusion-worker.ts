import {advance,type Request,type Reply} from './reaction-diffusion';
self.onmessage=(event:MessageEvent<Request>)=>{
 const {id,grid,settings,count,mode}=event.data,start=performance.now();let reply:Reply;
 try{reply={id,grid:advance(grid,settings,count,mode),ms:performance.now()-start};}catch(error){reply={id,error:String(error),ms:performance.now()-start};}
 if(reply.grid)self.postMessage(reply,{transfer:[reply.grid.u.buffer,reply.grid.v.buffer]});else self.postMessage(reply);
};
