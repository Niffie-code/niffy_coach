import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
const browser=process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe';
const executable=await fs.stat(browser);assert.ok(executable.isFile());
const fixture={id:'qagame',variant:'standard',status:'mate',moves:'f3 e5 g4 Qh4#',players:{white:{user:{name:'tempoqa'}},black:{user:{name:'Rival'}}},speed:'blitz',lastMoveAt:Date.now(),winner:'black'};
const data={};let result;
const report=new Promise(resolve=>result=resolve);
const script=async()=>{
 const wait=async(test)=>{for(let n=0;n<900;n++){if(test())return;await new Promise(r=>setTimeout(r,100));}throw Error('Timed out at '+step+' '+document.body.innerText.slice(-550));};
 const click=s=>{const el=document.querySelector(s);if(!el)throw Error('Missing '+s);el.click();};
 const originalFetch=window.fetch;window.fetch=(url,options)=>String(url).startsWith('https://lichess.org/api/games/user/')?originalFetch('/api/import'):originalFetch(url,options);let step='initial board';
 try{await wait(()=>document.querySelectorAll('.sq').length===64);
 if(document.documentElement.scrollWidth>innerWidth+1)throw Error('Horizontal overflow');

 step='calculate knight fork';click('[data-topic="Tactics"]');
 for(const [from,to] of [['e4','f6'],['g8','g7'],['f6','d7']]){click('[data-square="'+from+'"]');click('[data-square="'+to+'"]');await wait(()=>!document.querySelector('#content').innerText.includes('Checking the position')); }
 await wait(()=>document.querySelector('[data-action="next"]'));if(!document.querySelector('.feedback').textContent.includes('Continuation'))throw Error('Missing calculation feedback');
 if(!document.body.innerText.includes('How to find it next time'))throw Error('Missing coach explanation');
 click('[data-action="best-line"]');click('[data-action="line-next"]');click('[data-action="line-close"]');
 step='import';location.hash='games';await wait(()=>document.querySelector('#import'));document.querySelector('[name="site"]').value='lichess';document.querySelector('[name="username"]').value='tempoqa';document.querySelector('#import').requestSubmit();
 await wait(()=>document.querySelector('[data-card]'));click('[data-card]');await wait(()=>location.hash==='#study'&&document.body.innerText.includes('Rival'));
 step='timed practice';location.hash='practice';await wait(()=>document.querySelector('#newgame'));document.querySelector('#newgame').requestSubmit();click('[data-square="e2"]');click('[data-square="e4"]');await wait(()=>document.querySelector('[data-square="b8"]').getAttribute('aria-label').includes('empty')||!document.querySelector('[data-square="e7"]').getAttribute('aria-label').includes('pawn')||document.querySelectorAll('.last').length&&document.querySelector('.last').dataset.square!=='e4');
 window.confirm=()=>true;click('[data-action="resign"]');await wait(()=>document.body.innerText.includes('Resigned'));
 step='replay';location.hash='games';await wait(()=>document.querySelector('[data-replay]'));click('[data-replay]');click('[data-action="forward"]');await wait(()=>document.body.innerText.includes('Ply 1 /'));click('[data-action="explain"]');await wait(()=>document.body.innerText.includes('How to find it next time'));
 location.hash='week';await wait(()=>document.body.innerText.includes('Recall by format'));await fetch('/result',{method:'POST',body:'pass'});
 }catch(e){await fetch('/result',{method:'POST',body:step+' '+String(e)});}
};
const server=http.createServer(async(req,res)=>{try{const url=new URL(req.url,'http://localhost');let body='';
 for await(const c of req)body+=c;
 if(url.pathname==='/result'){result(body);res.end('ok');return;}
 if(url.pathname==='/api/profile'){if(req.method==='POST')for(const r of JSON.parse(body))data[r.id]=r;res.end(JSON.stringify(data));return;}
 if(url.pathname==='/api/import'){res.end(JSON.stringify(fixture));return;}
 if(!url.pathname.startsWith('/niffy_coach/')){res.writeHead(404);res.end();return;}const p=url.pathname.slice('/niffy_coach/'.length)||'index.html';let buf=await fs.readFile(path.join('site',p));
 if(p==='index.html')buf=Buffer.from(String(buf).replace('</body>','<script>('+script.toString()+')()</script></body>'));
 res.setHeader('Content-Type',({js:'text/javascript',css:'text/css',svg:'image/svg+xml',wasm:'application/wasm',html:'text/html; charset=utf-8'})[p.split('.').pop()]||'text/plain');res.end(buf);
 }catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const profile=await fs.mkdtemp(path.join(os.tmpdir(),'tempo-check-'));
const child=spawn(browser,['--headless=new','--disable-gpu','--no-first-run','--window-size='+(process.argv[2]||'1100,900'),'--user-data-dir='+profile,'http://127.0.0.1:'+server.address().port+'/niffy_coach/'],{stdio:'ignore',windowsHide:true});
const timer=setTimeout(()=>result('Browser check timed out'),155000);
try{assert.equal(await report,'pass');console.log('Passed browser calculation, actual Stockfish reply, game analysis, practice and replay at '+(process.argv[2]||'desktop'));}finally{clearTimeout(timer);child.kill();server.closeAllConnections();server.close();}
