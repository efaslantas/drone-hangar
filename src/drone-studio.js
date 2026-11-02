import * as THREE from 'three';

// Neutral product lighting; no dimensions or material values are measured BRDF data.
export function createDroneStudio({reduced=false}={}){
 const scene=new THREE.Scene();scene.environmentIntensity=.35;
 const deck=new THREE.Mesh(new THREE.CircleGeometry(1,64),new THREE.MeshStandardMaterial({color:0x303833,roughness:.92,metalness:0}));
 deck.name='workshop-platform';deck.rotation.x=-Math.PI/2;deck.receiveShadow=true;scene.add(deck);
 scene.add(new THREE.HemisphereLight(0xe9eee8,0x343b36,.85));
 const key=new THREE.DirectionalLight(0xfff1df,2.2);key.castShadow=true;
 key.shadow.mapSize.setScalar(reduced?512:1024);key.shadow.bias=-.00002;key.shadow.normalBias=.0006;key.shadow.radius=2;
 scene.add(key,key.target);
 const fill=new THREE.DirectionalLight(0xcbd9e5,.85);fill.position.set(-1,.7,-1);scene.add(fill);
 function fit(root){
  const pivot=new THREE.Group();pivot.name="workshop-yaw-pivot";pivot.add(root);
  root.position.set(0,0,0);root.updateMatrixWorld(true);
  const bounds=new THREE.Box3().setFromObject(root),center=bounds.getCenter(new THREE.Vector3());
  root.position.sub(center);root.updateMatrixWorld(true);bounds.translate(center.negate());
  const radius=Math.max(.01,bounds.getBoundingSphere(new THREE.Sphere()).radius);
  deck.scale.setScalar(radius*1.55);deck.position.y=bounds.min.y-.001;
  key.position.set(radius*2.4,radius*4,radius*3.5);key.target.position.set(0,0,0);
  const camera=key.shadow.camera;camera.left=camera.bottom=-radius*2.2;camera.right=camera.top=radius*2.2;camera.near=.001;camera.far=radius*10;camera.updateProjectionMatrix();
  return {radius,bounds,pivot};
 }
 return {scene,deck,key,fit};
}
