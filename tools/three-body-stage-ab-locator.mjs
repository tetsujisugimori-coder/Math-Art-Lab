export function decorate(result,selector,context){const {log,now,arm,disarm,next}=context;
 if(selector==='#sm-play'){const click=result.click.bind(result);result.click=async(...args)=>{const operationId=next();log('play-click-issued',{operationId});let error;try{await arm(operationId);log('play-click-dispatch',{operationId});return await click(...args);}catch(e){error=String(e);throw e;}finally{log('play-click-returned',{operationId,error});await disarm(operationId);}};}
 if(selector==='#sm-step-count'){const read=result.textContent.bind(result);result.textContent=async(...args)=>{const begin=now(),value=await read(...args);log('step-read',{begin,value});return value;};}return result;
}
