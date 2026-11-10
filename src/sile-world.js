import {addCompletedLighthouse} from './sile-lighthouse.js';
import {completedSileData,finishCompletionTerrain,alignCompletedEntries} from './sile-completion-world.js';
import {addSupplementalBuildings} from './sile-building-supplement.js';
import {sileSeaCaves,carveCaveCliffs,addSeaCaveInteriors} from './sile-sea-caves.js';
import {prepareFoamMotion} from './sile-water.js';
import {prepareTerrainWallIndex} from './terrain-wall-index.js';
import {buildBeachApproach} from './sile-beach.js';
import {beachSandMaterial} from './sile-sand.js';
import {addShoreArmour} from './sile-shore-armour.js';
import {addMooringLinks} from './sile-mooring.js';
import {finishSileFoliage} from './sile-foliage.js';
import {addFacadeDepth} from './sile-architectural.js';
import {applyBuildingPads} from './sile-pads.js';
import * as THREE from 'three';
import {mappedParkingSurfaces,addMappedParking} from './sile-parking.js';
import {mappedSportsSurfaces,addSportsGrounds} from './sile-sports.js';
import {mappedHarbourYard,addHarbourYard} from './sile-harbour-yard.js';
import {planSileContext} from './sile-context.js';
import {addSileContext} from './sile-context-view.js';
import {mergeGeometries,mergeVertices} from 'three/addons/utils/BufferGeometryUtils.js';
import {buildingMaterials,facadeUvs,rockMaterial,waterMaterial,foamMaterial,launchMaterial} from './sile-materials.js';
import {buildCoast,sourceCoastPatches,coastGround} from './sile-coast.js';
import {buildingRoof} from './sile-roofs.js';
import {islandSurface} from './sile-island.js';
import {coastalRockMaterials,prepareCliffWeathering,rockGeometry,coastCliffContacts}from './sile-rock-view.js';
import {castleSite,castleModel} from './sile-landmarks.js';
import {surfaceTexture} from './surfaces.js';
import {terrainHeight,surfaceAt,insidePolygon,drapeTerrainTriangles} from './geo-terrain.js';
import {harbourSurfaces,harbourLayout,addSileHarbour,harbourMaterial} from './sile-harbour.js';
import {coastalBuildings,buildingAprons} from './sile-buildings.js';
import {addCoastalBuildings} from './sile-building-view.js';
import {refineNeighbourhoodGround} from './sile-neighbourhood.js';
import {addBuildingFoundations} from './sile-grounding.js';
import {addNeighbourhood} from './sile-neighbourhood-view.js';
import {streetLayout,streetSurfaces,streetRemainder} from './sile-streets.js';
import {pavingGeometry,streetPavingMaterial} from './sile-street-view.js';

function geometry(positions,uv=false){
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.computeVertexNormals();
 if(uv){const values=[];for(let i=0;i<positions.length;i+=3)values.push(positions[i]/4,positions[i+2]/4);g.setAttribute('uv',new THREE.Float32BufferAttribute(values,2));}
 return g;
}
function shapeFor(rings){
 const points=rings[0].map(([x,z])=>new THREE.Vector2(x,-z));
 const shape=new THREE.Shape(points);
 for(const ring of rings.slice(1))shape.holes.push(new THREE.Path(ring.map(([x,z])=>new THREE.Vector2(x,-z))));
 return shape;
}
function prismRecord(item){
 const xs=item.rings[0].map(p=>p[0]),zs=item.rings[0].map(p=>p[1]);
 return {rings:item.rings,miny:item.base,maxy:item.base+item.height,bounds:[Math.min(...xs),Math.max(...xs),Math.min(...zs),Math.max(...zs)]};
}
export function buildSile(scene,data){
 if(!data)throw new Error('Şile verisi önce yüklenmeli.');
 const timings=[];let stamp=performance.now();const mark=name=>{const now=performance.now();timings.push({name,ms:now-stamp});stamp=now;};
 data=completedSileData(data);
 const coastal=coastalBuildings(data),district=data.completionLayer===1?coastalBuildings(data,{maxDistance:350}):coastal,streets=streetLayout(data,coastal);
 const site=castleSite(data),sourceTerrain=site?.terrain||data.terrain,patches=sourceCoastPatches(data,sourceTerrain,{exactSand:true}),sand=streetRemainder(patches.sand,streets),beach=buildBeachApproach(data,sourceTerrain,sand),terrain=beach?{...sourceTerrain,beachSurface:beach.surface}:sourceTerrain,sourceItems=[...data.buildings,...data.structures].map(item=>site&&item===site.source?site.castle:item),play={bounds:{minx:terrain.bounds[0],maxx:terrain.bounds[1],minz:terrain.bounds[2],maxz:terrain.bounds[3]},ceil:Math.max(...terrain.heights)-terrain.datum+160,terrain,prisms:sourceItems.map(prismRecord),boxes:[],spawn:{x:0,z:0},trainingOnly:true};
 if(beach){patches.sand=beach.surface.positions;scene.userData.sileBeachStats=beach.stats;}
 mark('source-partitions');
 const rockFinish=coastalRockMaterials({shoreline:true});
 if(data.completionLayer===1){for(const m of [rockFinish.dry,rockFinish.wet])m.userData.scannedSurface='coastalRock';rockFinish.wet.userData.keepCoastalRoughness=true;}
 play.groundCorridors=streets.groundCorridors;
 const contextPlan=planSileContext(data,play);
 const soil=[];
 for(let i=0;i<data.positions.length;i+=9){const t=data.positions.slice(i,i+9),x=(t[0]+t[3]+t[6])/3,z=(t[2]+t[5]+t[8])/3;if(!site||!insidePolygon(x,z,site.platform.rings))soil.push(...t);}
 const groundMat=new THREE.MeshStandardMaterial({map:surfaceTexture('grass',1),roughness:1});
 const street=streetSurfaces(data,soil,streets);
 const harbour=harbourSurfaces(data,coastGround(data,street.ground,{exactSand:true,terrain:sourceTerrain}));
 const aprons=buildingAprons(data,harbour.ground,coastal);
 const sports=mappedSportsSurfaces(data,aprons.ground);addSportsGrounds(scene,sports.sports);
 const parking=mappedParkingSurfaces(data,sports.ground);addMappedParking(scene,parking.paved);
 const yard=mappedHarbourYard(data,parking.ground);addHarbourYard(scene,yard.yard,yard);
 const rawGround=geometry(refineNeighbourhoodGround(yard.ground,coastal),true);rawGround.deleteAttribute('normal');
 const smoothGround=mergeVertices(rawGround,.001);smoothGround.computeVertexNormals();rawGround.dispose();
 const ground=new THREE.Mesh(smoothGround,groundMat);ground.name='sile-terrain';ground.userData.groundSurface=true;ground.receiveShadow=true;scene.add(ground);
 if(harbour.paved.length){const paved=new THREE.Mesh(geometry(harbour.paved,true),harbourMaterial());paved.name='sile-harbour-paved';paved.userData.groundSurface=true;paved.receiveShadow=true;scene.add(paved);}
 const pavingMat=streets.valid&&(aprons.paved.length||street.paving.length)?streetPavingMaterial():null;
 if(aprons.paved.length){const paved=new THREE.Mesh(pavingMat?pavingGeometry(aprons.paved):geometry(aprons.paved,true),pavingMat||harbourMaterial());paved.name='sile-building-aprons';paved.userData.groundSurface=!pavingMat;paved.receiveShadow=true;scene.add(paved);}
 if(street.paving.length){const paved=new THREE.Mesh(pavingGeometry(street.paving),pavingMat);paved.name='sile-street-paving';paved.receiveShadow=true;scene.add(paved);}
 if(site){
  const surface=islandSurface(site.platform.surface,site.platform.rings),raw=geometry(surface.positions);raw.deleteAttribute('normal');raw.setAttribute('uv',new THREE.Float32BufferAttribute(surface.uv,2));raw.setAttribute('color',new THREE.Float32BufferAttribute(surface.colors,3));
  const g=mergeVertices(raw,.00001);g.computeVertexNormals();raw.dispose();const material=rockFinish.dry;
  const top=new THREE.Mesh(g,material);top.name='sile-castle-island';top.receiveShadow=true;top.userData.authoredFoundationM=site.reliefM;scene.add(top);scene.add(castleModel(site.castle));
 }
 const sea=new THREE.Mesh(new THREE.PlaneGeometry(10000,10000),waterMaterial(terrain));
 sea.rotation.x=-Math.PI/2;sea.position.y=-terrain.datum-.01;sea.name='sile-sea';sea.receiveShadow=true;scene.add(sea);
 mark('terrain-mesh');
 const coast=buildCoast(terrain,{sheltered:harbourLayout(data)?.waterRings});
 const offshoreVertexCount=coast.foam.positions.length/3;
 if(beach)for(const k of ['positions','uv','colors'])coast.foam[k].push(...beach.swash[k]);
 const caves=sileSeaCaves(terrain,data);coast.dryCliffs=carveCaveCliffs(coast.dryCliffs,caves);coast.wetCliffs=carveCaveCliffs(coast.wetCliffs,caves);
 const cliffGeometry=prepareCliffWeathering(rockGeometry(coast.dryCliffs,coast.wetCliffs),terrain.datum);
 const cliff=new THREE.Mesh(cliffGeometry,[rockFinish.wet,rockFinish.wet]);cliff.name='sile-coast-cliffs';cliff.receiveShadow=true;scene.add(cliff);
 const foamGeometry=geometry(coast.foam.positions);foamGeometry.setAttribute('uv',new THREE.Float32BufferAttribute(coast.foam.uv,2));foamGeometry.setAttribute('color',new THREE.Float32BufferAttribute(coast.foam.colors,4));const shore=new THREE.Mesh(foamGeometry,foamMaterial());shore.name='sile-shore-foam';shore.userData.offshoreVertexCount=offshoreVertexCount;scene.add(shore);
 scene.userData.sileWater={normalMap:sea.material.normalMap,roughnessMap:sea.material.roughnessMap,foamMaterial:shore.material,foamMotion:prepareFoamMotion(foamGeometry,offshoreVertexCount,shore.material.alphaMap)};
 for(const kind of ['sand','rock']){if(kind!=='sand'||!beach)patches[kind]=streetRemainder(patches[kind],streets);if(!patches[kind].length)continue;const material=kind==='sand'?beachSandMaterial():rockMaterial();material.polygonOffset=true;material.polygonOffsetFactor=-1;material.polygonOffsetUnits=-2;
 const g=geometry(patches[kind],true);if(kind==='sand'&&beach){g.setAttribute('color',new THREE.Float32BufferAttribute(beach.colors,3));material.vertexColors=true;}const mesh=new THREE.Mesh(g,material);mesh.name='sile-source-'+kind;if(kind==='sand')mesh.userData.groundSurface=true;mesh.receiveShadow=true;scene.add(mesh);}
 // Roads are visual strips over the same sampled surface, not flattened terrain.
 const roadPositions=[];
 if(!streets.valid)for(const road of data.roads)for(let i=1;i<road.points.length;i++){
  const a=road.points[i-1],b=road.points[i],dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz);if(!len)continue;
  if(surfaceAt(play,(a[0]+b[0])/2,(a[1]+b[1])/2).water)continue;
  const nx=-dz/len*road.width/2,nz=dx/len*road.width/2;
  const points=[[a[0]+nx,a[1]+nz],[a[0]-nx,a[1]-nz],[b[0]+nx,b[1]+nz],[b[0]-nx,b[1]-nz]];
  for(const n of [0,2,1,1,2,3]){const p=points[n];roadPositions.push(p[0],terrainHeight(terrain,...p)+.06,p[1]);}
 }
 const roads=new THREE.Mesh(geometry(streets.valid?street.asphalt:drapeTerrainTriangles(terrain,roadPositions),true),new THREE.MeshStandardMaterial({map:surfaceTexture('asphalt',1),roughness:.95,side:THREE.DoubleSide,polygonOffset:!streets.valid,polygonOffsetFactor:-1,polygonOffsetUnits:-2}));roads.name='sile-roads';roads.userData.groundSurface=true;roads.receiveShadow=true;scene.add(roads);
 if(streets.valid)scene.userData.sileStreetStats=streets.stats;
 mark('shore-road-meshes');
 const batches=Array.from({length:8},()=>[]),materials=buildingMaterials();
 let gabled=0;
 for(const [itemIndex,item]of sourceItems.entries()){
  if(site&&item===site.castle||data.completionLayer===1&&item.landmark==='lighthouse')continue;
  const roof=buildingRoof(item),wallHeight=roof?roof.eaves-item.base:item.height;
  const g=new THREE.ExtrudeGeometry(shapeFor(item.rings),{depth:wallHeight,bevelEnabled:false,steps:1});g.rotateX(-Math.PI/2);g.translate(0,item.base,0);
  const wallIndex=item.kind||item.landmark==='castle'?6:item.landmark==='lighthouse'?7:1+(item.id%5);
  const source=g.attributes.position;
  const contacts=(part,role,mesh)=>{play.terrainWalls??=[];for(const c of coastCliffContacts(part))play.terrainWalls.push({...c,mesh,authored:'building-shell',sourceId:item.id,role,landing:role==='roof',reason:'binaya çarptı'});};
  if(roof){
   // Keep the full source envelope for layout/broadphase consumers; the body
   // ends at the uploaded eave and the drawn shell owns the sloped top.
   play.prisms[itemIndex].roofEaves=Math.fround(roof.eaves);
   for(const group of g.groups)if(group.materialIndex===1){const p=[];for(let i=group.start;i<group.start+group.count;i++)p.push(source.getX(i),source.getY(i),source.getZ(i));const wall=geometry(p);contacts(wall,'wall',district.has(item.id)?'sile-coastal-facades':'sile-buildings-'+wallIndex);wall.dispose();}
  }
  for(const group of g.groups){
   if(district.has(item.id)&&group.materialIndex===1)continue;
   if(contextPlan.valid&&item.kind==='pier'&&group.materialIndex===0)continue;
   if(roof&&group.materialIndex===0)continue;
   const p=[];for(let i=group.start;i<group.start+group.count;i++)p.push(source.getX(i),source.getY(i),source.getZ(i));
   const index=group.materialIndex===0?(item.kind||item.landmark==='castle'?6:item.landmark==='lighthouse'?7:0):wallIndex;
   const part=geometry(p),uv=group.materialIndex===1?facadeUvs(p,item.base,wallHeight):p.flatMap((v,i)=>i%3===0?[v/1.8,p[i+2]/1.8]:[]);
   part.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
   if(index===0){const tint=new THREE.Color([0x9e6a50,0xa77c61,0x986c53,0xb18b70,0x8f7060][Math.abs(item.id)%5]);const colors=[];for(let i=0;i<p.length;i+=3)colors.push(tint.r,tint.g,tint.b);part.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));}
   batches[index].push(part);
  }
  if(roof){
   const part=geometry(roof.positions),tint=new THREE.Color([0x9e6a50,0xa77c61,0x986c53,0xb18b70,0x8f7060][Math.abs(item.id)%5]),colors=[];
   part.setAttribute('uv',new THREE.Float32BufferAttribute(roof.uv,2));for(let i=0;i<roof.positions.length;i+=3)colors.push(tint.r,tint.g,tint.b);
   part.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));contacts(part,'roof','sile-buildings-0');batches[0].push(part);
   const end=geometry(roof.gables);contacts(end,'gable',district.has(item.id)?'sile-coastal-facades':'sile-buildings-'+wallIndex);if(!district.has(item.id)){end.setAttribute('uv',new THREE.Float32BufferAttribute(Array(roof.gables.length/3).fill([.03,.03]).flat(),2));batches[wallIndex].push(end);}else end.dispose();gabled++;
  }
  g.dispose();
 }
 for(let i=0;i<batches.length;i++){
  if(!batches[i].length){for(const value of new Set(Object.values(materials[i])))if(value?.isTexture)value.dispose();materials[i].dispose();continue;}
  const merged=mergeGeometries(batches[i],false);batches[i].forEach(g=>g.dispose());
  const mesh=new THREE.Mesh(merged,materials[i]);mesh.name='sile-buildings-'+i;mesh.castShadow=true;mesh.receiveShadow=true;scene.add(mesh);
 }
 // Authored launch marking follows the heightfield; no surveyed pad is implied.
 const pad=[];
 for(let i=0;i<64;i++){
  const a=i/64*Math.PI*2,b=(i+1)/64*Math.PI*2;
  for(const p of [[0,0],[Math.cos(b)*3,Math.sin(b)*3],[Math.cos(a)*3,Math.sin(a)*3]])pad.push(p[0],terrainHeight(terrain,...p)+.09,p[1]);
 }
 const painted=drapeTerrainTriangles(terrain,pad);const padGeometry=geometry(painted);const padUv=[];for(let i=0;i<painted.length;i+=3)padUv.push(painted[i]/6+.5,painted[i+2]/6+.5);padGeometry.setAttribute('uv',new THREE.Float32BufferAttribute(padUv,2));
 const marker=new THREE.Mesh(padGeometry,launchMaterial());marker.name='sile-launch-pad';marker.receiveShadow=true;scene.add(marker);
 // Landmark bands are decorative overlays on the same source footprint.
 const lighthouse=data.buildings.find(b=>b.landmark==='lighthouse');
 if(lighthouse&&data.completionLayer!==1){
  const g=new THREE.ExtrudeGeometry(shapeFor(lighthouse.rings),{depth:1.2,bevelEnabled:false});g.rotateX(-Math.PI/2);g.translate(0,lighthouse.base+7,0);
  const m=new THREE.Mesh(g,new THREE.MeshStandardMaterial({color:0x272c2c,roughness:.9,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2}));m.name='sile-lighthouse-band';scene.add(m);
 }
 mark('building-meshes');
 scene.userData.sileStats=data.stats;
 scene.userData.sileRoofStats={gabled,flat:data.buildings.length+data.structures.length-gabled,authored:true};
 addSileContext(scene,data,play,contextPlan);
 addSileHarbour(scene,data,play);
 mark('context-harbour');
 addCoastalBuildings(scene,data,play,district,{balconyProfiles:coastal});
 addNeighbourhood(scene,data,play,coastal);
 addBuildingFoundations(scene,play,coastal);
 mark('coastal-facades-neighbourhood');
 applyBuildingPads(scene,data,play,coastal,streets);
 alignCompletedEntries(scene,play,coastal,data,district);
 mark('building-pads');
 addMooringLinks(scene,data,play);
 addShoreArmour(scene,data,play,rockFinish.dry);
 play.terrainWalls??=[];for(const contact of coastCliffContacts(cliffGeometry))play.terrainWalls.push(contact);
 mark('moorings-armour');
 addSeaCaveInteriors(scene,data,play,caves,rockFinish.wet);
 mark('cave-geometry');
 addFacadeDepth(scene,data,play,coastal);
 addSupplementalBuildings(scene,play,data);
 addCompletedLighthouse(scene,play,data);
 mark('architectural-supplement-lighthouse');
 finishCompletionTerrain(scene,play,data,rockFinish.dry);
 prepareTerrainWallIndex(play.terrainWalls);
 mark('exposure-contact-index');
 finishSileFoliage(scene);
 mark('foliage');scene.userData.sileBuildTimings=timings;
 return play;
}
