import * as THREE from "three";

let seed = 713;
function random() { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; }
export function surfaceTexture(kind, repeat = 12) {
  seed = 713 + kind.length;
  const size = 512, canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");
  const base = { sand: [174,160,128], asphalt: [57,59,58], concrete: [135,132,122], earth: [83,89,64], forest: [65,69,47], metal: [164,162,154] }[kind] || [120,120,115];
  const pixels = ctx.createImageData(size, size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const i = (y * size + x) * 4;
    // Fine grain plus broad, low-frequency mottling prevents the repeating
    // texture from reading as uniformly coloured plastic from the air.
    const coarse = Math.sin(x * .029 + Math.sin(y * .013) * 1.8) * 4.2
      + Math.cos(y * .021 - Math.sin(x * .017)) * 3.4;
    const grain = (random() - .5) * (kind === "metal" ? 12 : 22);
    for (let c = 0; c < 3; c++) pixels.data[i+c] = base[c] + coarse + grain;
    pixels.data[i+3] = 255;
  }
  ctx.putImageData(pixels, 0, 0);
  // Mineral specks and pores remain visible at low altitude without becoming
  // a noisy pattern at normal flight height.
  const specks = kind === "metal" ? 260 : 760;
  for (let i = 0; i < specks; i++) {
    const light = random() > .58;
    ctx.fillStyle = light ? "rgba(235,232,218,.055)" : "rgba(20,22,19,.075)";
    const r = .25 + random() * (kind === "sand" || kind === "earth" ? 2.2 : 1.25);
    ctx.beginPath(); ctx.arc(random()*size, random()*size, r, 0, Math.PI*2); ctx.fill();
  }
  // Large translucent stains break the computer-clean, evenly aged surface.
  for (let i = 0; i < (kind === "metal" ? 7 : 15); i++) {
    const r=18+random()*58,x=r+random()*(size-r*2),y=r+random()*(size-r*2);
    const gradient=ctx.createRadialGradient(x,y,0,x,y,r);
    gradient.addColorStop(0, kind === "forest" ? "rgba(20,34,14,.09)" : "rgba(36,31,24,.07)");
    gradient.addColorStop(1,"rgba(30,28,22,0)");
    ctx.fillStyle=gradient;ctx.fillRect(x-r,y-r,r*2,r*2);
  }
  if (kind === "concrete") {
    ctx.strokeStyle = "rgba(35,34,30,.28)"; ctx.lineWidth = 3;
    ctx.strokeRect(1,1,size-2,size-2);
    ctx.strokeStyle = "rgba(224,219,201,.10)"; ctx.lineWidth = 1;
    ctx.strokeRect(5,5,size-10,size-10);
  }
  if (kind === "asphalt" || kind === "concrete") {
    ctx.strokeStyle = "rgba(24,25,23,.23)"; ctx.lineWidth = 1;
    for (let n=0;n<9;n++) {
      let x=40+random()*380,y=40+random()*380; ctx.beginPath();ctx.moveTo(x,y);
      for(let j=0;j<7;j++){x+=(random()-.5)*24;y+=(random()-.35)*18;ctx.lineTo(x,y);}ctx.stroke();
    }
  }
  if (kind === "metal") {
    ctx.strokeStyle="rgba(235,225,204,.10)";ctx.lineWidth=2;
    for(let x=0;x<size;x+=64){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,size);ctx.stroke();}
    ctx.strokeStyle="rgba(65,50,37,.12)";
    for(let i=0;i<24;i++){const x=random()*size,y=random()*size;ctx.fillStyle="rgba(98,55,31,.12)";ctx.fillRect(x,y,2+random()*7,.5+random()*2);}
  }
  const map = new THREE.CanvasTexture(canvas);
  map.wrapS = map.wrapT = THREE.RepeatWrapping; map.repeat.set(repeat,repeat);
  map.colorSpace = THREE.SRGBColorSpace; map.anisotropy = 4;
  map.userData.surface = kind;
  return map;
}
export function finishSurfaces(scene) {
  const seen = new Set();
  scene.traverse(object => {
    if (!object.isMesh) return;
    for (const mat of (Array.isArray(object.material) ? object.material : [object.material])) {
      if (!mat?.isMeshStandardMaterial || seen.has(mat)) continue;
      seen.add(mat);
      if (mat.map?.userData.surface) {
        const canvas = document.createElement("canvas");
        canvas.width = canvas.height = 256;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(mat.map.image, 0, 0, 256, 256);
        const pixels = ctx.getImageData(0, 0, 256, 256);
        const surface = mat.map.userData.surface;
        for (let i=0;i<pixels.data.length;i+=4) {
          const lum=pixels.data[i]*.28+pixels.data[i+1]*.58+pixels.data[i+2]*.14;
          const value=128+(lum-128)*1.35;
          pixels.data[i]=pixels.data[i+1]=pixels.data[i+2]=value;
        }
        ctx.putImageData(pixels,0,0);
        const relief = new THREE.CanvasTexture(canvas);
        relief.wrapS = relief.wrapT = THREE.RepeatWrapping;
        relief.repeat.copy(mat.map.repeat);
        relief.colorSpace = THREE.NoColorSpace;
        relief.anisotropy = mat.map.anisotropy;
        mat.bumpMap = relief;
        mat.bumpScale = { metal:.012, concrete:.026, asphalt:.021, sand:.032, earth:.035, forest:.04 }[surface] || .02;

        const roughCanvas = document.createElement("canvas");
        roughCanvas.width = roughCanvas.height = 256;
        const roughCtx = roughCanvas.getContext("2d");
        roughCtx.drawImage(mat.map.image,0,0,256,256);
        const roughPixels=roughCtx.getImageData(0,0,256,256);
        const baseline = surface === "metal" ? 164 : surface === "asphalt" ? 218 : 230;
        for (let i=0;i<roughPixels.data.length;i+=4) {
          const lum=roughPixels.data[i]*.28+roughPixels.data[i+1]*.58+roughPixels.data[i+2]*.14;
          const value=baseline+(lum-128)*.22;
          roughPixels.data[i]=roughPixels.data[i+1]=roughPixels.data[i+2]=value;
        }
        roughCtx.putImageData(roughPixels,0,0);
        const roughness = new THREE.CanvasTexture(roughCanvas);
        roughness.wrapS = roughness.wrapT = THREE.RepeatWrapping;
        roughness.repeat.copy(mat.map.repeat);
        roughness.colorSpace = THREE.NoColorSpace;
        roughness.anisotropy = mat.map.anisotropy;
        mat.roughnessMap = roughness; mat.roughness = 1;
      }
    }
  });
}
