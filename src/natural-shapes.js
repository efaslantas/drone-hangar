import * as THREE from 'three';
export function grassBladeGeometry() {
  const geo=new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.Float32BufferAttribute([
    -.014,0,0,.014,0,0,-.011,.4,.025,.013,.4,.025,
    .012,.75,.075,.026,.75,.075,.07,1,.14,
  ],3));
  geo.setIndex([0,1,2,1,3,2,2,3,4,3,5,4,4,5,6]);geo.computeVertexNormals();return geo;
}
