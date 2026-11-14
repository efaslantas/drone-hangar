import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from 'three';
import * as api from '../src/sile-navigation.js';
import {assembleBoundary,prepareNavigation} from '../tools/prepare-sile-navigation.mjs';
import {projectCoordinate} from '../src/geo-terrain.js';
const read=name=>JSON.parse(fs.readFileSync(new URL('../public/maps/sile/'+name,import.meta.url)));
const projection={lat:0,lon:0,metresLat:1,metresLon:1,offsetX:0,offsetZ:0};
const ring=[[0,0],[100,0],[100,100],[0,100]],data={projection,terrain:{bounds:[0,100,0,100],land:[[ring]]},roads:[{id:1,name:'Kıyı Sokağı',width:4,points:[[0,10],[100,10]]},{id:2,width:4,points:[[0,30],[100,30]]},{id:3,name:'Tepe Caddesi',width:6,points:[[0,80],[100,80]]}]},places={projection,neighbourhoods:[{id:1,name:'Batı Mahallesi',polygons:[[[[0,0],[50,0],[50,100],[0,100]]]]},{id:2,name:'Doğu Mahallesi',polygons:[[[[50,0],[100,0],[100,100],[50,100]]]]}],landmarks:[{id:'test',name:'Fener',point:[90,90]}]};
test('boundary stitching reverses source fragments, preserves holes and rejects an incomplete ring',()=>{
 const line=(a,b,role='outer')=>({type:'way',role,geometry:[a,b].map(([lon,lat])=>({lon,lat}))});
 const source={members:[line([0,0],[10,0]),line([10,10],[10,0]),line([0,10],[10,10]),line([0,0],[0,10]),{type:'way',role:'inner',geometry:[[2,2],[4,2],[4,4],[2,4],[2,2]].map(([lon,lat])=>({lon,lat}))}]};
 const before=JSON.stringify(source),polygons=assembleBoundary(source,projection);assert.equal(polygons.length,1);assert.equal(polygons[0].length,2);assert.equal(JSON.stringify(source),before);assert.throws(()=>assembleBoundary({members:source.members.slice(1)},projection),/closed|ring|incomplete/i);
});
test('actual four named neighbourhoods contain their OSM place centres with the identical world projection',()=>{
 const map=read('map.json'),boundaries=read('source-neighbourhoods.json'),points=read('source-places.json'),source=read('source-osm.json'),before=JSON.stringify(map),n=prepareNavigation(map,boundaries,points,source);assert.equal(n.neighbourhoods.length,4);assert.deepEqual(n.projection,map.projection);
 const query=api.createNavigationModel({...map,terrain:{...map.terrain,bounds:[-5000,5000,-5000,5000]}},n);
 for(const node of points.elements){const [x,z]=projectCoordinate(map.projection,node.lon,node.lat),name=query.locate({x,z}).neighbourhood;assert.ok(name, node.tags.name);assert.ok(name.replaceAll(' ','').toLocaleLowerCase('tr').includes(node.tags.name.replaceAll(' ','').toLocaleLowerCase('tr')),name);}
 assert.equal(JSON.stringify(map),before);assert.ok(n.landmarks.some(p=>p.name==='Şile Feneri'));assert.ok(n.landmarks.some(p=>p.name==='Ağlayan Kayalar Burnu'));
});
test('current street, nearby named street and an actually unnamed road remain distinct',()=>{
 const model=api.createNavigationModel(data,places),a=model.locate({x:20,z:10}),b=model.locate({x:20,z:54}),c=model.locate({x:20,z:30});assert.equal(a.road.name,'Kıyı Sokağı');assert.equal(a.road.kind,'on-road');assert.equal(a.road.distanceM,0);assert.equal(b.road.name,'Tepe Caddesi');assert.equal(b.road.kind,'nearby');assert.equal(b.road.distanceM,26);assert.equal(c.road.kind,'unnamed');assert.equal(c.road.name,null);assert.equal(c.neighbourhood,'Batı Mahallesi');assert.equal(model.locate({x:80,z:10}).neighbourhood,'Doğu Mahallesi');
});
test('polygon holes, absent coverage, outside map and invalid states never retain a false district or street',()=>{
 const p=structuredClone(places);p.neighbourhoods=p.neighbourhoods.slice(0,1);p.neighbourhoods[0].polygons[0].push([[10,10],[30,10],[30,25],[10,25]]);const model=api.createNavigationModel(data,p);
 assert.equal(model.locate({x:20,z:20}).neighbourhood,null);assert.equal(model.locate({x:80,z:20}).neighbourhood,null);
 for(const state of [{x:101,z:20},{x:-1,z:20},{x:NaN,z:20},null])assert.equal(model.locate(state).available,false);
 assert.equal(api.createNavigationModel(data,{...places,projection:{...projection,offsetX:1}}),null);
});
test('road search resolves the interior of long segments, finite distance limits and immutable source records',()=>{
 const map={...data,terrain:{...data.terrain,bounds:[-3000,3000,-3000,3000]},roads:[{id:5,name:'Uzun Cadde',width:4,points:[[-2000,-2000],[2000,2000]]}]},before=JSON.stringify(map),model=api.createNavigationModel(map,places);assert.ok(model.locate({x:1000,z:1000}).road.distanceM<1e-9);assert.equal(model.locate({x:2000,z:-2000}).road,null);assert.equal(JSON.stringify(map),before);
});
test('map heading follows the actual quaternion forward vector through yaw, pitch and roll',()=>{
 for(const [yaw,pitch,roll]of [[0,0,0],[Math.PI/2,0,0],[-Math.PI/2,.3,.4],[.7,-.6,.8]]){
  const q=new THREE.Quaternion().setFromEuler(new THREE.Euler(pitch,yaw,roll,'YXZ')),v=new THREE.Vector3(0,0,-1).applyQuaternion(q),expected=(Math.atan2(v.x,-v.z)*180/Math.PI+360)%360;
  assert.ok(Math.abs(api.headingDegrees({qw:q.w,qx:q.x,qy:q.y,qz:q.z})-expected)<1e-8);
 }
 assert.equal(api.headingDegrees({qw:0,qx:0,qy:0,qz:0}),null);assert.equal(api.headingDegrees({}),null);
});
test('label placement is deterministic, fits its viewport and avoids names covering each other',()=>{
 const candidates=Array.from({length:10},(_,i)=>({id:i,name:'Sokak '+i,x:50+i,y:50+i})),before=JSON.stringify(candidates),a=api.placeLabels(candidates,{width:300,height:180,max:6});assert.ok(a.length>0&&a.length<10);
 for(const p of a){assert.ok(p.box.x>=0&&p.box.y>=0&&p.box.x+p.box.width<=300&&p.box.y+p.box.height<=180);for(const q of a)if(p!==q)assert.ok(p.box.x+p.box.width<=q.box.x||q.box.x+q.box.width<=p.box.x||p.box.y+p.box.height<=q.box.y||q.box.y+q.box.height<=p.box.y);}
 assert.deepEqual(api.placeLabels(candidates,{width:300,height:180,max:6}),a);assert.equal(JSON.stringify(candidates),before);
});

test('long labels retain their full name but truncate the visible text to the measured map width',()=>{
 const name='Çok Uzun Bir Cadde Adı '.repeat(10),labels=api.placeLabels([{id:1,name,x:5,y:40}],{width:180,height:100,measureText:s=>s.length*8});assert.equal(labels.length,1);assert.equal(labels[0].name,name);assert.ok(labels[0].displayName.endsWith('…'));assert.ok(labels[0].displayName.length*8+10<=180-8);
});

test('navigation layout allocates separate space above desktop motor telemetry and below it in short landscape',()=>{
 for(const height of [800,1000]){const motor={top:height-260,bottom:height-92},layout=api.navigationPlacement({width:1440,height,motor,attributionBottom:126,statusBottom:190});for(const panelHeight of [72,Math.min(300,layout.maxHeight)]){const bottom=height-layout.bottom,top=bottom-panelHeight;assert.ok(bottom<=motor.top-8);assert.ok(top>=198);}}
 const landscape=api.navigationPlacement({width:844,height:390,motor:{top:68,bottom:238},attributionBottom:126});assert.ok(390-landscape.bottom-landscape.maxHeight>=246);
 const portrait=api.navigationPlacement({width:390,height:844,motor:{top:490,bottom:664},attributionBottom:198});assert.ok(portrait.top>=206);assert.ok(portrait.top+portrait.maxHeight<=482);
});
