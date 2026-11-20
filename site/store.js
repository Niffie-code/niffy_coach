const key='niffy_coach.profile.v1';
const read=()=>JSON.parse(localStorage.getItem(key)||'{}');
let data=read();
export const get=id=>data[id]?.value;
export const list=prefix=>Object.values(data).filter(row=>row.id.startsWith(prefix)).map(row=>row.value);
export function put(id,value){
 const latest=read();
 latest[id]={id,value,at:Math.max(Date.now(),(latest[id]?.at||0)+1)};
 localStorage.setItem(key,JSON.stringify(latest));
 data=latest;
}
export async function sync(){data=read();document.querySelector('#sync').textContent='Saved in this browser';}
window.addEventListener('storage',event=>{if(event.key===key)data=read();});
export function backup(){return JSON.stringify(read(),null,2);}
export function restore(text){
 const rows=JSON.parse(text),merged=read();
 if(!rows||typeof rows!=='object'||Array.isArray(rows))throw Error('Choose a Niffy Coach profile backup.');
 for(const [id,row] of Object.entries(rows)){
  if(!row||row.id!==id||!Number.isFinite(row.at)||!row.value||typeof row.value!=='object'||!/^([gadr]:[\w.-]{1,180}|settings)$/.test(id))throw Error('Invalid backup record.');
  for(const field of ['id','critical','game','card'])if(row.value[field]&&!/^[\w.-]{1,180}$/.test(row.value[field]))throw Error('Invalid record reference.');
  if(id==='settings'&&row.value.minutes!=null&&!Number.isFinite(row.value.minutes))throw Error('Invalid time budget.');
  if(!merged[id]||row.at>merged[id].at)merged[id]=row;
 }
 localStorage.setItem(key,JSON.stringify(merged));data=merged;
}