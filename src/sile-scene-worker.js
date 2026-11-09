import * as THREE from 'three';
import {prepareGroundSurfaces}from './ground-surfaces.js';
import {finishSileContext}from './sile-context-view.js';
import {finishNeighbourhood}from './sile-neighbourhood-view.js';
import {finishSurfaces}from './surfaces.js';
import {buildSile}from './sile-world.js';
import {packSileScene,sileTransferBuffers}from './sile-scene-payload.js';
// Only local procedural canvases are needed by the CPU scene builder. Real
// scanned images and all renderer/GPU work stay in the main browser context.
globalThis.document={createElement:tag=>{if(tag!=='canvas')throw Error('Unsupported worker element '+tag);return new OffscreenCanvas(1,1);}};
self.onmessage=({data})=>{try{const scene=new THREE.Scene(),play=buildSile(scene,data);prepareGroundSurfaces(scene);finishSileContext(scene);finishNeighbourhood(scene);finishSurfaces(scene);const packet=packSileScene(scene,play);self.postMessage({packet},[...sileTransferBuffers(packet)]);}catch(error){self.postMessage({error:{message:error.message,stack:error.stack}});}};
