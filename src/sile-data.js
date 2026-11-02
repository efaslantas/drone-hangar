const pairs=ring=>Array.isArray(ring)&&ring.length>=3&&ring.every(p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite));
const rings=value=>Array.isArray(value)&&value.length>0&&value.every(pairs);
export function validateSileData(data){
 const t=data?.terrain;
 if(data?.version!==1||data.id!=='sile'||!t||!Number.isInteger(t.cols)||!Number.isInteger(t.rows)||t.cols<2||t.rows<2||t.cols>512||t.rows>512||!Array.isArray(t.bounds)||t.bounds.length!==4||!t.bounds.every(Number.isFinite)||t.bounds[0]>=t.bounds[1]||t.bounds[2]>=t.bounds[3]||!Number.isFinite(t.datum)||!Array.isArray(t.heights)||t.heights.length!==t.cols*t.rows||!t.heights.every(Number.isFinite)||!Array.isArray(t.land)||!t.land.length||!t.land.every(rings))throw new Error('Şile arazi verisi geçersiz.');
 if(!Array.isArray(data.positions)||data.positions.length%9||!data.positions.length||!data.positions.every(Number.isFinite)||!Array.isArray(data.buildings)||!data.buildings.every(b=>rings(b.rings)&&Number.isFinite(b.base)&&Number.isFinite(b.height)&&b.height>0)||!Array.isArray(data.roads)||!data.roads.every(r=>Array.isArray(r.points)&&r.points.length>=2&&r.points.every(p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite))&&Number.isFinite(r.width)&&r.width>0)||!Array.isArray(data.landmarks))throw new Error('Şile geometri verisi geçersiz.');
 if(!Array.isArray(data.structures)||!data.structures.every(b=>rings(b.rings)&&Number.isFinite(b.base)&&Number.isFinite(b.height)&&b.height>0)||!data.landmarks.every(l=>typeof l.name==='string'&&Number.isFinite(l.x)&&Number.isFinite(l.z))||!data.projection||!['lat','lon','metresLat','metresLon','offsetX','offsetZ'].every(k=>Number.isFinite(data.projection[k]))||!data.stats||data.stats.buildings!==data.buildings.length||data.stats.roads!==data.roads.length)throw new Error('Şile kaynak sözleşmesi geçersiz.');
 return data;
}
export function createSileLoader(fetcher){
 let current=null,pending=null;
 return {get:()=>current,load(){
  if(current)return Promise.resolve(current);
  if(!pending)pending=fetcher('/maps/sile/map.json').then(r=>{if(!r.ok)throw new Error('Şile verisi yüklenemedi.');return r.json();}).then(validateSileData).then(data=>(current=data)).catch(error=>{pending=null;throw error;});
  return pending;
 }};
}
const loader=createSileLoader(url=>fetch(url));
export const loadSileData=()=>loader.load();
export const getSileData=()=>loader.get();
