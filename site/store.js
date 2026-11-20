const base='niffy_coach.profile.v1';
const activeKey=base+'.active';
let key=localStorage.getItem(activeKey)||base;
const changed=()=>{if(typeof window.dispatchEvent==='function')window.dispatchEvent(new Event('profile-changed'));};
export function activateProfile(id){
 const target=id?base+'.'+id:base;
 if(key===target)return;
 const guest=key===base?read():{};
 key=target;localStorage.setItem(activeKey,key);data=read();
 if(id&&!localStorage.getItem(base+'.migrated')&&Object.keys(guest).some(k=>k!=='settings')){
 restore(JSON.stringify(guest),false);localStorage.setItem(base+'.migrated',id);
 }
}
const read=()=>JSON.parse(localStorage.getItem(key)||'{}');
let data=read();
export const get=id=>data[id]?.value;
export const list=prefix=>Object.values(data).filter(row=>row.id.startsWith(prefix)).map(row=>row.value);
export function put(id,value){
 const latest=read();
 latest[id]={id,value,at:Math.max(Date.now(),(latest[id]?.at||0)+1)};
 localStorage.setItem(key,JSON.stringify(latest));
 data=latest;changed();
}
export async function sync(){data=read();document.querySelector('#sync').textContent='Saved in this browser';}
window.addEventListener('storage',event=>{if(event.key===activeKey)location.reload();else if(event.key===key){data=read();changed();}});
export function backup(){return JSON.stringify(read(),null,2);}
export function restore(text,notify=true){
 const rows=JSON.parse(text),merged=read();
 if(!rows||typeof rows!=='object'||Array.isArray(rows))throw Error('Choose a Niffy Coach profile backup.');
 for(const [id,row] of Object.entries(rows)){
  if(!row||row.id!==id||!Number.isFinite(row.at)||!row.value||typeof row.value!=='object'||!/^([gadru]:[\w.-]{1,180}|settings)$/.test(id))throw Error('Invalid backup record.');
  for(const field of ['id','critical','game','card'])if(row.value[field]&&!/^[\w.-]{1,180}$/.test(row.value[field]))throw Error('Invalid record reference.');
  if(id==='settings'&&row.value.minutes!=null&&!Number.isFinite(row.value.minutes))throw Error('Invalid time budget.');
  if(!merged[id]||row.at>merged[id].at)merged[id]=row;
 }
 const next=JSON.stringify(merged);if(localStorage.getItem(key)!==next){localStorage.setItem(key,next);data=merged;if(notify)changed();}
}