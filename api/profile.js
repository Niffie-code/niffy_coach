import {get,put,BlobPreconditionFailedError} from '@vercel/blob';
import {identity,json,sameOrigin} from '../lichess-session.js';
export default {async fetch(req){
 try{
 if(!['GET','POST'].includes(req.method))return json({},405);
 if(req.method==='POST'&&!sameOrigin(req))return json({},403);
 const account=await identity(req);if(!account)return json({},401);
 if(req.headers.get('x-niffy-profile')!==account.id)return json({},409);
 const path='profiles/'+account.id+'.json';
 const rows=req.method==='POST'?await req.json():[];
 if(!Array.isArray(rows)||rows.length>64||rows.some(r=>!r||!/^([gadru]:[\w.-]{1,180}|settings)$/.test(r.id)||!Number.isFinite(r.at)||!r.value||typeof r.value!=='object'))return json({},400);
 for(let i=0;i<5;i++){
 const previous=await get(path,{access:'private',useCache:false});
 const data=previous?await new Response(previous.stream).json():{};
 if(req.method==='GET')return json(data);
 let changed=false;
 for(const row of rows){if(!data[row.id]||row.at>data[row.id].at){data[row.id]=row;changed=true;}}
 if(!changed)return json({ok:true});
 try{await put(path,JSON.stringify(data),{access:'private',contentType:'application/json',addRandomSuffix:false,allowOverwrite:!!previous,...(previous?{ifMatch:previous.blob.etag}:{})});return json({ok:true});}
 catch(e){if(!(e instanceof BlobPreconditionFailedError)&&!(!previous&&/already exists/i.test(e.message)))throw e;}
 }
 return json({},409);
 }catch{return json({error:'Sync will retry.'},503);}
}};