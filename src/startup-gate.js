// Deep links may finish loading before the app's map/render/UI initialization.
export function createStartupGate(){
 let release;const ready=new Promise(resolve=>release=resolve);
 return {complete:()=>release(),async run(task){await ready;return task();}};
}
