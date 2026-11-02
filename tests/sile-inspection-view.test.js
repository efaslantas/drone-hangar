import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {inspectionVisibility, captureInspectionFrame} from '../src/sile-inspection-view.js';
import {createMapSelector} from '../src/map-selection.js';
import {briefingModel} from '../src/briefing.js';

test('inspection entry waits for a successful committed map and rejects cancellation/error',async()=>{
 let release;const select=createMapSelector({load:()=>new Promise(r=>release=r),commit(){},busy(){},error(){}});
 const pending=select('sile');select.cancel();release();assert.equal(await pending,false);
 assert.equal(await select('airfield'),true);
 const failed=createMapSelector({load:async()=>{throw Error('offline')},commit(){},busy(){},error(){}});
 assert.equal(await failed('sile'),false);
});
test('inspection briefing explains temporary camera and local simulation scope',()=>{
 const b=briefingModel({op:{kind:'free',inspection:true,name:'İLKE · Şile inceleme'},map:{id:'sile',name:'Şile'},drone:{name:'SOURCE ONE'},real:true});
 assert.match(JSON.stringify(b),/0°/);assert.match(JSON.stringify(b),/yerel/i);assert.match(b.kicker,/İLKE/);
});
test('visibility fails closed on missing geometry and detects actual occlusion',()=>{
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera();camera.position.set(0,0,0);const target={x:0,y:0,z:-10};
 assert.equal(inspectionVisibility(scene,camera,target),false);
 const wall=new THREE.Mesh(new THREE.BoxGeometry(10,10,1),new THREE.MeshBasicMaterial());wall.name='sile-buildings-0';wall.position.z=-5;scene.add(wall);
 assert.equal(inspectionVisibility(scene,camera,target),false);
 wall.position.x=20;assert.equal(inspectionVisibility(scene,camera,target),true);
 wall.name='sile-sea';assert.equal(inspectionVisibility(scene,camera,target),false);
});
test('thumbnail capture reports unavailable on blocked or invalid canvas',()=>{
 assert.equal(captureInspectionFrame(null),null);
 assert.equal(captureInspectionFrame({width:1,height:1},()=>({getContext(){throw Error('blocked')}})),null);
});

test('inspection map context preserves caller preference intent while committing',async()=>{
 const contexts=[];const select=createMapSelector({load:async()=>{},commit:(id,context)=>contexts.push([id,context]),busy(){},error(){}});
 assert.equal(await select('sile',{inspection:true}),true);assert.deepEqual(contexts,[['sile',{inspection:true}]]);
});

test('thumbnail adapter captures the current canvas at the promised bounded JPEG size',()=>{
 const source={width:1920,height:1080},calls=[];
 const output={getContext:()=>({drawImage:(...args)=>calls.push(args)}),toDataURL:(...args)=>{calls.push(args);return 'data:image/jpeg;base64,/9j/AAAA';}};
 assert.equal(captureInspectionFrame(source,()=>output),'data:image/jpeg;base64,/9j/AAAA');assert.equal(output.width,320);assert.equal(output.height,180);
 assert.deepEqual(calls[0],[source,0,0,320,180]);assert.deepEqual(calls[1],['image/jpeg',.7]);
});

test('sensor casts geometry only for an active, near, FPV camera aimed at the region',async()=>{
 const {createInspectionView}=await import('../src/sile-inspection-view.js');
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera();
 let casts=0;const mesh=new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshBasicMaterial());mesh.name='sile-terrain';mesh.raycast=()=>{casts++;};scene.add(mesh);
 const point={id:'castle',position:{x:0,y:0,z:0},target:{x:0,y:0,z:-30},radius:12};
 const session={status:'ready',activePointId:'castle',scenario:{points:[point]}},view=createInspectionView(scene,session);
 assert.equal(view.sensor(camera,true).visible,false);assert.equal(casts,0);
 session.status='active';camera.position.x=700;assert.equal(view.sensor(camera,true).visible,false);assert.equal(casts,0);
 camera.position.x=0;assert.equal(view.sensor(camera,false).visible,false);assert.equal(casts,0);
 camera.rotation.y=Math.PI;assert.equal(view.sensor(camera,true).visible,false);assert.equal(casts,0);
 camera.rotation.y=0;assert.equal(view.sensor(camera,true).visible,true);assert.equal(casts,1);
 session.status='completed';assert.equal(view.sensor(camera,true).visible,false);assert.equal(casts,1);
 view.dispose();
});

test('inspection briefing names the inspection activity and configured vehicle',()=>{
 const b=briefingModel({op:{kind:'free',inspection:true,name:'İLKE · Şile inceleme'},map:{id:'sile',name:'Şile'},drone:{id:'freestyle',name:'SOURCE ONE v4',class:'FPV'},real:true});
 assert.equal(b.rows.find(row=>row.k==='Çalışma')?.v,'İLKE · Şile inceleme');
 assert.equal(b.rows.find(row=>row.k==='Drone')?.v,'SOURCE ONE v4');
 assert.equal(b.rows.some(row=>row.k==='Oyun modu'),false);
});

test('download payload preserves realistic long UTF-8 telemetry within compact byte cap',async()=>{
 const {inspectionDownloadBlob}=await import('../src/sile-inspection-view.js');
 const report={schema:'ilke.sile.inspection.v1',meta:{vehicle:'İLKE · Şile / SOURCE ONE',description:'Ölçüm değil · simülasyon'},telemetry:Array.from({length:6000},(_,i)=>({t:i/5,x:123.456789,y:23.456789,z:-654.321987,qw:.987654321,qx:.012345678,qy:.023456789,qz:.03456789,vx:.123456,vy:.234567,vz:.345678,agl:18.123456,battery:.754321,packVoltageV:22.123456,lat:41.123456,lon:29.123456,armed:true,grounded:false,flightMode:'acro',input:{lift:.512345,yaw:.012345,pitch:.023456,roll:.034567}}))};
 assert.ok(Buffer.byteLength(JSON.stringify(report,null,2),'utf8')>2500000);
 const blob=inspectionDownloadBlob(report);assert.ok(blob instanceof Blob);assert.ok(blob.size<=2500000);assert.equal(blob.type,'application/json');
 assert.deepEqual(JSON.parse(await blob.text()),report);
});

test('download payload enforces final UTF-8 bytes and rejects oversize without mutation',async()=>{
 const {inspectionDownloadBlob}=await import('../src/sile-inspection-view.js');
 const report={text:'Ş'.repeat(1250000)};const before=report.text;
 assert.equal(inspectionDownloadBlob(report),null);assert.equal(report.text,before);
 const cyclic={};cyclic.self=cyclic;assert.equal(inspectionDownloadBlob(cyclic),null);
});
