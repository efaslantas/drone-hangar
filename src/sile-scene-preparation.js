import {unpackSileScene}from './sile-scene-payload.js';
const cancelled=()=>new DOMException('Şile preparation cancelled','AbortError');
export function createSilePreparation(workerFactory){
 let cached=null;
 return async(data,{signal}={})=>{
  if(signal?.aborted)throw cancelled();
  if(cached?.data!==data){
   const worker=workerFactory(),entry={data,worker,users:0,done:false};
   entry.promise=new Promise((resolve,reject)=>{entry.reject=reject;worker.onmessage=({data:r})=>{entry.done=true;worker.terminate();r.error?reject(Error(r.error.message)):resolve(r.packet);};worker.onerror=e=>{entry.done=true;worker.terminate();reject(Error(e.message||'Şile worker failed'));};worker.postMessage(data);});
   entry.promise.catch(()=>{if(cached===entry)cached=null;});cached=entry;
  }
  const entry=cached;entry.users++;
  try{return await new Promise((resolve,reject)=>{const abort=()=>{signal?.removeEventListener('abort',abort);reject(cancelled());};signal?.addEventListener('abort',abort,{once:true});entry.promise.then(packet=>{signal?.removeEventListener('abort',abort);signal?.aborted?reject(cancelled()):resolve(packet);},error=>{signal?.removeEventListener('abort',abort);reject(error);});});}
  finally{entry.users--;if(!entry.users&&!entry.done){entry.worker.terminate();entry.reject(cancelled());if(cached===entry)cached=null;}}
 };
}
const prepare=createSilePreparation(()=>new Worker(new URL('./sile-scene-worker.js',import.meta.url),{type:'module'}));
export async function prepareSileWorld(data,options={}){
 const packet=await prepare(data,options);return unpackSileScene(packet,()=>new Promise(r=>requestAnimationFrame(r)),options.signal);
}
