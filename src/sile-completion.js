// Shared validation for the map inventory and its later acceptance report.
export function validateSileInventory(data){
 const errors=[],ids=new Set(),regions=Array.isArray(data?.regions)?data.regions:[],valid=new Set(['S1','S2','S3','S4','S5','S6']);
 if(regions.length!==6||new Set(regions.map(r=>r?.id)).size!==6||regions.some(r=>!valid.has(r?.id)))errors.push('six-regions-required');
 for(const r of regions){if(!r||typeof r!=='object'){errors.push('invalid-region');continue;}if(!Array.isArray(r.bounds)||r.bounds.length!==4||!r.bounds.every(Number.isFinite)||r.bounds[0]>=r.bounds[1]||r.bounds[2]>=r.bounds[3])errors.push('region-bounds:'+r.id);if(r.cameras?.length<2||!Array.isArray(r.cameras)||r.cameras.some(c=>![c.eye,c.target].every(p=>Array.isArray(p)&&p.length===3&&p.every(Number.isFinite))))errors.push('paired-cameras:'+r.id);}
 if(!data?.issues?.length)errors.push('issues-required');
 for(const issue of Array.isArray(data?.issues)?data.issues:[]){
  if(!issue||typeof issue!=='object'){errors.push('invalid-issue');continue;}
  if(typeof issue.id!=='string'||ids.has(issue.id))errors.push('unique-id:'+issue.id);ids.add(issue.id);
  if(!valid.has(issue.region))errors.push('issue-region:'+issue.id);
  if(!['measured','photo-inferred','assumed','unknown'].includes(issue.evidence))errors.push('evidence:'+issue.id);
  if(!['open','fixed','accepted','blocked'].includes(issue.status))errors.push('status:'+issue.id);
  if(!issue.references?.length||issue.references.some(r=>typeof r!=='string'||!r.length))errors.push('references:'+issue.id);
  if(issue.evidence==='measured'&&(!issue.measurement?.source||!issue.measurement?.unit||!Number.isFinite(issue.measurement?.value)))errors.push('measurement-required:'+issue.id);
 }
 return errors;
}

export function validateSileAcceptance(report,inventory,{allowOpenInventory=false}={}){
 const errors=validateSileInventory(inventory);if(!report||typeof report!=='object')return [...errors,'report-required'];
 const ids=['S1','S2','S3','S4','S5','S6'],regions=Array.isArray(report.regions)?report.regions:[],routes=Array.isArray(report.routes)?report.routes:[],proof=c=>c?.status==='pass'&&Array.isArray(c.evidence)&&c.evidence.length>0&&c.evidence.every(x=>typeof x==='string'&&x.length>0);
 if(report.inventoryVersion!==inventory?.schema)errors.push('inventory-version');
 if(typeof report.sourceSnapshotKey!=='string'||report.sourceSnapshotKey!==inventory.sourceSnapshotKey)errors.push('source-snapshot');
 if(regions.length!==6||new Set(regions.map(r=>r?.id)).size!==6)errors.push('region-coverage');
 for(const id of ids){const r=regions.find(r=>r?.id===id);for(const check of ['geometry','grounding','architecture','landmarks','appearance','contacts','backend'])if(!proof(r?.checks?.[check]))errors.push(id+':'+check);for(const direction of ['forward','reverse']){const found=routes.filter(r=>r?.region===id&&r.direction===direction);if(found.length!==1||!proof(found[0])||!Number.isFinite(found[0]?.samples)||found[0].samples<1)errors.push(id+':route:'+direction);}}
 if(routes.length!==12)errors.push('twelve-routes-required');
 const p=report.performance;if(!p||p.durationSeconds<900||!Number.isFinite(p.durationSeconds)||p.backend!=='webgl'||p.quality!=='medium'||JSON.stringify(p.renderSize)!=='[1280,720]'||typeof p.userAgent!=='string'||!p.userAgent)errors.push('performance-run');
 for(const id of ids){const r=p?.regions?.find(r=>r?.id===id);if(!r||!Number.isFinite(r.low1PercentFps)||r.low1PercentFps<30||!Number.isFinite(r.fps)||r.fps<30||!Number.isFinite(r.frames)||r.frames<1800)errors.push(id+':performance');}
 if(!allowOpenInventory)for(const issue of inventory?.issues||[])if(issue.status!=='accepted')errors.push('open-issue:'+issue.id);
 for(const key of ['physicalTX15','humanAcceptance'])if(!['not-run','pass','fail'].includes(report[key]?.status))errors.push(key+':status');
 return errors;
}
