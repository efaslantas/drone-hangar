import source from './data/sile-landcover.json' with {type:'json'};
// Native categorical lookup only. Zero means unavailable, never bare ground.
export function landcoverSampler(data,raster=source){
 const valid=data?.completionLayer===1&&data.supplementalSource?.baseMapSnapshotKey===raster.baseMapSnapshotKey&&Object.entries(raster.projection).every(([k,v])=>data.projection?.[k]===v)&&raster.classes.length===raster.cols*raster.rows&&raster.step.every(v=>Number.isFinite(v)&&v>0);
 if(!valid)return ()=>0;
 return (x,z)=>{const col=Math.floor((x-raster.origin[0])/raster.step[0]),row=Math.floor((z-raster.origin[1])/raster.step[1]);return col>=0&&col<raster.cols&&row>=0&&row<raster.rows?raster.classes[row*raster.cols+col]:0;};
}
export const sileLandcoverSource=source;
