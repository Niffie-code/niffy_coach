import http from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve('site'),prefix='/niffy_coach/';
const types={'.js':'text/javascript','.css':'text/css','.html':'text/html; charset=utf-8','.svg':'image/svg+xml','.wasm':'application/wasm'};
const server=http.createServer(async(req,res)=>{
 try{const url=new URL(req.url,'http://localhost');if(url.pathname==='/'){res.writeHead(302,{Location:prefix});res.end();return;}
 if(!url.pathname.startsWith(prefix))throw Error();
 const file=path.resolve(root,decodeURIComponent(url.pathname.slice(prefix.length))||'index.html');if(!file.startsWith(root+path.sep))throw Error();
 const body=await readFile(file);res.writeHead(200,{'Content-Type':types[path.extname(file)]||'text/plain'});res.end(body);
 }catch{res.writeHead(404);res.end('Page not found');}});
server.listen(4326,'127.0.0.1',()=>console.log('http://127.0.0.1:4326/niffy_coach/'));