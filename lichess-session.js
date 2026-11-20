const cookieName='__Host-niffy_session';
export const cookie=(token,age)=>cookieName+'='+encodeURIComponent(token)+'; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age='+age;
export const json=(value,status=200,headers={})=>Response.json(value,{status,headers:{'Cache-Control':'private, no-store',...headers}});
export const sameOrigin=req=>req.headers.get('origin')===new URL(req.url).origin;
export async function identity(request){
 const token=request.headers.get('cookie')?.split(/;\s*/).find(v=>v.startsWith(cookieName+'='))?.slice(cookieName.length+1);
 if(!token)return null;
 const res=await fetch('https://lichess.org/api/account',{headers:{Authorization:'Bearer '+decodeURIComponent(token)},signal:AbortSignal.timeout(10000)});
 if(res.status===401||res.status===403)return null;
 if(!res.ok)throw Error('Lichess temporarily unavailable');
 const account=await res.json();if(!/^[\w-]+$/.test(account.id))throw Error('Invalid account');
 return {id:account.id,username:account.username};
}