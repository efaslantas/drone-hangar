// Deep links may finish loading before the app's map/render/UI initialization.
export function createStartupGate(){
 let release;const ready=new Promise(resolve=>release=resolve);
 return {complete:()=>release(),async run(task){await ready;return task();}};
}

// Let the loading state reach a frame before synchronous world construction.
// One pending request owns preparation; every failure releases it for retry.
export function createFlightStartGate({start,busy,error,paint}){
 let pending=false;
 return async()=>{
  if(pending)return false;
  pending=true;
  try{busy(true);await paint();await start();return true;}
  catch(cause){error(cause);return false;}
  finally{pending=false;busy(false);}
 };
}
