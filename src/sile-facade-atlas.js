// Authored material templates, not photographs or measured facade inventory.
// Local bay coordinates are top-down; the uploaded atlas rows are bottom-up.
const byte=n=>Math.max(0,Math.min(255,Math.round(n)));
function noise(tile,x,y){let n=(Math.imul(x+1,374761393)^Math.imul(y+1,668265263)^Math.imul(tile+1,1274126177))>>>0;n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967295;}
// One source of opening proportions for raster tiles and attached3D details.
const openings=Object.freeze(Array.from({length:16},(_,tile)=>{
 if(tile===15)return null;
 const commercial=tile===10||tile===11,entry=tile===8||tile===9;
 const width=commercial?205:entry?91:tile%3===0?132:106,height=entry||commercial?195:138;
 return Object.freeze({x:(256-width)/2,y:entry||commercial?51:62,width,height,entry,commercial});
}));
export function facadeOpening(tile){return openings[tile]??null;}
export function facadeTexel(tile,x,y){
 const grain=(noise(tile,x,y)-.5)*5,patch=Math.sin(x*.023+tile*1.7)*Math.sin(y*.017+tile*.6)*3;
 let rgb=[232+grain+patch,229+grain+patch,220+grain+patch],height=128+grain*.5,roughness=239+grain,kind='plaster';
 if(tile!==15){
  const {commercial,entry,width:w,height:h,x:wx,y:wy}=facadeOpening(tile),inside=(a,b,c,d)=>x>=a&&x<c&&y>=b&&y<d;
  // Mild accumulated dirt below sills, and a ground-floor splash band. Keep
  // the first/last8px clean so mipmaps cannot sample another bay's detail.
  if(x>8&&x<248&&y>8&&y<248){let dirt=(entry||commercial)?Math.max(0,(y-217)/31)*11:0;
   if(y>wy+h+12&&x>wx-12&&x<wx+w+12)dirt+=Math.exp(-(y-wy-h-12)/24)*(2+3*(.5+.5*Math.sin(x*.36+tile)));
   rgb=rgb.map((v,i)=>v-dirt*[1,.97,.86][i]);
  }
  if(inside(wx-9,wy-9,wx+w+9,wy+h+9)){kind='frame';height=177;roughness=178;rgb=[193+grain,192+grain,181+grain];
   if(inside(wx-6,wy-6,wx+w+6,wy+h+6)){height=165;rgb=[218+grain,216+grain,204+grain];}
  }
  if(inside(wx,wy,wx+w,wy+h)){
   const u=(x-wx)/w,v=(y-wy)/h,variant=tile%8;
   if(tile===11||(!entry&&!commercial&&(variant===2||variant===6))){kind='shutter';const slat=tile===11?y%9:x%11,shade=slat<2?-22:slat<4?6:0;rgb=[135+shade+grain,141+shade+grain,128+shade+grain];height=slat<2?148:160;roughness=212;}
   else if(entry){kind='door';const panel=x<wx+7||x>wx+w-7||Math.abs(x-(wx+w*.5))<2||Math.abs(y-(wy+h*.58))<2;rgb=panel?[135+grain,125+grain,108+grain]:[100+grain,94+grain,81+grain];height=panel?139:117;roughness=191;if(inside(wx+w*.77,wy+h*.49,wx+w*.82,wy+h*.56)){rgb=[183,183,170];height=154;roughness=120;}}
   else{
    kind='glass';height=67;roughness=66+variant*3;const reflection=1-v;
    rgb=[45+variant*2+reflection*21,62+variant+reflection*29,68+variant*2+reflection*31];
    // Alternate curtain openings, with broad folds behind the glazing. A
    // subdued diagonal sky reflection supplies depth without fake emission.
    const curtain=variant===1?u>.67:variant===3?u<.23:variant===4?u<.18||u>.79:variant===5?u>.72:variant===7?u<.36:false;
    if(curtain){const fold=Math.sin(u*78+tile)*8;rgb=[158+fold,150+fold,130+fold];roughness=91;}
    const glint=Math.max(0,1-Math.abs(u-(.19+v*.18))/ .12)*12;rgb=rgb.map((c,i)=>c+glint*[.7,.9,1][i]);
    if(Math.abs(x-(wx+w*.5))<2||!commercial&&Math.abs(y-(wy+h*.55))<2){kind='frame';rgb=[203+grain,205+grain,194+grain];height=173;roughness=166;}
    if(x<wx+3||x>wx+w-3||y<wy+3||y>wy+h-3){kind='reveal';rgb=[67,73,70];height=96;roughness=186;}
   }
  }
  if(!entry&&!commercial&&inside(wx-13,wy+h+8,wx+w+13,wy+h+18)){kind='sill';height=184;roughness=217;rgb=y<wy+h+11?[222+grain,219+grain,207+grain]:[162+grain,159+grain,146+grain];}
 }
 return{rgb:rgb.map(byte),height:byte(height),roughness:byte(roughness),kind};
}
export function facadeAtlasData(){
 const size=1024,pixels={color:new Uint8Array(size*size*4),height:new Uint8Array(size*size*4),roughness:new Uint8Array(size*size*4)};
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const tile=(y>>8)*4+(x>>8),t=facadeTexel(tile,x%256,255-y%256),i=(y*size+x)*4;
  for(let k=0;k<3;k++){pixels.color[i+k]=t.rgb[k];pixels.height[i+k]=t.height;pixels.roughness[i+k]=t.roughness;}pixels.color[i+3]=pixels.height[i+3]=pixels.roughness[i+3]=255;
 }
 return{size,pixels};
}
