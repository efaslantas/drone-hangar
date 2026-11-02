import {airframeAppearance,carbonUvs,AIRFRAME_DIMENSIONS} from './airframe-appearance.js';
import {makeSourceOneFrame} from './source-one-frame.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import {addDroneElectronics} from './drone-electronics.js';
import { addAirframeDetails } from "./drone-details.js";

let carbonTextures;
function carbon(){
 if(carbonTextures)return carbonTextures;
 const size=128,edge=new Uint8Array(size*size*4),color=new Uint8Array(size*size*4),rough=new Uint8Array(size*size*4),normal=new Uint8Array(size*size*4);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const i=(y*size+x)*4,warp=(Math.floor(x/8)+Math.floor(y/8))%4<2,grain=Math.sin((warp?x:y)*Math.PI/4),value=38+(warp?7:0)+grain*3;
  edge.set([55+(y%8<2?12:0),58+(y%8<2?12:0),59+(y%8<2?12:0),255],i);color.set([value,value+2,value+3,255],i);rough.set([160+grain*9,160+grain*9,160+grain*9,255],i);normal.set([128+(warp?grain*10:0),128+(warp?0:grain*10),254,255],i);
 }
 const texture=(data,space)=>{const t=new THREE.DataTexture(data,size,size);t.colorSpace=space;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.magFilter=THREE.LinearFilter;t.minFilter=THREE.LinearMipmapLinearFilter;t.generateMipmaps=true;t.anisotropy=8;t.needsUpdate=true;return t;};
 carbonTextures={edge:texture(edge,THREE.SRGBColorSpace),map:texture(color,THREE.SRGBColorSpace),rough:texture(rough,THREE.NoColorSpace),normal:texture(normal,THREE.NoColorSpace)};return carbonTextures;
}

function mats(spec) {
  const { map, rough, normal, edge } = carbon();
  return {
    frame: new THREE.MeshStandardMaterial({
      map,
      roughnessMap: rough,
      normalMap: normal,normalScale:new THREE.Vector2(.12,.12),
      color: 0x7d8380,
      metalness: 0.02,
      roughness: 0.78,
      envMapIntensity: 0.35,
    }),
    carbonEdge:new THREE.MeshStandardMaterial({map:edge,color:0x979c99,roughness:.9,metalness:0,envMapIntensity:.15}),
    metal: new THREE.MeshStandardMaterial({
      color: 0x68717a,
      metalness: 0.95,
      roughness: 0.32,
      envMapIntensity: 1.5,
    }),
    bell: new THREE.MeshStandardMaterial({
      color: 0x2a2c30,
      metalness: 0.85,
      roughness: 0.28,
      envMapIntensity: 1.25,
    }),
    accent: new THREE.MeshStandardMaterial({
      color: new THREE.Color(spec.accent).lerp(new THREE.Color(0x555b56), .55),
      metalness: 0.02,
      roughness: 0.38,
      emissive: spec.accent,
      emissiveIntensity: 0,
      envMapIntensity: 1.05,
    }),
    prop: new THREE.MeshStandardMaterial({
      color: 0x1a1a1c,
      roughness: 0.48,
      metalness: 0.04,
    }),
    disc: new THREE.MeshStandardMaterial({
      color: 0xd8dde2,
      transparent: true,
      opacity: 0.22,
      roughness: 0.2,
      metalness: 0.05,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
    batt: new THREE.MeshStandardMaterial({
      color: 0x454943,
      roughness: 0.62,
      metalness: 0.08,
    }),
    tape: new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.85 }),
    pcb: new THREE.MeshStandardMaterial({ color: 0x294a37, roughness: 0.55, metalness: 0.15 }),
    gold: new THREE.MeshStandardMaterial({ color: 0xc4a24a, metalness: 0.9, roughness: 0.25 }),
    copper:new THREE.MeshStandardMaterial({color:0xb6783d,metalness:.8,roughness:.36}),
    connector:new THREE.MeshStandardMaterial({color:0xcda43a,roughness:.6}),
    tpu: new THREE.MeshStandardMaterial({ color: 0x1a1c1e, roughness: 0.78, metalness: 0.05 }),
    lens: new THREE.MeshStandardMaterial({
      color: 0x0a1018,
      metalness: 0.95,
      roughness: 0.06,
      envMapIntensity: 1.8,
      emissive: 0x0a2030,
      emissiveIntensity: 0.04,
    }),
    glass: new THREE.MeshStandardMaterial({
      color: 0x89b8d0,
      metalness: 0.2,
      roughness: 0.08,
      transparent: true,
      opacity: 0.35,
      envMapIntensity: 1.6,
    }),
    canopy: new THREE.MeshPhysicalMaterial({
      color: spec.gimbal ? 0xb9bec1 : 0x252b32,
      roughness: 0.48,
      metalness: 0,
      clearcoat: .04,
      clearcoatRoughness: .45,
      envMapIntensity: 1.1,
    }),
  };
}

function bladeGeo(radius) {
  // A closed swept airfoil, with rounded tips and decreasing pitch toward
  // the tip. The former rectangular blades looked like flat toy paddles.
  const g = new THREE.SphereGeometry(1, 12, 24);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const t = (pos.getY(i) + 1) * .5;
    const chord = radius * (.13 - .075 * t);
    const x = pos.getX(i) * chord;
    const thickness = pos.getZ(i) * radius * .012 * (1 - .65 * t);
    const pitch = .46 - .31 * t;
    pos.setXYZ(i, x * Math.cos(pitch) + radius * .06 * t * t,
      x * Math.sin(pitch) + thickness, radius * (.08 + .92 * t));
  }
  g.computeVertexNormals();
  return g;
}

function makeProp(radius, blades, mat) {
  const g = new THREE.Group();
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.1, radius * 0.13, radius * 0.07, 12), mat);
  g.add(hub);
  const nut = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.055, radius * 0.055, radius * 0.04, 6), mat);
  nut.position.y = radius * 0.04;
  g.add(nut);
  const geo = bladeGeo(radius);
  for (let i = 0; i < blades; i++) {
    const blade = new THREE.Mesh(geo, mat);
    blade.name = "pitched-propeller-blade";
    const wrap = new THREE.Group();
    wrap.rotation.y = (i / blades) * Math.PI * 2;
    wrap.add(blade);
    g.add(wrap);
  }
  return g;
}

function addMotor(root,m,appearance,px,mountY,pz){
 const motor=new THREE.Group();motor.name='brushless-motor';motor.position.set(px,mountY,pz);
 const r=appearance.motorDiameter/2,h=appearance.motorBodyH,groups=new Map();
 function add(geo,mat,x=0,y=0,z=0,yaw=0){geo.rotateY(yaw);geo.translate(x,y,z);if(!groups.has(mat))groups.set(mat,[]);groups.get(mat).push(geo);}
 if(mountY>.005)add(new THREE.CylinderGeometry(r*.72,r*.9,mountY,16),m.tpu,0,-mountY/2);
 add(new THREE.CylinderGeometry(r*.89,r*.91,.002,24),m.metal,0,.001);
 for(let i=0;i<12;i++){
  const angle=i*Math.PI/6;
  add(new THREE.CylinderGeometry(r,r,h*.67,5,1,true,angle,Math.PI/6*.62),m.bell,0,h*.55);
  add(new THREE.CylinderGeometry(r*.09,r*.09,h*.52,6),m.copper,Math.sin(angle)*r*.65,h*.42,Math.cos(angle)*r*.65);
 }
 const ring=new THREE.TorusGeometry(r-.0006,.0006,6,32);ring.rotateX(Math.PI/2);add(ring,m.metal,0,h-.0006);
 for(let i=0;i<6;i++){const a=i*Math.PI/3;add(new THREE.BoxGeometry(r*.13,.0012,r*.7),m.bell,Math.sin(a)*r*.48,h-.001,Math.cos(a)*r*.48,a);}
 const shaftH=appearance.motorTotalH-h;add(new THREE.CylinderGeometry(Math.min(.0025,r*.18),Math.min(.0025,r*.18),shaftH,12),m.metal,0,h+shaftH/2);
 for(const [mat,pieces] of groups){const mesh=new THREE.Mesh(mergeGeometries(pieces),mat);mesh.castShadow=mesh.receiveShadow=true;mesh.name=mat===m.copper?'motor-windings':mat===m.bell?'motor-bell':'motor-shaft';motor.add(mesh);pieces.forEach(g=>g.dispose());}
 root.add(motor);root.userData.motors.push(motor);return mountY+h+.003;
}

export const CAM_POD = "camera-pod";
// 30 degrees up, the middle option in the hangar; main.js hands in whatever
// the pilot picked, this is only for models built outside the flight screen.
export const DEFAULT_CAM_TILT = (30 * Math.PI) / 180;

// Visual dimensions in metres. Physics size is a conservative collision
// envelope, not the motor-to-motor wheelbase or the propeller diameter.
export {AIRFRAME_DIMENSIONS} from './airframe-appearance.js';

// Re-aim an already built craft's pod (the hangar tilt can change mid-session).
export function setCamPodTilt(root, tilt) {
  const pod = root?.getObjectByName(CAM_POD);
  if (pod){pod.rotation.x=tilt;recordAirframeAnchors(root);}
  return pod;
}

function recordAirframeAnchors(root){
 root.updateWorldMatrix(true,true);
 const inverse=root.matrixWorld.clone().invert(),bounds=new THREE.Box3(),part=new THREE.Box3(),matrix=new THREE.Matrix4();
 root.traverse(o=>{if(!o.geometry||o.isSprite||o.name==='rotor-blur')return;if(!o.geometry.boundingBox)o.geometry.computeBoundingBox();matrix.multiplyMatrices(inverse,o.matrixWorld);part.copy(o.geometry.boundingBox).applyMatrix4(matrix);bounds.union(part);});
 // Include a full swept rotor disk, so animation phase cannot move the floor.
 const visual=root.userData.visual;if(visual){const radius=visual.propDiameter*.505;for(const rotor of root.userData.props||[]){bounds.min.x=Math.min(bounds.min.x,rotor.position.x-radius);bounds.max.x=Math.max(bounds.max.x,rotor.position.x+radius);bounds.min.z=Math.min(bounds.min.z,rotor.position.z-radius);bounds.max.z=Math.max(bounds.max.z,rotor.position.z+radius);}}
 const contact=root.userData.contactBounds||(root.userData.contactBounds={});contact.min=bounds.min.toArray();contact.max=bounds.max.toArray();
 const lens=root.getObjectByName('fpv-optical-centre');if(lens)root.userData.fpvAnchor=lens.getWorldPosition(new THREE.Vector3()).applyMatrix4(inverse).toArray();
 return contact;
}

export function makeDrone(spec, camTilt = DEFAULT_CAM_TILT) {
  const m = mats(spec);
  const root = new THREE.Group();
  const appearance=airframeAppearance(spec);root.userData.motors=[];root.userData.guards=[];root.userData.ownedTextures=[];root.userData.ownedMaterials=Object.values(m);
  const s = spec.size;
  const ducts = !!spec.ducts;
  const racer = spec.id === "racer";
  const stretch = racer || spec.id === "freestyle" || spec.id === "toothpick";
  const dimensions = AIRFRAME_DIMENSIONS[spec.id];
  const spread = spec.dynamics ? spec.dynamics.wheelbaseMm / 1000 / Math.sqrt(8) : dimensions ? dimensions.wheelbase / Math.sqrt(8) : s * (ducts ? 0.5 : stretch ? 0.64 : 0.58);
  const propR = dimensions ? dimensions.propDiameter / 2 : s * (ducts ? .25 : .4);
  const blades = spec.build ? ({ bi:2, tri:3, quad:4 }[spec.build.props] || 3) : ducts || ['freestyle','racer','cine5','seven'].includes(spec.id) ? 3 : 2;
  const frameWidth = spec.build ? ({ race:.92, freestyle:1.12, longrange:.92 }[spec.build.frame] || 1) : 1;
  const frameLength = spec.build?.frame === "longrange" ? 1.22 : 1;
  const plateW = appearance.plateW * (appearance.sourceOne?1:frameWidth);
  const plateL = appearance.plateL * (appearance.sourceOne?1:frameLength);

  if(appearance.sourceOne)root.add(makeSourceOneFrame(m.frame,appearance,m.carbonEdge));
  else {
  const bot = new THREE.Mesh(new RoundedBoxGeometry(plateW, s * 0.028, plateL, 2, s*.01), m.frame);
  bot.position.y = -s * 0.012;
  bot.castShadow = true;
  const top = new THREE.Mesh(new RoundedBoxGeometry(plateW * 0.92, s * 0.026, plateL * 0.72, 2, s*.009), m.frame);
  top.position.y = appearance.stackH;
  top.castShadow = true;
  root.add(bot, top);
  }

  for (const [sx, sz] of [
    [1, 1],
    [1, -1],
    [-1, 1],
    [-1, -1],
  ]) {
    const st = new THREE.Mesh(new THREE.CylinderGeometry(.0018, .0018, appearance.stackH, 10), m.metal);
    st.position.set(sx * (appearance.sourceOne?.012:plateW*.32), appearance.stackH/2, sz * (appearance.sourceOne?.03615:plateL*.28));
    root.add(st);
  }

  addDroneElectronics(root,spec,appearance,m);

  const topPack=!ducts&&!spec.gimbal;
  const battW=appearance.pack.width,battL=appearance.pack.length,packH=appearance.pack.height;
  const packY=topPack?(appearance.sourceOne?.032:appearance.stackH+.003)+packH/2:-s*.035-packH/2;
  const packZ=topPack?(appearance.sourceOne?.02:plateL*.06):0;
  const batt=new THREE.Mesh(new RoundedBoxGeometry(battW,packH,battL,2,Math.min(.004,packH*.12)),m.batt);batt.name='build-battery';batt.position.set(0,packY,packZ);root.add(batt);root.userData.activeBattery=batt;
  for(const side of [-1,1]){const band=new THREE.Mesh(new RoundedBoxGeometry(battW+.001,packH+.001,.006,2,.0005),m.tape);band.position.set(0,packY,packZ+side*battL*.26);root.add(band);}
  const xt=new THREE.Mesh(new RoundedBoxGeometry(.01,.006,.011,1,.001),m.connector);xt.position.set(battW*.6,packY-packH*.25,packZ+battL*.5+.008);root.add(xt);
  for(const x of [-.0025,.0025]){const pin=new THREE.Mesh(new THREE.CylinderGeometry(.0014,.0014,.006,10),m.gold);pin.rotation.x=Math.PI/2;pin.position.set(xt.position.x+x,xt.position.y,xt.position.z+.004);root.add(pin);}

  const camY = spec.gimbal ? -s * 0.04 : appearance.sourceOne?.017:appearance.stackH*.55;
  const pod = new THREE.Group();
  pod.name = CAM_POD;
  pod.position.set(0, camY, appearance.sourceOne?-.060:-plateL*.52);
  pod.rotation.x = camTilt;
  root.add(pod);
  const tpu = new THREE.Mesh(new RoundedBoxGeometry(appearance.sourceOne?.022:s*.16, appearance.sourceOne?.022:s*.13, s*.12, 2, s*.012), m.tpu);
  pod.add(tpu);
  const bodyCam = new THREE.Mesh(new THREE.BoxGeometry(appearance.sourceOne?.019:s*.11, appearance.sourceOne?.019:s*.09, s*.1), m.metal);
  bodyCam.position.set(0, 0, -s * 0.02);
  pod.add(bodyCam);
  const lensHousing = new THREE.Mesh(new THREE.CylinderGeometry(s * 0.038, s * 0.042, s * 0.055, 16), m.metal);
  lensHousing.rotation.x = Math.PI / 2;
  lensHousing.position.set(0, 0, -s * 0.09);
  pod.add(lensHousing);
  const lens = new THREE.Mesh(new THREE.SphereGeometry(s * 0.032, 14, 10), m.lens);lens.name='fpv-optical-centre';
  lens.scale.z = 0.55;
  lens.position.set(0, 0, -s * 0.11);
  pod.add(lens);
  const glass = new THREE.Mesh(new THREE.CircleGeometry(s * 0.03, 16), m.glass);
  glass.position.set(0, 0, -s * 0.122);
  glass.rotation.y = Math.PI;
  pod.add(glass);

  if (spec.gimbal) {
    const yaw = new THREE.Mesh(new THREE.TorusGeometry(s * 0.12, s * 0.012, 8, 20), m.metal);
    yaw.position.set(0, -s * 0.18, s * 0.02);
    const roll = new THREE.Mesh(new THREE.TorusGeometry(s * 0.09, s * 0.01, 8, 18), m.metal);
    roll.rotation.x = Math.PI / 2;
    roll.position.copy(yaw.position);
    const cam = new THREE.Mesh(new THREE.BoxGeometry(s * 0.12, s * 0.08, s * 0.1), m.metal);
    cam.position.copy(yaw.position);
    const gLens = new THREE.Mesh(new THREE.CylinderGeometry(s * 0.035, s * 0.038, s * 0.04, 14), m.lens);
    gLens.rotation.x = Math.PI / 2;
    gLens.position.set(0, yaw.position.y, yaw.position.z - s * 0.07);
    root.add(yaw, roll, cam, gLens);
    for (const sx of [-1, 1]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(s * 0.016, s * 0.022, s * 0.24, 7), m.metal);
      leg.position.set(sx * s * 0.17, -s * 0.16, s * 0.1);
      leg.rotation.z = sx * 0.28;
      root.add(leg);
    }
  }

  if (ducts || spec.gimbal) {
    // A centered dome reads as front-back symmetric at a glance — the whole
    // point of the LEDs above was to fix that, but the canopy is the bigger
    // shape and still fights them. Taper it to a narrower point over the
    // camera (-Z, front) and leave it fuller over the electronics (+Z, rear)
    // so the silhouette itself is directional, nose-cone style.
    const capR = s * 0.22;
    const capGeo = new RoundedBoxGeometry(s * (spec.gimbal ? .48 : .31), s * .13, s * (spec.gimbal ? .52 : .43), 3, s * .045);
    const pos = capGeo.attributes.position;
    const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      const taper = THREE.MathUtils.mapLinear(THREE.MathUtils.clamp(v.z, -capR, capR), -capR, capR, 0.6, 1.08);
      v.x *= taper;
      pos.setXYZ(i, v.x, v.y, v.z);
    }
    pos.needsUpdate = true;
    capGeo.computeVertexNormals();
    const cap = new THREE.Mesh(capGeo, m.canopy);
    cap.position.set(0, s * 0.095, -s * 0.015);
    cap.name = "formed-equipment-shell";
    root.add(cap);
    for (const side of [-1, 1]) {
      for (let i=0;i<4;i++) {
        const vent = new THREE.Mesh(new RoundedBoxGeometry(s*.008,s*.014,s*.065,1,s*.003),m.tape);
        vent.position.set(side*s*(spec.gimbal ? .236 : .149),s*.094,s*(.025+i*.026));
        root.add(vent);
      }
    }
  }

  const ant = new THREE.Mesh(new THREE.CylinderGeometry(s * 0.007, s * 0.009, s * 0.32, 6), m.accent);
  ant.position.set(appearance.sourceOne?.012:s*.07, appearance.sourceOne?.056:appearance.stackH+.02, appearance.sourceOne?.076:plateL*.38);
  ant.rotation.z = 0.45;
  ant.rotation.x = 0.15;
  root.add(ant);
  if (spec.id === "seven" || spec.gimbal) {
    const gps = new THREE.Mesh(new THREE.CylinderGeometry(s * 0.07, s * 0.07, s * 0.025, 14), m.tpu);
    gps.position.set(-s * 0.06, s * 0.08, plateL * 0.12);
    root.add(gps);
  }

  // Front/rear are otherwise hard to read at a glance — a small drone's
  // silhouette (especially ducted whoop/cinewhoop bodies) looks nearly
  // symmetric front-to-back. Real FPV craft solve this with a fixed white
  // front / red rear light regardless of the frame's own accent color, so
  // that's the one dependable cue; sized and lit to actually read at model
  // scale rather than disappearing into the frame.
  const ledSize = [s * 0.075, s * 0.013, s * 0.018];
  const ledR = new THREE.Mesh(
    new THREE.BoxGeometry(...ledSize),
    new THREE.MeshStandardMaterial({ color: 0x4a0808, emissive: 0xff1a1a, emissiveIntensity: .65 }),
  );
  ledR.position.set(0, s * 0.03, plateL * 0.53);
  const ledF = new THREE.Mesh(
    new THREE.BoxGeometry(...ledSize),
    new THREE.MeshStandardMaterial({ color: 0xe8e8e8, emissive: 0xffffff, emissiveIntensity: .65 }),
  );
  ledF.position.set(0, s * 0.03, -plateL * 0.53);
  root.add(ledR, ledF);

  const props = [];
  const discs = [];
  const corners = [
    [1, 1],
    [1, -1],
    [-1, 1],
    [-1, -1],
  ];
  corners.forEach(([sx, sz], i) => {
    const px = sx * spread;
    const pz = sz * spread;
    if(!appearance.sourceOne){
    const armLen = Math.hypot(px, pz) + s*.07;
    const arm = new THREE.Mesh(
      new THREE.BoxGeometry(s * (racer ? 0.048 : ducts ? 0.055 : 0.062), s * 0.028, armLen),
      m.frame,
    );
    arm.position.set(px * 0.5, 0, pz * 0.5);
    arm.rotation.y = Math.atan2(sx, sz);
    arm.castShadow = true;
    root.add(arm);
    const pad = new THREE.Mesh(new THREE.BoxGeometry(s * 0.13, s * 0.022, s * 0.13), m.frame);
    pad.position.set(px, -s * 0.006, pz);
    pad.rotation.y = Math.PI / 4;
    root.add(pad);

    }
    const mountY=appearance.sourceOne?.001:(ducts||spec.gimbal)?Math.max(s*.014,s*.16+.004-appearance.motorBodyH-.003):s*.014;
    const propY=addMotor(root,m,appearance,px,mountY,pz);

    if (ducts) {
      const ductRadius = propR + s*.025;
      const guardBottom=propY-(spec.id==='cinewhoop'?.009:.005),guardTop=propY+.003,guardH=guardTop-guardBottom;
      const duct = new THREE.Mesh(new THREE.CylinderGeometry(ductRadius, ductRadius, guardH, 40, 1, true), m.tpu);duct.name="propeller-guard";root.userData.guards.push(duct);
      duct.material.side = THREE.DoubleSide;
      duct.position.set(px, (guardTop+guardBottom)/2, pz);
      const rim = new THREE.Mesh(new THREE.TorusGeometry(ductRadius, s * 0.008, 8, 40), m.tpu);
      rim.rotation.x = Math.PI / 2;
      rim.position.set(px, guardTop, pz);
      root.add(duct, rim);
      const lowerRim = rim.clone(); lowerRim.position.y = guardBottom; root.add(lowerRim);
      for (let spoke=0;spoke<3;spoke++) {
        const angle=spoke*Math.PI*2/3;
        const brace=new THREE.Mesh(new THREE.BoxGeometry(s*.018,s*.018,ductRadius*.78),m.tpu);
        brace.position.set(px+Math.sin(angle)*ductRadius*.55,guardBottom,pz+Math.cos(angle)*ductRadius*.55);
        brace.rotation.y=angle;root.add(brace);
      }
    }

    const prop = makeProp(propR, blades, m.prop);
    prop.scale.x = sx * sz;
    prop.position.set(px, propY, pz);
    prop.userData.spin = sx * sz;
    root.add(prop);
    props.push(prop);

    const disc = new THREE.Mesh(new THREE.CircleGeometry(propR * 0.95, 24), m.disc.clone());
    disc.name='rotor-blur';disc.visible = false;
    disc.rotation.x = -Math.PI / 2;
    disc.position.set(px, propY+.0004, pz);
    root.add(disc);
    discs.push(disc);
  });

  addAirframeDetails(root, spec, {size:s,plateW,plateL,spread,battW,battL,packH,packY,packZ,motorMounts:root.userData.motors,cells:appearance.pack.cells,capacityMah:appearance.pack.capacityMah});
  const carbonGeometry=new Set();root.traverse(o=>{if(o.material===m.frame&&o.geometry&&!carbonGeometry.has(o.geometry)){carbonUvs(o.geometry);carbonGeometry.add(o.geometry);}});
  root.userData.visual=appearance;
  root.userData.props = props;
  root.userData.discs = discs;
  root.userData.spec = spec;
  recordAirframeAnchors(root);
  return root;
}

export function disposeDrone(root){
 if(!root||root.userData.disposed)return;
 const resources=new Set(root.userData.ownedMaterials||[]);
 for(const texture of root.userData.ownedTextures||[])resources.add(texture);
 root.traverse(o=>{
  if(o.geometry&&!o.isSprite)resources.add(o.geometry);
  for(const material of (Array.isArray(o.material)?o.material:o.material?[o.material]:[]))resources.add(material);
  if(o.userData.ownedTexture)resources.add(o.userData.ownedTexture);
 });
 root.removeFromParent();for(const resource of resources)resource.dispose();root.userData.disposed=true;
}

// Every model owns its materials; only texture maps are shared between craft.
export function setDroneOpacity(root,opacity){
 const value=THREE.MathUtils.clamp(Number.isFinite(opacity)?opacity:1,0,1),seen=new Set();
 root.traverse(o=>{for(const material of Array.isArray(o.material)?o.material:o.material?[o.material]:[]){if(seen.has(material))continue;seen.add(material);material.transparent=value<1;material.opacity=value;material.depthWrite=value===1;material.needsUpdate=true;}});
}

function hexCol(n) {
  return `#${n.toString(16).padStart(6, "0")}`;
}

export function droneSvg(spec) {
  const body = hexCol(spec.color);
  const acc = hexCol(spec.accent);
  const spread = spec.ducts ? 26 : spec.gimbal ? 30 : 28;
  const pr = spec.ducts ? 15 : 17;
  const corners = [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ];
  const motors = corners
    .map(([sx, sz]) => {
      const x = 60 + sx * spread;
      const y = 60 + sz * spread;
      const ring = spec.ducts
        ? `<circle cx="${x}" cy="${y}" r="${pr + 5}" fill="none" stroke="${body}" stroke-width="5"/>`
        : "";
      return `${ring}
        <ellipse cx="${x}" cy="${y}" rx="${pr}" ry="${pr}" fill="#cfd3d6" fill-opacity=".45"/>
        <line x1="${x - pr}" y1="${y}" x2="${x + pr}" y2="${y}" stroke="#e8eaed" stroke-width="2.2"/>
        <line x1="${x}" y1="${y - pr}" x2="${x}" y2="${y + pr}" stroke="#e8eaed" stroke-width="2.2"/>
        <circle cx="${x}" cy="${y}" r="4.5" fill="${acc}"/>`;
    })
    .join("");
  const bw = spec.gimbal ? 30 : spec.id === "racer" ? 16 : 22;
  const bh = spec.id === "racer" ? 40 : spec.gimbal ? 34 : 24;
  const gimbal = spec.gimbal
    ? `<circle cx="60" cy="${60 + bh / 2 + 6}" r="9" fill="${acc}"/><circle cx="60" cy="${60 + bh / 2 + 6}" r="4" fill="#111"/>`
    : "";
  return `<svg viewBox="0 0 120 120" class="drone-svg" aria-hidden="true">
    <line x1="${60 - spread}" y1="${60 - spread}" x2="${60 + spread}" y2="${60 + spread}" stroke="${body}" stroke-width="6" stroke-linecap="round"/>
    <line x1="${60 + spread}" y1="${60 - spread}" x2="${60 - spread}" y2="${60 + spread}" stroke="${body}" stroke-width="6" stroke-linecap="round"/>
    <rect x="${60 - bw / 2}" y="${60 - bh / 2}" width="${bw}" height="${bh}" rx="3" fill="${body}" stroke="${acc}" stroke-width="1.6"/>
    <circle cx="60" cy="${60 - bh / 2}" r="3.2" fill="${acc}"/>
    ${gimbal}${motors}
  </svg>`;
}

export function spinProps(root,throttle,dt,rotorCommands=null){
 const props=root.userData.props||[],discs=root.userData.discs||[],motors=root.userData.motors||[];
 props.forEach((p,i)=>{
  const command=Math.min(1,Math.max(0,Number.isFinite(rotorCommands?.[i])?rotorCommands[i]:throttle||0));
  // Visual animation from model commands; not measured motor RPM.
  const delta=(command>0?10+command*62:0)*Math.max(0,dt||0)*(p.userData.spin||1);
  p.rotation.y+=delta;const bell=motors[i]?.getObjectByName('motor-bell');if(bell)bell.rotation.y+=delta;
  const disc=discs[i];if(disc){const opacity=Math.min(.12,command*.17);disc.material.opacity=opacity;disc.visible=opacity>.04;}
 });
}

export function makeNametag(text, color = "#c8ff9a") {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 64;
  const g = c.getContext("2d");
  g.fillStyle = "rgba(0,0,0,0.55)";
  g.fillRect(0, 0, 256, 64);
  g.fillStyle = color;
  g.font = "28px ui-monospace, monospace";
  g.textAlign = "center";
  g.fillText(text.slice(0, 18), 128, 42);
  const tex = new THREE.CanvasTexture(c);
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: tex, transparent: true }),
  );
  if (!sprite.geometry.getAttribute("normal")) {
    const n = new Float32Array(sprite.geometry.getAttribute("position").count * 3);
    for (let i = 2; i < n.length; i += 3) n[i] = 1;
    sprite.geometry.setAttribute("normal", new THREE.BufferAttribute(n, 3));
  }
  sprite.name='pilot-name-tag';sprite.userData.ownedTexture=tex;
  sprite.scale.set(1.6, 0.4, 1);
  sprite.position.y = 0.55;
  return sprite;
}
