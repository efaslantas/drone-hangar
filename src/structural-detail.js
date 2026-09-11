import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/** Metre-scale construction details, batched by material. They stay within
 * existing walls or above the playable ceiling, so visual trim never creates
 * an invisible obstacle on a training route. */
export function addStructuralDetail(scene, id) {
  const groups = new Map();
  const steel = new THREE.MeshStandardMaterial({color:0x555b5a,metalness:.65,roughness:.58});
  const zinc = new THREE.MeshStandardMaterial({color:0x929995,metalness:.72,roughness:.48});
  const seam = new THREE.MeshStandardMaterial({color:0x646862,roughness:.92});
  function add(geo,mat) {
    if (!groups.has(mat)) groups.set(mat,[]);
    groups.get(mat).push(geo);
  }
  function box(w,h,d,x,y,z,mat) {
    add(new THREE.BoxGeometry(w,h,d).translate(x,y,z),mat);
  }
  function member(a,b,width,depth,mat) {
    const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b);
    const direction=end.clone().sub(start);
    const geo=new THREE.BoxGeometry(width,direction.length(),depth);
    geo.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),direction.normalize()));
    geo.translate(...start.add(end).multiplyScalar(.5).toArray());add(geo,mat);
  }
  if (id==='indoor') {
    // Portal columns use actual I sections rather than painted strips. All
    // projected steel stays behind the original inner wall face (39.4 m).
    for(const x of [-39.6,39.6]) for(let z=-72;z<=32;z+=16) {
      box(.045,15.5,.36,x,7.75,z,steel);
      for(const side of [-1,1])box(.32,15.5,.025,x,7.75,z+side*.18,steel);
      box(.38,.03,.5,x,.08,z,zinc);
    }
    // Lattice trusses occupy the roof void above the existing 15.55 m ceiling.
    for(let z=-72;z<=32;z+=16) {
      box(79,.11,.13,0,15.68,z,steel);
      box(79,.11,.13,0,17.0,z,steel);
      for(let x=-39;x<39;x+=3)
        member([x,15.69,z],[Math.min(x+3,39),17.0,z],.075,.075,zinc);
    }
    for(let z=-78;z<=38;z+=2) {
      box(.014,15.3,.023,-39.393,7.65,z,seam);
      box(.014,15.3,.023,39.393,7.65,z,seam);
    }
    for(let x=-38;x<=38;x+=2) {
      box(.023,15.3,.014,x,7.65,-79.393,seam);
      box(.023,15.3,.014,x,7.65,39.393,seam);
    }
    for(const y of [3.2,6.4,9.6,12.8]) {
      for(const x of [-39.393,39.393])box(.014,.025,118,x,y,-20,seam);
      for(const z of [-79.393,39.393])box(78,.025,.014,0,y,z,seam);
    }
  } else {
    const buildings=scene.children.filter(o=>o.geometry?.type==='BoxGeometry'
      && o.geometry.parameters.width>=8 && o.geometry.parameters.height>=5 && o.geometry.parameters.depth>=5);
    for(const b of buildings) {
      const {width:w,height:h,depth:d}=b.geometry.parameters;
      const {x,y,z}=b.position,top=y+h/2;
      // Standing seams and flashings provide scale without changing the
      // original silhouette or placing decorative doors across a real bay.
      for(const side of [-1,1]) {
        for(let dx=-w/2+.8;dx<w/2;dx+=1.2)
          box(.026,h-.2,.012,x+dx,y,z+side*(d/2+.005),seam);
        for(let dz=-d/2+.8;dz<d/2;dz+=1.2)
          box(.012,h-.2,.026,x+side*(w/2+.005),y,z+dz,seam);
        box(w,.08,.07,x,top-.12,z+side*(d/2-.04),zinc);
        box(.07,.08,d,x+side*(w/2-.04),top-.12,z,zinc);
        // Downpipes are recessed against the corners of the existing solid.
        box(.06,h-.2,.06,x+side*(w/2-.06),y,z+d/2-.025,zinc);
      }
    }
  }
  for(const [mat,geos] of groups) {
    const geometry=mergeGeometries(geos);
    const mesh=new THREE.Mesh(geometry,mat);
    mesh.name='structural-construction-detail';mesh.castShadow=mesh.receiveShadow=true;
    scene.add(mesh);geos.forEach(g=>g.dispose());
  }
  for(const mat of [steel,zinc,seam])if(!groups.has(mat))mat.dispose();
}
