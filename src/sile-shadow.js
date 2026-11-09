// Keep a small, high-resolution shadow frustum near the aircraft rather than
// at the origin of a4.5km map. Snap its focus to shadow texels to avoid crawl.
export function updateSileShadow(scene,flyer){
 const sun=scene.userData.sileSun;if(scene.userData.mapId!=='sile'||!sun?.castShadow||!flyer||!['x','y','z'].every(k=>Number.isFinite(flyer[k])))return false;
 const offset=sun.userData.sileOffset??=[sun.position.x-sun.target.position.x,sun.position.y-sun.target.position.y,sun.position.z-sun.target.position.z],step=(sun.shadow.camera.right-sun.shadow.camera.left)/sun.shadow.mapSize.x;
 if(!Number.isFinite(step)||step<=0)return false;
 const x=Math.round(flyer.x/step)*step,y=Math.round(flyer.y/step)*step,z=Math.round(flyer.z/step)*step;sun.target.position.set(x,y,z);sun.position.set(x+offset[0],y+offset[1],z+offset[2]);sun.target.updateMatrixWorld();return true;
}
