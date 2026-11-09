// Deep links may finish loading before the app's map/render/UI initialization.
export function createStartupGate(){
 let release;const ready=new Promise(resolve=>release=resolve);
 return {complete:()=>release(),async run(task){await ready;return task();}};
}

// Let the loading state reach a frame before synchronous world construction.
// One pending request owns preparation; every failure releases it for retry.
export function createFlightStartGate({start,busy,error,paint,cancelled=()=>{}}){
 let pending=false,controller=null;
 const run=async()=>{
  if(pending)return false;
  pending=true;controller=new AbortController();const signal=controller.signal;
  try{busy(true);await paint();signal.throwIfAborted();await start(signal);signal.throwIfAborted();return true;}
  catch(cause){if(signal.aborted||cause?.name==='AbortError')cancelled();else error(cause);return false;}
  finally{pending=false;controller=null;busy(false);}
 };
 run.cancel=()=>{if(!controller)return false;controller.abort();return true;};return run;
}
