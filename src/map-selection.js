// Only the latest map/activity choice may commit; failures keep the old map.
export function createMapSelector({load,commit,busy,error}){
 let revision=0;
 const select=async (id,context)=>{
  const token=++revision;busy(true);
  try{if(id==='sile')await load();if(token!==revision)return false;commit(id,context);return true;}
  catch(cause){if(token===revision)error(cause);return false;}
  finally{if(token===revision)busy(false);}
 };
 select.cancel=()=>{revision++;busy(false);};
 return select;
}
