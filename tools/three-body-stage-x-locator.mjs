// Diagnostic decoration must retain Playwright Locator identity/prototype.
export function decorateLocator(result,selector,log,now){
 if(selector==='#sm-play'){const click=result.click.bind(result);result.click=async(...args)=>{log('play-click-issued');try{return await click(...args);}finally{log('play-click-returned');}};}
 if(selector==='#sm-step-count'){const read=result.textContent.bind(result);result.textContent=async(...args)=>{const begin=now(),value=await read(...args);log('step-read',{begin,value});return value;};}
 return result;
}
