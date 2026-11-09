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
