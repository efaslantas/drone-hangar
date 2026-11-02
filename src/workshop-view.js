import { BUILD_PARTS, DEFAULT_BUILD, buildMetrics } from './fpv-build.js';

const descriptions = {
 frame: ['Hafif X gövde; daha hızlı dönüş tepkisi.', 'Daha ağır gövde; daha sakin dönüş tepkisi.', 'Uzun uçuş odaklı; dönüş tepkisi daha yumuşak.'],
 motors: ['Daha düşük itiş; daha uzun tahmini uçuş.', 'İtiş ve uçuş süresi arasında dengeli seçim.', 'Daha yüksek itiş ve rate; daha kısa uçuş.'],
 battery: ['4 hücre; 1500 mAh. Daha düşük itiş profili.', '6 hücre; 1100 mAh. Daha hafif, yüksek itiş.', '6 hücre; 1300 mAh. Daha ağır, uzun uçuş.'],
 props: ['İki pal; daha az sürüklenme, daha uzun uçuş.', 'Üç pal; itiş ve verim arasında denge.', 'Dört pal; daha fazla itiş ve tüketim.'],
};
function illustration(type,index) {
 const color=['#c2f36a','#8bd6e3','#f3c77d'][index];
 let art='';
 if(type==='props') {
  const count=index+2;
  for(let i=0;i<count;i++) art+=`<path transform="rotate(${i*360/count} 100 55)" d="M95 55 Q67 14 92 9 Q111 6 106 49Z" fill="${color}" stroke="#edf4de" stroke-width="1.3"/>`;
  art+='<circle cx="100" cy="55" r="9" fill="#242b28" stroke="#eff8df"/><circle cx="100" cy="55" r="3" fill="#b7c4ad"/>';
 } else if(type==='battery') {
  const width=[90,78,104][index],height=[36,45,45][index];
  art=`<path d="M${100-width/2} 39l12-10h${width}l-12 10" fill="#4e5852"/><rect x="${100-width/2}" y="39" width="${width}" height="${height}" rx="5" fill="#252d29" stroke="#75836d"/><path d="M${100+width/2} 39l12-10v${height}l-12 10Z" fill="#171e1a" stroke="#75836d"/><rect x="${108-width/2}" y="47" width="${width-16}" height="${height-16}" rx="2" fill="${color}"/><text x="100" y="${height===36?63:66}" text-anchor="middle" font-size="14" fill="#142014" font-family="monospace">${['4S 1500','6S 1100','6S 1300'][index]}</text><path d="M${100+width/2} 58q30-30 29-2" fill="none" stroke="#e2a977" stroke-width="4"/>`;
 } else if(type==='motors') {
  art=`<ellipse cx="100" cy="83" rx="34" ry="9" fill="#151d19"/><path d="M67 41v31q33 21 66 0V41" fill="#333e37" stroke="#82907b"/><ellipse cx="100" cy="42" rx="33" ry="14" fill="${color}"/><ellipse cx="100" cy="42" rx="23" ry="8" fill="#1d2720"/><path d="M100 41V19" stroke="#c0cab8" stroke-width="7"/><text x="100" y="71" text-anchor="middle" font-family="monospace" font-size="13" fill="#f0f7e8">${['1750','1900','2450'][index]} KV</text>`;
 } else {
  const w=[43,48,38][index],h=[31,31,39][index];
  art=`<path d="M${100-w} ${55-h}L${100+w} ${55+h}M${100+w} ${55-h}L${100-w} ${55+h}" stroke="#586651" stroke-width="12"/><path d="M${100-w} ${55-h}L${100+w} ${55+h}M${100+w} ${55-h}L${100-w} ${55+h}" stroke="${color}" stroke-width="2"/>`;
  for(const x of [-1,1])for(const y of [-1,1])art+=`<circle cx="${100+x*w}" cy="${55+y*h}" r="10" fill="#1a211c" stroke="${color}" stroke-width="2"/>`;
  art+=`<rect x="85" y="${55-h}" width="30" height="${h*2}" rx="8" fill="#303a31" stroke="#a6b79a"/><path d="M94 43h12m-12 8h12m-12 8h12" stroke="${color}" stroke-width="2"/>`;
 }
 return `<svg viewBox="0 0 200 110" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg">${art}</svg>`;
}
export function workshopChoices(type) {
 return (BUILD_PARTS[type]||[]).map((choice,index)=>({...choice,svg:illustration(type,index),description:descriptions[type][index]}));
}
export function workshopComparison(spec,build) {
 const values=buildMetrics(spec,build),baseline=buildMetrics(spec,DEFAULT_BUILD);
 return [
  {key:'thrust',label:'İtiş / ağırlık',unit:':1'},
  {key:'endurance',label:'Tahmini süre',unit:' sn'},
  {key:'rate',label:'Maks. rate',unit:'°/sn'},
  {key:'mass',label:'Uçuş ağırlığı',unit:' g'},
 ].map(row=>({...row,value:values[row.key],delta:Math.round((Number(values[row.key])-Number(baseline[row.key]))*10)/10}));
}
