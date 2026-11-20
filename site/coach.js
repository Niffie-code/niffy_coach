import {Chess} from './vendor/chess.js';
import {analyst,variation} from './engine.js';
import {get,list,put} from './store.js';
export const subjects=['Openings','Tactics','Middlegames','Endgames'];
function position(moves){const b=new Chess();for(const m of moves.split(' '))b.move(m);return b.fen();}
const italian=position('e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6');
const queens=position('d4 d5 c4 e6 Nc3 Nf6 Bg5 Be7 e3');
export const library=[
 {id:'fork',topic:'Tactics',title:'Calculate the knight fork',fen:'6k1/3q1p1p/6p1/8/4N3/8/5PPP/6K1 w - - 0 1',goal:'Look for a forcing move. Before touching the knight, calculate where the king can go and what you take next.',move:'Nf6+',idea:'From f6 the knight checks the king and attacks the queen on d7. After the king moves, collect the queen.',plies:3},
 {id:'backrank',topic:'Tactics',title:'Read the back rank',fen:'6k1/5ppp/8/8/8/8/5PPP/4R1K1 w - - 0 1',goal:'Check every escape square before committing to a rook check.',move:'Re8#',idea:'The rook controls the back rank and Black’s own pawns block the king’s flight squares.'},
 {id:'italian',topic:'Openings',title:'Challenge the Italian center',fen:italian,goal:'You prepared c3. Choose how to challenge e5 and anticipate the reply.',move:'d4',idea:'The d-pawn attacks the bishop on c5 and challenges e5. If Black exchanges on d4, c3 supports recapture.'},
 {id:'qgd',topic:'Openings',title:'Settle the king in the Queen’s Gambit',fen:queens,goal:'Your minor pieces are ready. Choose a move that improves king safety before deciding how to resolve the center.',move:'O-O',idea:'Castling connects the king to its pawn shield and gives the rook access to the center.'},
 {id:'break',topic:'Middlegames',title:'Choose a central break',fen:position('e4 e6 d4 d5 e5 c5 c3 Nc6 Nf3'),goal:'Compare attacking the base of the pawn chain with an immediate kingside pawn push. Which area offers Black a target?',move:'Qb6',idea:'The queen on b6 adds pressure to d4 and also eyes b2. Compare White’s replies before exchanging on d4.'},
 {id:'file',topic:'Middlegames',title:'Give the rook an entry square',fen:'6k1/5ppp/p7/1p6/8/P7/1P3PPP/3R2K1 w - - 0 1',goal:'Compare taking space with a pawn to occupying the seventh rank. Where can the rook attack two weaknesses?',move:'Rd7',idea:'From d7 the rook attacks f7 and can switch to the queenside along the seventh rank.'},
 {id:'king',topic:'Endgames',title:'Escort the passed pawn',fen:'8/4k3/8/3K4/3P4/8/8/8 w - - 0 1',goal:'Compare advancing the pawn immediately with taking a square in front of it. Calculate where the defending king can oppose yours.',move:'Kc6',idea:'Kc6 takes a key square two ranks ahead of the d4-pawn. Keep the king ahead of the passer and use the pawn’s spare tempo when you need the opposition.'},
 {id:'outside',topic:'Endgames',title:'Count the pawn race',fen:'8/P6k/8/8/8/8/6p1/6K1 w - - 0 1',goal:'Count promotion tempos and check whether the opposing passer can advance.',move:'a8=Q',idea:'Promotion wins time because your king already blockades g1. Check the new queen’s line before moving the king.'},
 {id:'cutoff',topic:'Endgames',title:'Finish the rook ending',fen:'7k/8/6K1/8/8/8/8/R7 w - - 0 1',goal:'The black king is confined to the edge. Find the rook move that completes the net.',move:'Ra8#',idea:'Your king covers h7 and g7. The rook controls the entire eighth rank.'}
];
export const games=()=>list('g:').sort((a,b)=>b.date-a.date);
export const attempts=()=>list('a:');
export const personal=()=>list('d:');
export const settings=()=>({minutes:25,start:new Date().toLocaleDateString('en-CA'),format:'blitz',...(get('settings')||{})});
export function cards(){return [...personal(),...library];}
export function ranked(topic,format){
 const all=attempts(),prefs=settings();
 return cards().filter(c=>(!topic||topic===c.topic)&&(!c.game||get('g:'+c.game)?.format===format)&&(!c.rep||prefs.excluded?.includes(c.rep)!==true)).map(c=>{
 const tries=all.filter(a=>a.card===c.id&&a.format===format).sort((a,b)=>b.time-a.time),last=tries[0];
 const recent=all.filter(a=>a.format===format&&a.topic===c.topic&&Date.now()-a.time<7*864e5).slice(-12);
 const weakness=recent.filter(a=>!a.pass).length/Math.max(1,recent.length);
 const related=new Set(personal().filter(x=>x.topic===c.topic&&x.loss&&get('g:'+x.game)?.format===format).map(x=>x.game)).size;
 const age=last?(Date.now()-last.time)/864e5:99;
 const score=Math.min(3,related)*0.8+(c.game?2:0)+(c.loss?Math.min(3,c.loss/140):0)+weakness*3+(last?(last.pass?-6:age>.25?7:1):-0.1)+(age<.01?-12:0)+(c.game&&Date.now()-(get('g:'+c.game)?.date||0)<7*864e5?2:0);
 return {c,score};}).sort((a,b)=>b.score-a.score).map(x=>x.c);
}
export function lineKey(g){const b=new Chess();b.loadPgn(g.pgn);return g.side+' · '+b.history().slice(0,6).join(' ');}
function pack(id,pgn,name,format,date,opening,side){
 const b=new Chess();b.loadPgn(pgn);if(!b.history().length)return null;
 return {id,pgn,side:side||((b.getHeaders().White||'').toLowerCase()===name.toLowerCase()?'w':'b'),format,date,opening:opening||'',white:b.getHeaders().White||'White',black:b.getHeaders().Black||'Black',result:b.getHeaders().Result||'*'};
}
export async function importGames(site,name){
 const req=async(month='')=>{const user=encodeURIComponent(name.trim()); const url=site==='lichess'?'https://lichess.org/api/games/user/'+user+'?max=30&perfType=blitz,rapid&moves=true&opening=true&clocks=false':'https://api.chess.com/pub/player/'+user.toLowerCase()+'/games/'+(month||'archives');const res=await fetch(url,{headers:{Accept:site==='lichess'?'application/x-ndjson':'application/json'}});if(!res.ok)throw Error(res.status===429?'Game provider rate limit. Retry in a minute.':'Could not read that account. Check the username and retry.');return res;};
 let imported=0,found=0;
 function add(g){if(g){found++;if(!get('g:'+g.id)){put('g:'+g.id,g);imported++;}}}
 if(site==='lichess'){
 const raw=await (await req()).text();
 for(const line of raw.trim().split('\n').filter(Boolean)){const r=JSON.parse(line);if(r.variant!=='standard'||['started','created','aborted'].includes(r.status)||!r.moves)continue;
 const b=new Chess();for(const m of r.moves.split(' '))b.move(m);
 const white=r.players.white.user?.name||'White',black=r.players.black.user?.name||'Black';b.header('White',white,'Black',black,'Result',r.winner?(r.winner==='white'?'1-0':'0-1'):'1/2-1/2');add(pack('li-'+r.id,b.pgn(),name,r.speed,r.lastMoveAt,r.opening?.name));}
 }else{
 const archives=(await (await req()).json()).archives||[];
 for(const url of archives.reverse()){const month=url.match(/\d{4}\/\d{2}$/)?.[0];if(!month)continue;
 const rows=(await (await req(month)).json()).games||[];
 for(const r of rows.reverse()){if(r.rules!=='chess'||!['rapid','blitz'].includes(r.time_class)||!r.pgn)continue;
 add(pack('cc-'+r.url.split('/').pop(),r.pgn,name,r.time_class,r.end_time*1000,r.eco?.split('/').pop()?.replaceAll('-',' ')));if(found>=30)break;}if(found>=30)break;}
 }return {found,imported};
}
function classify(fen,ply){const men=fen.split(' ')[0].replace(/[^a-z]/gi,'').length;return men<=10?'Endgames':ply<16?'Openings':'Middlegames';}
export async function analyze(g,onProgress=()=>{}){
 const board=new Chess();board.loadPgn(g.pgn);const moves=board.history({verbose:true}),result=[];
 for(const [i,m] of moves.entries()){
 if(m.color!==g.side)continue;onProgress(i+1,moves.length);
 const best=await analyst.search(m.before,4500),played=m.from+m.to+(m.promotion||'');
 if(best.best===played)continue;
 const reply=await analyst.search(m.after,4500),loss=best.score+reply.score;
 if(loss<110)continue;
 const deeper=await analyst.search(m.before,22000),after=await analyst.search(m.after,22000),confirmed=deeper.score+after.score;
 if(confirmed<110||deeper.best===played)continue;
 const phase=classify(m.before,i),b=new Chess(m.before),bestSan=variation(m.before,[deeper.best]);
 const tactical=!!(b.isCheck()||/[x+#]/.test(bestSan)||/[x+#]/.test(variation(m.after,after.pv.slice(0,1))));
 const topic=tactical&&phase!=='Openings'?'Tactics':phase;
 result.push({id:g.id+'-'+i,game:g.id,fen:m.before,side:g.side,topic,title:'Revisit move '+m.before.split(' ').pop()+' against '+(g.side==='w'?g.black:g.white),goal:'Find a candidate and calculate the opponent’s strongest response.',idea:'In the game you played '+m.san+'. Compare the reply '+variation(m.after,after.pv.slice(0,3))+' with '+variation(m.before,deeper.pv.slice(0,4))+'.',move:bestSan,plies:topic==='Tactics'?3:1,loss:confirmed,ply:i,rep:phase==='Openings'?lineKey(g):null});
 }
 const selected=[...new Map([result[0],...result.sort((a,b)=>b.loss-a.loss).slice(0,3)].filter(Boolean).map(x=>[x.id,x])).values()];
 for(const c of selected)put('d:'+c.id,c);
 if(moves.length>=6){const m=moves.filter(m=>m.color===g.side)[2];const b=new Chess(m.before),s=await analyst.search(m.before,16000);put('d:'+g.id+'-rep',{id:g.id+'-rep',game:g.id,topic:'Openings',title:g.opening||'Your opening repertoire',fen:m.before,move:variation(b.fen(),[s.best]),rep:lineKey(g),goal:'Recall your move, then check how the opponent can challenge it.',idea:'You played '+m.san+' here. Compare that choice with the engine continuation '+variation(m.before,s.pv.slice(0,4))+'.'});}
 put('g:'+g.id,{...g,analyzed:true,critical:selected[0]?.id});
}
