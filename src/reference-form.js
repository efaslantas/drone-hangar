// Numeric fields stay a draft until Apply; per-field validation can reject a
// perfectly valid tensor while the user is still entering its three moments.
export function bindReferenceForm(root,commit) {
 root.getElementById('reference-profile').addEventListener('change',commit);
 root.getElementById('reference-apply').addEventListener('click',commit);
 root.getElementById('battery-mode')?.addEventListener('change',()=>{
  const active=root.getElementById('battery-mode').value==='rint';
  for(const id of ['battery-resistance','battery-soc','battery-cutoff'])root.getElementById(id).disabled=!active;
 });
 root.getElementById('dyn-inertia-mode').addEventListener('change',()=>{
  const manual=root.getElementById('dyn-inertia-mode').value==='manual';
  for(const id of ['dyn-inertia-x','dyn-inertia-y','dyn-inertia-z'])root.getElementById(id).disabled=!manual;
 });
}
