import test from 'node:test';import assert from 'node:assert/strict';
import * as roof from '../src/sile-roofs.js';
const item={id:11,rings:[[[0,0],[12,0],[12,8],[0,8]]],base:3,height:7.5};
const cross=(a,b,c)=>{const u=b.map((v,i)=>v-a[i]),v=c.map((v,i)=>v-a[i]);return [u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]]};
test('gable roof covers exactly the footprint inside its source height and has usable metric UVs',()=>{
 const r=roof.buildingRoof(item);assert.ok(r);assert.equal(r.eaves,9);assert.equal(r.positions.length,36);assert.equal(r.uv.length,24);assert.equal(r.gables.length,18);assert.equal(Math.max(...r.positions.filter((_,i)=>i%3===1)),10.5);
 let area=0;for(let i=0;i<r.positions.length;i+=9){const [a,b,c]=[0,3,6].map(k=>r.positions.slice(i+k,i+k+3));const n=cross(a,b,c);assert.ok(n[1]>0);area+=n[1]/2;for(const p of [a,b,c]){assert.ok(p[0]>=0&&p[0]<=12&&p[2]>=0&&p[2]<=8);assert.ok(p[1]>=r.eaves&&p[1]<=10.5);}}
 assert.ok(Math.abs(area-96)<1e-8);assert.ok(r.uv.every(Number.isFinite));assert.ok(Math.max(...r.uv)>1);
 for(let i=0;i<r.gables.length;i+=9){const [a,b,c]=[0,3,6].map(k=>r.gables.slice(i+k,i+k+3));const n=cross(a,b,c),center=a.map((v,k)=>(v+b[k]+c[k])/3);assert.ok(n[0]*(center[0]-6)+n[2]*(center[2]-4)>0);assert.equal(n[1],0);}
});
test('rotated and reversed rings preserve roof area, sharp ridge and original input',()=>{
 for(const reverse of [false,true]){const b=structuredClone(item);b.rings[0]=b.rings[0].map(([x,z])=>[100+x*.6-z*.8,-70+x*.8+z*.6]);if(reverse)b.rings[0].reverse();const before=JSON.stringify(b),r=roof.buildingRoof(b);assert.ok(r);let area=0;for(let i=0;i<r.positions.length;i+=9){const n=cross(...[0,3,6].map(k=>r.positions.slice(i+k,i+k+3)));assert.ok(n[1]>0);area+=n[1]/2;}assert.ok(Math.abs(area-96)<1e-8);const cx=b.rings[0].reduce((s,p)=>s+p[0]/4,0),cz=b.rings[0].reduce((s,p)=>s+p[1]/4,0);for(let i=0;i<r.gables.length;i+=9){const [a,c,d]=[0,3,6].map(k=>r.gables.slice(i+k,i+k+3)),n=cross(a,c,d);assert.ok(n[0]*((a[0]+c[0]+d[0])/3-cx)+n[2]*((a[2]+c[2]+d[2])/3-cz)>0,'transformed gable faces outward');}assert.equal(JSON.stringify(b),before);assert.equal(Math.max(...r.positions.filter((_,i)=>i%3===1)),10.5);}
});
test('holes, landmarks, structures, concave/degenerate/irregular and deliberate flat subset keep existing roof',()=>{
 const cases=[{id:10},{landmark:'castle'},{landmark:'lighthouse'},{kind:'breakwater'},{rings:[...item.rings,[[3,3],[4,3],[4,4]]]},{rings:[[[0,0],[12,0],[2,2],[0,8]]]},{rings:[[[0,0],[12,0],[12,0],[0,8]]]},{rings:[[[0,0],[12,0],[15,8],[0,8]]]},{height:2},{height:50},{rings:[[[0,0],[60,0],[60,8],[0,8]]]}];
 for(const c of cases)assert.equal(roof.buildingRoof({...item,...c}),null,JSON.stringify(c));
});
