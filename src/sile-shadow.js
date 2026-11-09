// A compact shadow frustum follows the aircraft over the4.5km map. Quantize
// in light-camera right/up space; world-axis snapping crawls under oblique sun.
export function updateSileShadow(scene,flyer){
 const sun=scene.userData.sileSun;if(scene.userData.mapId!=='sile'||!sun?.castShadow||!flyer||!['x','y','z'].every(k=>Number.isFinite(flyer[k])))return false;
 const offset=sun.userData.sileOffset??=[sun.position.x-sun.target.position.x,sun.position.y-sun.target.position.y,sun.position.z-sun.target.position.z],length=Math.hypot(...offset);if(length<1e-8)return false;
 const forward=offset.map(n=>n/length),u=sun.shadow.camera.up,right=[u.y*forward[2]-u.z*forward[1],u.z*forward[0]-u.x*forward[2],u.x*forward[1]-u.y*forward[0]],rlen=Math.hypot(...right);if(rlen<1e-8)return false;for(let i=0;i<3;i++)right[i]/=rlen;
 const up=[forward[1]*right[2]-forward[2]*right[1],forward[2]*right[0]-forward[0]*right[2],forward[0]*right[1]-forward[1]*right[0]],stepX=(sun.shadow.camera.right-sun.shadow.camera.left)/sun.shadow.mapSize.x,stepY=(sun.shadow.camera.top-sun.shadow.camera.bottom)/sun.shadow.mapSize.y;
 if(![stepX,stepY].every(n=>Number.isFinite(n)&&n>0))return false;
 const p=[flyer.x,flyer.y,flyer.z],dot=v=>v.reduce((s,n,i)=>s+n*p[i],0),x=Math.round(dot(right)/stepX)*stepX,y=Math.round(dot(up)/stepY)*stepY,z=dot(forward),focus=right.map((n,i)=>n*x+up[i]*y+forward[i]*z);
 sun.target.position.set(...focus);sun.position.set(...focus.map((n,i)=>n+offset[i]));sun.target.updateMatrixWorld();return true;
}
