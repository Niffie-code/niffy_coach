import {activateProfile,backup,restore,put,get} from './store.js';
const enabled=location.hostname==='niffy-coach.vercel.app';
const label=document.querySelector('#cloud-label'),connect=document.querySelector('#connect'),disconnect=document.querySelector('#disconnect');
let account=null,running=false,dirty=false,timer;
function status(message){document.querySelector('#sync').textContent=message;}
function schedule(delay=5000){if(!account)return;clearTimeout(timer);timer=setTimeout(refresh,delay);}
async function refresh(){
 if(!account||navigator.onLine===false||running)return;
 running=true;dirty=false;
 try{
 const headers={'Content-Type':'application/json','X-Niffy-Profile':account.id};
 const remote=await fetch('/api/profile',{headers,cache:'no-store',signal:AbortSignal.timeout(15000)});
 if(remote.status===401||remote.status===409){status('Reconnect Lichess to sync');connect.hidden=false;return;}
 if(!remote.ok)throw Error();
 const snapshot=await remote.json();restore(JSON.stringify(snapshot),false);
 const pending=Object.values(JSON.parse(backup())).filter(r=>!snapshot[r.id]||r.at>snapshot[r.id].at);
 for(let i=0;i<pending.length;i+=32){
 const res=await fetch('/api/profile',{method:'POST',headers,body:JSON.stringify(pending.slice(i,i+32))});if(!res.ok)throw Error();
 }
 status('Synced with '+account.username);window.dispatchEvent(new Event('profile-refreshed'));
 }catch{status('Saved on this device · sync will retry');}
 finally{running=false;if(dirty)schedule();}
}
const random=()=>Array.from(crypto.getRandomValues(new Uint8Array(32)),x=>x.toString(16).padStart(2,'0')).join('');
connect.onclick=async()=>{
 const state=random(),verifier=random(),digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(verifier));
 const challenge=btoa(String.fromCharCode(...new Uint8Array(digest))).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');
 sessionStorage.setItem('niffy.oauth',JSON.stringify({state,verifier}));
 location.assign('https://lichess.org/oauth?'+new URLSearchParams({response_type:'code',client_id:'niffy-coach',redirect_uri:location.origin+'/',scope:'',state,code_challenge_method:'S256',code_challenge:challenge}));
};
disconnect.onclick=async()=>{
 try{await refresh();const res=await fetch('/api/session',{method:'DELETE'});if(!res.ok)throw Error();activateProfile(null);location.reload();}catch{status('Could not disconnect. Try again.');}
};
export async function startCloud(){
 if(!enabled){label.textContent='Automatic cross-device sync is available on niffy-coach.vercel.app.';return;}
 connect.hidden=false;
 try{
 const query=new URLSearchParams(location.search);
 if(query.has('code')||query.has('error')){
 const saved=JSON.parse(sessionStorage.getItem('niffy.oauth')||'null');sessionStorage.removeItem('niffy.oauth');history.replaceState({},'',location.pathname+location.hash);
 if(!saved||query.get('state')!==saved.state||!query.get('code'))throw Error('Sign-in canceled. Your local games are saved.');
 const res=await fetch('/api/session',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code:query.get('code'),verifier:saved.verifier})});if(!res.ok)throw Error('Could not sign in. Please reconnect.');
 }
 const res=await fetch('/api/session',{cache:'no-store',signal:AbortSignal.timeout(8000)});if(!res.ok)throw Error('Could not check sign-in. Your games are saved locally.');
 account=(await res.json()).account;if(!account){label.textContent='Connect Lichess once per device to sync your training automatically.';return;}
 activateProfile(account.id);connect.hidden=true;disconnect.hidden=false;label.textContent='Connected as '+account.username;
 const id='u:'+account.id;if(!get(id))put(id,{name:account.username,active:true});
 await refresh();
 window.addEventListener('profile-changed',()=>{dirty=true;schedule();});window.addEventListener('online',()=>schedule(500));
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)schedule(700);});
 setInterval(()=>{if(!document.hidden)schedule(1000);},180000);
 }catch(e){label.textContent=e.message;}
}