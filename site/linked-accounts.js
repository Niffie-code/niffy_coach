import {get,list,put} from './store.js';
import {importGames} from './coach.js';
const interval=15*60*1000;
let checking=false,rerun=false,onUpdate=()=>{},onGames=()=>{};
const stamp=name=>(localStorage.getItem('niffy_coach.profile.v1.active')||'niffy_coach.profile.v1')+'.lichess.'+name.toLowerCase();
const failures=new Map();
export const checkedAt=name=>Number(localStorage.getItem(stamp(name)))||0;
const retryKey='niffy.lichess.retryAt';
export const accounts=()=>list('u:').filter(row=>row.active);
export function link(name){
 name=name.trim();if(!/^[a-zA-Z0-9_-]{2,30}$/.test(name))throw Error('Enter a Lichess username (2–30 letters, numbers, underscores or hyphens).');
 const id='u:'+name.toLowerCase();
 if(!get(id)?.active){put(id,{name,active:true});localStorage.removeItem(stamp(name));}
 return checkAccounts();
}
export function unlink(name){put('u:'+name.toLowerCase(),{name,active:false});onUpdate();}
export async function checkAccounts(){
 if(checking){rerun=true;return;}
 if(document.hidden||navigator.onLine===false||Number(localStorage.getItem(retryKey))>Date.now())return;
 checking=true;
 try{
 for(const {name} of accounts()){
 const last=Number(localStorage.getItem(stamp(name)))||0,now=Date.now();
 if(now-last<interval||(failures.get(stamp(name))||0)>now)continue;
 try{
 const r=await importGames('lichess',name,last?Math.max(1,last-86400000):0);
 localStorage.setItem(stamp(name),String(now));onUpdate(name+': '+r.imported+' new game'+(r.imported===1?'':'s')+'.');if(r.imported)onGames();
 }catch(e){
 const delay=e.status===429?Math.max(60000,e.retryAfter||0):interval;
 failures.set(stamp(name),Date.now()+delay);
 if(e.status===429)localStorage.setItem(retryKey,String(Date.now()+delay));
 onUpdate(name+': '+e.message);
 if(e.status===429)break;
 // Failed requests retain their cursor so the next attempt can catch up.
 }
 }
 }finally{checking=false;if(rerun){rerun=false;setTimeout(checkAccounts,1000);}}
}
export function startAccounts(update,gamesChanged){
 onUpdate=update;onGames=gamesChanged;
 setInterval(checkAccounts,interval);window.addEventListener('online',checkAccounts);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)void checkAccounts();});
 window.addEventListener('profile-refreshed',checkAccounts);
 void checkAccounts();
}