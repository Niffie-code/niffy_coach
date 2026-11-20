import {cookie,identity,json,sameOrigin} from '../lichess-session.js';
export default {async fetch(req){
 try{
 if(req.method==='GET')return json({account:await identity(req)});
 if(!sameOrigin(req))return json({},403);
 if(req.method==='DELETE')return json({ok:true},200,{'Set-Cookie':cookie('',0)});
 if(req.method!=='POST')return json({},405);
 const {code,verifier}=await req.json();
 if(typeof code!=='string'||!code||code.length>1000||typeof verifier!=='string'||!/^[a-zA-Z0-9_-]{43,128}$/.test(verifier))return json({},400);
 const token=await fetch('https://lichess.org/api/token',{method:'POST',body:new URLSearchParams({grant_type:'authorization_code',code,code_verifier:verifier,client_id:'niffy-coach',redirect_uri:new URL('/',req.url).href}),signal:AbortSignal.timeout(15000)});
 if(!token.ok)return json({error:'Sign-in expired. Please connect again.'},401);
 const {access_token,expires_in}=await token.json();
 if(typeof access_token!=='string'||!access_token)return json({},502);
 return json({ok:true},200,{'Set-Cookie':cookie(access_token,Math.min(expires_in||2592000,2592000))});
 }catch{return json({error:'Sign-in service unavailable. Try again shortly.'},503);}
}};