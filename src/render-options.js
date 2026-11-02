// A millimetre FPV near plane and kilometre scenery need the same depth encoding.
export function rendererOptions({touchUi=false}={}){
 return {antialias:!touchUi,powerPreference:touchUi?'low-power':'high-performance',logarithmicDepthBuffer:true};
}
