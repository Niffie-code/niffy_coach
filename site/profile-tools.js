import {backup,restore} from './store.js';
document.querySelector('#backup').onclick=()=>{
 const url=URL.createObjectURL(new Blob([backup()],{type:'application/json'}));
 const a=document.createElement('a');a.href=url;a.download='niffy_coach-profile.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
};
document.querySelector('#restore').onchange=async event=>{
 const file=event.target.files[0];if(!file)return;
 try{restore(await file.text());location.reload();}catch(error){document.querySelector('#backup-status').textContent=error.message;}
};