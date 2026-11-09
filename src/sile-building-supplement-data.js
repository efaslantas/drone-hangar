import source from './data/sile-building-supplement.json' with {type:'json'};
// Full canonical-data compatibility checksum, not authentication. Avoid Web
// Crypto so the same map works on HTTP LAN hosts as well as HTTPS/localhost.
export function buildingSnapshotKey(data){
 const text=JSON.stringify(data);let a=2166136261,b=0x9e3779b9;
 for(let i=0;i<text.length;i++){const c=text.charCodeAt(i);a=Math.imul(a^c,16777619);b=Math.imul(b^c,2246822519);b=b<<13|b>>>19;}
 return text.length+':'+(a>>>0).toString(16).padStart(8,'0')+':'+(b>>>0).toString(16).padStart(8,'0');
}
// The OSM/DSM snapshot and its buildings stay untouched; incompatible cached
// base data cannot silently receive roofprints from a different snapshot.
export async function prepareBuildingSupplement(data){
 if(buildingSnapshotKey(data)!==source.baseMapSnapshotKey)throw new Error('Şile ek bina kaynak eşleşmesi geçersiz.');
 return {...data,completionLayer:1,supplementalBuildings:source.records,supplementalSource:{release:source.release,license:source.license,attribution:source.attribution,notice:source.notice}};
}
