import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { addAirframeDetails } from "./drone-details.js";

let carbonMap = null;
let carbonRough = null;
function carbon() {
  if (carbonMap) return { map: carbonMap, rough: carbonRough };
  const c = document.createElement("canvas");
  const r = document.createElement("canvas");
  c.width = c.height = r.width = r.height = 256;
  const g = c.getContext("2d");
  const rg = r.getContext("2d");
  g.fillStyle = "#353a38";
  g.fillRect(0, 0, 256, 256);
  rg.fillStyle = "#6a6a6a";
  rg.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 4) {
    for (let x = 0; x < 256; x += 4) {
      const weave = ((x >> 2) ^ (y >> 2)) & 1;
      g.fillStyle = weave ? "#494e4b" : "#303633";
      g.fillRect(x, y, 4, 4);
      g.fillStyle = weave ? "rgba(120,124,140,0.18)" : "rgba(0,0,0,0.28)";
      g.fillRect(x, y, 4, 1);
      rg.fillStyle = weave ? "#8a8a8a" : "#4a4a4a";
      rg.fillRect(x, y, 4, 4);
    }
  }
  carbonMap = new THREE.CanvasTexture(c);
  carbonMap.wrapS = carbonMap.wrapT = THREE.RepeatWrapping;
  carbonMap.repeat.set(8, 8);
  carbonMap.colorSpace = THREE.SRGBColorSpace;
  carbonMap.anisotropy = 8;
  carbonRough = new THREE.CanvasTexture(r);
  carbonRough.wrapS = carbonRough.wrapT = THREE.RepeatWrapping;
  carbonRough.repeat.set(8, 8);
  return { map: carbonMap, rough: carbonRough };
}

function mats(spec) {
  const { map, rough } = carbon();
  return {
    frame: new THREE.MeshStandardMaterial({
      map,
      roughnessMap: rough,
      color: 0x989d99,
      metalness: 0.18,
      roughness: 0.72,
      envMapIntensity: 1.2,
    }),
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

function addMotor(root, m, s, px, py, pz) {
  const base = new THREE.Mesh(new THREE.CylinderGeometry(s * 0.055, s * 0.062, s * 0.028, 14), m.metal);
  base.position.set(px, py - s * 0.02, pz);
  const bell = new THREE.Mesh(new THREE.CylinderGeometry(s * 0.068, s * 0.074, s * 0.085, 24, 1, true), m.bell);
  bell.position.set(px, py + s * 0.028, pz);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(s * 0.062, s * 0.008, 6, 16), m.metal);
  ring.rotation.x = Math.PI / 2;
  ring.position.set(px, py + s * 0.07, pz);
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(s * 0.01, s * 0.01, s * 0.05, 8), m.metal);
  shaft.position.set(px, py + s * 0.072, pz);
  root.add(base, bell, ring, shaft);
  // Open bell top exposes the stator instead of hiding it behind a solid cap.
  for (let i = 0; i < 6; i++) {
    const a = i * Math.PI / 3;
    const spoke = new THREE.Mesh(new THREE.BoxGeometry(s*.013,s*.008,s*.051),m.bell);
    spoke.position.set(px+Math.sin(a)*s*.036,py+s*.07,pz+Math.cos(a)*s*.036);
    spoke.rotation.y=a;root.add(spoke);
  }
}

export const CAM_POD = "camera-gun-pod";
// 30 degrees up, the middle option in the hangar; main.js hands in whatever
// the pilot picked, this is only for models built outside the flight screen.
export const DEFAULT_CAM_TILT = (30 * Math.PI) / 180;

// Visual dimensions in metres. Physics size is a conservative collision
// envelope, not the motor-to-motor wheelbase or the propeller diameter.
export const AIRFRAME_DIMENSIONS = {
  micro: { wheelbase:.075, propDiameter:.031 },
  whoop: { wheelbase:.065, propDiameter:.031 },
  cinewhoop: { wheelbase:.155, propDiameter:.0762 },
  toothpick: { wheelbase:.125, propDiameter:.0762 },
  freestyle: { wheelbase:.225, propDiameter:.127 },
  racer: { wheelbase:.21, propDiameter:.127 },
  cine5: { wheelbase:.235, propDiameter:.127 },
  seven: { wheelbase:.3, propDiameter:.1778 },
  camera: { wheelbase:.35, propDiameter:.2286 },
  heavy: { wheelbase:.45, propDiameter:.3048 },
};

// Re-aim an already built craft's pod (the hangar tilt can change mid-session).
export function setCamPodTilt(root, tilt) {
  const pod = root?.getObjectByName(CAM_POD);
  if (pod) pod.rotation.x = tilt;
  return pod;
}

export function makeDrone(spec, camTilt = DEFAULT_CAM_TILT) {
  const m = mats(spec);
  const root = new THREE.Group();
  const s = spec.size;
  const ducts = !!spec.ducts;
  const racer = spec.id === "racer";
  const stretch = racer || spec.id === "freestyle" || spec.id === "toothpick";
  const dimensions = AIRFRAME_DIMENSIONS[spec.id];
  const spread = dimensions ? dimensions.wheelbase / Math.sqrt(8) : s * (ducts ? 0.5 : stretch ? 0.64 : 0.58);
  const propR = dimensions ? dimensions.propDiameter / 2 : s * (ducts ? .25 : .4);
  const blades = ducts || ['freestyle','racer','cine5','seven'].includes(spec.id) ? 3 : 2;
  const plateW = s * (racer ? 0.28 : spec.gimbal ? 0.52 : ducts ? 0.38 : 0.4);
  const plateL = s * (racer ? 0.78 : spec.gimbal ? 0.52 : ducts ? 0.42 : 0.48);

  const bot = new THREE.Mesh(new RoundedBoxGeometry(plateW, s * 0.028, plateL, 2, s*.01), m.frame);
  bot.position.y = -s * 0.012;
  bot.castShadow = true;
  const top = new THREE.Mesh(new RoundedBoxGeometry(plateW * 0.92, s * 0.026, plateL * 0.72, 2, s*.009), m.frame);
  top.position.y = s * 0.038;
  top.castShadow = true;
  root.add(bot, top);

  for (const [sx, sz] of [
    [1, 1],
    [1, -1],
    [-1, 1],
    [-1, -1],
  ]) {
    const st = new THREE.Mesh(new THREE.CylinderGeometry(s * 0.012, s * 0.012, s * 0.07, 8), m.metal);
    st.position.set(sx * plateW * 0.32, s * 0.014, sz * plateL * 0.28);
    root.add(st);
  }

  const pcb = new THREE.Mesh(new THREE.BoxGeometry(plateW * 0.55, s * 0.012, plateL * 0.38), m.pcb);
  pcb.position.y = s * 0.018;
  root.add(pcb);

  const battW = plateW * (spec.gimbal ? 0.62 : 0.72);
  const battL = plateL * (racer ? 0.88 : spec.fpv ? 0.7 : 0.5);
  const batt = new THREE.Mesh(new RoundedBoxGeometry(battW, s * 0.09, battL, 2, s*.012), m.batt);
  batt.position.y = -s * 0.068;
  root.add(batt);
  const strap = new THREE.Mesh(new THREE.BoxGeometry(battW * 1.08, s * 0.018, s * 0.06), m.tape);
  strap.position.y = -s * 0.028;
  root.add(strap);
  const xt = new THREE.Mesh(new THREE.BoxGeometry(s * 0.055, s * 0.04, s * 0.07), m.gold);
  xt.position.set(0, -s * 0.06, -battL * 0.52);
  root.add(xt);

  // The camera/gun pod is one rigid group hinged at its mount, so the whole
  // thing can be re-aimed as a unit (setCamPodTilt) instead of every part
  // carrying its own baked angle. Rounds leave along that same angle
  // (combat.aimDir with the pilot's camTiltRad), which is what keeps the
  // barrel, the reticle and the shot pointing at one place.
  const camY = spec.gimbal ? -s * 0.04 : s * 0.03;
  const pod = new THREE.Group();
  pod.name = CAM_POD;
  pod.position.set(0, camY, -plateL * 0.52);
  pod.rotation.x = camTilt;
  root.add(pod);
  const tpu = new THREE.Mesh(new RoundedBoxGeometry(s * 0.16, s * 0.13, s * 0.12, 2, s*.012), m.tpu);
  pod.add(tpu);
  const bodyCam = new THREE.Mesh(new THREE.BoxGeometry(s * 0.11, s * 0.09, s * 0.1), m.metal);
  bodyCam.position.set(0, 0, -s * 0.02);
  pod.add(bodyCam);
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(s * 0.038, s * 0.042, s * 0.055, 16), m.metal);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0, -s * 0.09);
  pod.add(barrel);
  const lens = new THREE.Mesh(new THREE.SphereGeometry(s * 0.032, 14, 10), m.lens);
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
  } else {
    const flightPack = new THREE.Mesh(new RoundedBoxGeometry(plateW*.76,s*.14,plateL*.68,3,s*.019),m.batt);
    flightPack.position.set(0,s*.12,s*.015);
    flightPack.name = "top-mounted-flight-pack";
    root.add(flightPack);
    // The main pack sits above an open FPV frame; the underside remains clear.
    batt.visible = strap.visible = xt.visible = false;
    for (const z of [-1,1]) {
      const band=new THREE.Mesh(new RoundedBoxGeometry(plateW*.8,s*.147,s*.045,2,s*.006),m.tape);
      band.position.set(0,s*.12,z*plateL*.19+s*.015);root.add(band);
    }
  }

  const vtx = new THREE.Mesh(new THREE.BoxGeometry(s * 0.08, s * 0.04, s * 0.1), m.pcb);
  vtx.position.set(s * 0.08, s * 0.055, plateL * 0.22);
  root.add(vtx);
  const ant = new THREE.Mesh(new THREE.CylinderGeometry(s * 0.007, s * 0.009, s * 0.32, 6), m.accent);
  ant.position.set(s * 0.07, s * 0.16, plateL * 0.38);
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

    addMotor(root, m, s, px, s * 0.02, pz);

    if (ducts) {
      const ductRadius = propR + s*.025;
      const duct = new THREE.Mesh(new THREE.CylinderGeometry(ductRadius, ductRadius, s * 0.12, 40, 1, true), m.tpu);
      duct.material.side = THREE.DoubleSide;
      duct.position.set(px, s * 0.04, pz);
      const rim = new THREE.Mesh(new THREE.TorusGeometry(ductRadius, s * 0.008, 8, 40), m.tpu);
      rim.rotation.x = Math.PI / 2;
      rim.position.set(px, s * 0.1, pz);
      root.add(duct, rim);
      const lowerRim = rim.clone(); lowerRim.position.y = -s*.02; root.add(lowerRim);
      for (let spoke=0;spoke<3;spoke++) {
        const angle=spoke*Math.PI*2/3;
        const brace=new THREE.Mesh(new THREE.BoxGeometry(s*.018,s*.018,ductRadius*.78),m.tpu);
        brace.position.set(px+Math.sin(angle)*ductRadius*.55,-s*.012,pz+Math.cos(angle)*ductRadius*.55);
        brace.rotation.y=angle;root.add(brace);
      }
    }

    const prop = makeProp(propR, blades, m.prop);
    prop.scale.x = sx * sz;
    prop.position.set(px, s * 0.085, pz);
    prop.userData.spin = sx * sz;
    root.add(prop);
    props.push(prop);

    const disc = new THREE.Mesh(new THREE.CircleGeometry(propR * 0.95, 24), m.disc);
    disc.visible = false;
    disc.rotation.x = -Math.PI / 2;
    disc.position.set(px, s * 0.088, pz);
    root.add(disc);
    discs.push(disc);
  });

  addAirframeDetails(root, spec, {size:s,plateW,plateL,spread,battW,battL});
  root.userData.props = props;
  root.userData.discs = discs;
  root.userData.spec = spec;
  return root;
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

export function spinProps(root, throttle, dt) {
  const props = root.userData.props || [];
  const w = (10 + throttle * 62) * dt;
  for (const p of props) p.rotation.y += w * (p.userData.spin || 1);
  const discs = root.userData.discs || [];
  // A spinning prop remains mostly transparent; opaque white discs made
  // every airframe look like it had four solid plastic saucers attached.
  const op = Math.min(0.12, throttle * 0.17);
  for (const d of discs) {
    if (d.material) d.material.opacity = op;
    d.visible = op > 0.04;
  }
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
  sprite.scale.set(1.6, 0.4, 1);
  sprite.position.y = 0.55;
  return sprite;
}
