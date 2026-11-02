// Visual recipes, independent of conservative physics collision size.
export const AIRFRAME_DIMENSIONS={micro:{wheelbase:.075,propDiameter:.031},whoop:{wheelbase:.065,propDiameter:.031},cinewhoop:{wheelbase:.155,propDiameter:.0762},toothpick:{wheelbase:.125,propDiameter:.0762},freestyle:{wheelbase:.225,propDiameter:.127},racer:{wheelbase:.21,propDiameter:.127},cine5:{wheelbase:.235,propDiameter:.127},seven:{wheelbase:.3,propDiameter:.1778},camera:{wheelbase:.35,propDiameter:.2286},heavy:{wheelbase:.45,propDiameter:.3048}};
// [plate width/length, motor diameter/body height, stack height, pack W/H/L, cells, mAh].
const families={
 micro:[.026,.031,.0085,.0045,.007,.012,.006,.041,1,300],whoop:[.024,.029,.0085,.0045,.007,.012,.006,.041,1,300],
 cinewhoop:[.064,.085,.022,.013,.018,.03,.027,.06,4,850],toothpick:[.028,.062,.014,.011,.012,.024,.019,.043,3,450],
 freestyle:[.05,.14,.0271,.0191,.025,.035,.038,.075,6,1100],racer:[.04,.115,.0271,.0191,.023,.034,.038,.075,6,1100],
 cine5:[.065,.13,.028,.02,.025,.038,.039,.085,6,1300],seven:[.058,.17,.032,.023,.028,.04,.041,.088,6,1300],
 camera:[.13,.17,.035,.025,.03,.075,.045,.13,4,5200],heavy:[.17,.22,.042,.028,.035,.09,.065,.16,6,10000],
};
export function airframeAppearance(spec){
 const p=families[spec.id]||families.freestyle,d=AIRFRAME_DIMENSIONS[spec.id]||AIRFRAME_DIMENSIONS.freestyle;
 const wheelbase=spec.dynamics?.wheelbaseMm?spec.dynamics.wheelbaseMm/1000:d.wheelbase;
 const sourceMarker=spec.id==='freestyle'&&spec.propulsion?.airframe==='source-one-v4';
 const sourceOne=sourceMarker&&Math.abs(wheelbase-.226)<.001;
 const selected=spec.build?.battery,cells=spec.propulsion?.profile?.endsWith('-6s')?6:spec.propulsion?.profile?.endsWith('-4s')?4:Number(selected?.match(/^(\d)s/)?.[1])||p[8];
 const capacityMah=spec.propulsion?.capacityMah||({'4s1500':1500,'6s1100':1100,'6s1300':1300}[selected])||p[9];
 const scale=Math.sqrt(capacityMah/p[9]);
 const pack={width:p[5]*Math.sqrt(scale),height:p[6]*(cells/p[8]),length:p[7]*scale,cells,capacityMah};
 return {wheelbase,propDiameter:d.propDiameter,sourceOne,sourceMarker,plateW:sourceOne?.0465:p[0],plateL:sourceOne?.1605:p[1],motorDiameter:p[2],motorBodyH:p[3],motorTotalH:p[3]+(spec.fpv?.012:.006),stackH:sourceOne?.03:!spec.ducts&&!spec.gimbal?Math.max(p[4],p[3]+spec.size*.014+.012):p[4],pack,
 evidence:sourceOne?'Üretici CAD kesim parçaları · montaj/donanım temsili':sourceMarker?'Ölçüsü değiştirilmiş temsili gövde':'Sınıf ölçülerine göre temsili gövde'};
}
export function carbonUvs(geometry,tile=.008){
 const pos=geometry.attributes.position,normal=geometry.attributes.normal,uv=geometry.attributes.uv;
 if(!uv||!normal)return geometry;
 for(let i=0;i<pos.count;i++){
  const x=pos.getX(i),y=pos.getY(i),z=pos.getZ(i),nx=Math.abs(normal.getX(i)),ny=Math.abs(normal.getY(i)),nz=Math.abs(normal.getZ(i));
  if(ny>=nx&&ny>=nz)uv.setXY(i,x/tile,z/tile);else if(nx>=nz)uv.setXY(i,z/tile,y/tile);else uv.setXY(i,x/tile,y/tile);
 }
 return geometry;
}
