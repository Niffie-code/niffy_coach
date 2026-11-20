import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {Chess} from '../site/vendor/chess.js';
const mem=new Map();
globalThis.localStorage={getItem:key=>mem.get(key),setItem:(k,v)=>mem.set(k,v)};
globalThis.window={addEventListener(){}};
const {backup,restore,get,put}=await import('../site/store.js');
const {library,importGames}=await import('../site/coach.js');
for(const c of library)assert.ok(new Chess(c.fen).move(c.move));
const row={id:'fixture',variant:'standard',status:'mate',moves:'f3 e5 g4 Qh4#',players:{white:{user:{name:'example'}},black:{user:{name:'opponent'}}},speed:'blitz',winner:'black',lastMoveAt:0};
globalThis.fetch=async url=>{assert.equal(new URL(url).hostname,'lichess.org');return new Response(JSON.stringify(row));};
assert.equal((await importGames('lichess','example')).imported,1);
assert.equal((await importGames('lichess','example')).imported,0);
assert.equal(get('g:li-fixture').side,'w');
// A blitz-heavy history must still supply the full rapid sample.
const chessGame=(format,i)=>({url:'https://www.chess.com/game/live/'+format+i,rules:'chess',time_class:format,pgn:'[White "example"]\n[Black "opponent"]\n\n1. e4 e5 *',end_time:i+1});
const monthRequests=[];
globalThis.fetch=async url=>{
 if(url.endsWith('/archives'))return Response.json({archives:['https://api.chess.com/2025/01','https://api.chess.com/2025/02']});
 const format=url.endsWith('/02')?'blitz':'rapid';monthRequests.push(format);
 return Response.json({games:Array.from({length:105},(_,i)=>chessGame(format,i))});
};
assert.equal((await importGames('chesscom','example')).imported,200);
assert.deepEqual(monthRequests,['blitz','rapid']);
for(const format of ['blitz','rapid']){assert.ok(get('g:cc-'+format+'104'));assert.ok(get('g:cc-'+format+'5'));assert.equal(get('g:cc-'+format+'4'),undefined);}
assert.equal((await importGames('chesscom','example')).imported,0);
const exported=backup();mem.clear();restore(exported);assert.equal(get('g:li-fixture').black,'opponent');
put('settings',{minutes:25});restore(exported);assert.equal(get('settings').minutes,25);
assert.throws(()=>restore('{"bad":{}}'));
const wasm=await readFile('site/vendor/stockfish.wasm');assert.equal(createHash('sha256').update(wasm).digest('hex'),'7ca31bedd166148931a1cc84dbd8dd9cf001744e9994caf23a3c6ff4988d7086');
const html=await readFile('site/index.html','utf8');assert.ok(!/(src|href)="\/(?!\/)/.test(html));
console.log('Passed position, import, backup, project-path and engine checks.');
