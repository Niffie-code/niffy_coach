import {Chess} from './vendor/chess.js';
import {trainer,variation,playUci,sound} from './engine.js';
import {put,get,list,sync} from './store.js';
import {subjects,library,games,attempts,personal,settings,cards,ranked,lineKey,importGames,analyze} from './coach.js';
import {accounts,checkedAt,link,unlink,startAccounts} from './linked-accounts.js';
import {startCloud} from './cloud.js';
const $=s=>document.querySelector(s),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let page='',topic='',card,board,orientation='w',selected,lastMove,flight=0,busy=false,stage=0,answers=[],report='',complete=false,usedHint=false,playout=false,run=null,notice='',analysisText='',processing=false,importing=false,paused=false,diagnostic=false;
const chosen=()=>settings().format;
function pref(patch){put('settings',{...settings(),...patch});}
function startCard(c){if(!c)return;flight++;busy=false;card=c;board=new Chess(c.fen);orientation=board.turn();selected=lastMove=null;answers=[];report='';usedHint=false;complete=playout=false;stage=0;}
function next(){const pool=ranked(topic,chosen());startCard(pool.find(c=>c.id!==card?.id)||pool[0]);draw();}
function scoreAttempt(pass){put('a:'+crypto.randomUUID(),{card:card.id,topic:card.topic,format:chosen(),time:Date.now(),pass:pass&&!usedHint,stages:answers.map(a=>a.good)});}
function setHeading(k,t,s){$('#eyebrow').textContent=k;$('#title').textContent=t;$('#subtitle').textContent=s;}
const option=(v,label,sel)=>'<option value="'+esc(v)+'" '+(v===sel?'selected':'')+'>'+esc(label)+'</option>';
function boardHTML(label,detail){let files='abcdefgh'.split(''),ranks=[8,7,6,5,4,3,2,1];if(orientation==='b'){files.reverse();ranks.reverse();}
 const targets=selected?board.moves({square:selected,verbose:true}).map(m=>m.to):[];
 return '<section class="boardwrap"><div class="boardhead"><b>'+esc(label)+'</b><span>'+esc(detail)+'</span></div><div class="board" role="group" aria-label="Chessboard">'+ranks.flatMap((r,i)=>files.map((f,j)=>{const sq=f+r,p=board.get(sq),name=p?({w:'White',b:'Black'}[p.color]+' '+({k:'king',q:'queen',r:'rook',b:'bishop',n:'knight',p:'pawn'}[p.type])):'empty';return '<button class="sq '+((i+j)%2?'dark ':'')+(sq===selected?'active ':'')+(sq===lastMove?'last ':'')+(targets.includes(sq)?'legal':'')+'" data-square="'+sq+'" aria-label="'+sq+' '+name+'">'+(j===0?'<span>'+r+'</span>':'')+(p?'<img alt="" src="./vendor/'+p.color+p.type.toUpperCase()+'.svg">':'')+(i===7?'<i>'+f+'</i>':'')+'</button>'; })).join('')+'</div><p class="boardfoot">Select a piece, then its destination.</p></section>';}
function button(action,label,primary=false){return '<button data-action="'+action+'" class="'+(primary?'primary':'')+'">'+esc(label)+'</button>';}
function tabs(){return '<div class="tabs" aria-label="Study topic">'+['',...subjects].map(t=>'<button data-topic="'+t+'" class="'+(t===topic?'chosen':'')+'">'+(t||'For you')+'</button>').join('')+'</div>';}
function study(){
 if(!card)startCard(ranked(topic,chosen())[0]);
 setHeading('Training room','Position study','Calculate on the board, test your idea, then revisit what you missed.');
 const g=card.game&&get('g:'+card.game);
 return tabs()+'<div class="layout">'+boardHTML(playout?'Play the position':card.topic,board.turn()==='w'?'White to move':'Black to move')+'<div><article class="panel"><small>'+esc(diagnostic?'Diagnostic · '+(subjects.indexOf(card.topic)+1)+' of 4':(g?g.format+' · Your game':'Benchmark position'))+'</small><h2>'+esc(card.title)+'</h2><p>'+esc(card.goal)+'</p>'+(g?'<p class="mini muted">'+esc(g.white+' vs '+g.black+' · '+new Date(g.date).toLocaleDateString())+'</p>':'')+'<div role="status">'+(report?'<p class="feedback">'+esc(report)+'</p>':'')+(busy?'<p>Checking the position…</p>':'')+'</div>'+
 (complete?'<p>'+esc(card.idea)+'</p><div class="row">'+button('next',diagnostic?'Continue diagnostic':'Next position',true)+button('retry','Retry')+button('playout','Play from here')+'</div>':playout?button('retry','Restart study'):('<p><strong>'+['Choose your candidate move.','Predict the opponent’s best reply.','Play your continuation.'][stage]+'</strong></p><div class="row">'+button('hint','Show hint')+button('retry','Reset position')+'</div>'))+
 '</article><div class="card"><small>Training focus</small><div class="row"><label>Time control<select id="format">'+option('blitz','5-minute blitz',chosen())+option('rapid','10-minute rapid',chosen())+'</select></label>'+button('diagnostic','Four-position diagnostic')+'</div>'+(!personal().length?'<p class="mini"><a href="#games"><u>Import your games</u></a> to train on your own decisions.</p>':'')+'</div></div></div>';
}
async function submitMove(m){
 if(page==='practice'){settleClock();if(!run.active){draw();return;}}
 const id=flight;const before=board.fen();board.move(m);selected=null;lastMove=m.to;
 if(page==='practice'){run.times[run.side]+=run.inc*1000;advancePractice();return;}
 busy=true;draw();
 try{
 if(playout){if(!board.isGameOver()){const e=await trainer.search(board.fen(),15000);if(id!==flight)return;playUci(board,e.best);}report=board.isGameOver()?'Position complete.':'Continue against the engine.';return;}
 const best=await trainer.search(before,32000),played=m.from+m.to+(m.promotion||''),after=await trainer.search(board.fen(),32000);if(id!==flight)return;
 const constrained=played===best.best?best:await trainer.search(before,32000,{only:played});if(id!==flight)return;
 const good=played===best.best||sound(best.score,Math.min(constrained.score,-after.score));
 answers.push({good,move:m.san,best:variation(before,best.pv.slice(0,3))});
 if(stage+1<(card.plies||1)&&!board.isGameOver()){stage++;report='';}
 else{complete=true;const passed=answers.every(a=>a.good);scoreAttempt(passed);report=answers.map((a,i)=>['Candidate','Reply','Continuation'][i]+' '+a.move+' — '+(a.good?'sound':'compare '+a.best)).join('. ')+'.';}
 }catch(e){if(id===flight){board.undo();report=e.message;}}finally{if(id===flight){busy=false;draw();}}
}
function clickSquare(sq){
 if(busy||(page==='study'&&(complete||board.isGameOver()))||(page==='practice'&&(!run?.active||board.turn()!==run.side)))return;
 const piece=board.get(sq);
 if(selected){const choices=board.moves({square:selected,verbose:true}).filter(m=>m.to===sq);if(choices.length){let m=choices[0];if(choices.length>1){const choice=prompt('Promote to q, r, b, or n','q');m=choices.find(x=>x.promotion===choice?.toLowerCase());if(!m)return;}void submitMove(m);return;}}
 selected=piece?.color===board.turn()&&selected!==sq?sq:null;draw();
}
let accountStatus='';
function gamesPage(){
 setHeading('Game library','Your games','Import completed games and turn critical decisions into positions you can replay.');
 const gs=games(),lines=[...new Set(gs.filter(g=>g.pgn).map(lineKey))];
 return '<div class="panel"><h2>Linked Lichess accounts</h2><p>Add each username once to analyze up to 100 recent rapid games and 100 recent blitz games. New games are checked while the coach is open.</p><form id="link-lichess" class="row"><label>Lichess username<input required name="handle" minlength="2" maxlength="30" autocomplete="off"></label><button class="primary">Add username</button></form>'+accounts().map(a=>'<div class="listitem">'+esc(a.name)+(checkedAt(a.name)?' · Checked '+esc(new Date(checkedAt(a.name)).toLocaleString()):'')+' <button data-unlink="'+esc(a.name)+'">Remove</button></div>').join('')+'<p id="account-status" role="status">'+esc(accountStatus)+'</p></div><div class="cols"><div class="panel"><h2>Import games</h2><form id="import"><div class="row"><label>Platform<select name="site">'+option('chesscom','Chess.com',settings().site)+option('lichess','Lichess',settings().site)+'</select></label><label>Username<input type="text" name="username" required pattern="[A-Za-z0-9_-]{1,40}" value="'+esc(settings().username||'')+'"></label></div><p><button class="primary" '+(importing?'disabled':'')+'>'+(importing?'Importing…':'Import recent games')+'</button></p></form><p role="status">'+esc(notice)+'</p></div><div class="panel"><h2>Your repertoire</h2><p class="mini">Select the lines you want to keep in opening practice.</p>'+lines.map(l=>'<label style="display:block"><input type="checkbox" data-rep="'+esc(l)+'" '+(!settings().excluded?.includes(l)?'checked':'')+'> '+esc(l)+'</label>').join('')+(!lines.length?'<p class="muted">Your lines will appear after your first game.</p>':'')+'</div></div><div class="panel"><h2>Completed games</h2><p>'+['rapid','blitz'].map(format=>{const group=gs.filter(g=>g.format===format);return format+' · '+group.filter(g=>g.analyzed).length+' of '+group.length+' analyzed';}).join(' &nbsp; | &nbsp; ')+'</p><p id="analysis" role="status">'+esc(analysisText)+'</p>'+(!gs.length?'<p>Start with an online import or <a href="#practice"><u>play a timed game</u></a>.</p>':'')+gs.map(g=>'<div class="listitem"><strong>'+esc(g.white+' vs '+g.black)+'</strong><div class="mini">'+esc(g.format+' · '+new Date(g.date).toLocaleDateString()+' · '+g.result)+'</div>'+(g.critical?'<button data-card="'+esc(g.critical)+'">Review first critical decision</button>':g.analyzed?'Analysis complete':'Queued for analysis')+' <button data-replay="'+esc(g.id)+'">Replay game</button></div>').join('')+'</div>';
}
async function work(){if(processing||paused||run?.active)return;processing=true;try{while(!run?.active&&!paused){const g=games().find(game=>!game.analyzed);if(!g)break;await analyze(g,(i,n)=>{analysisText='Analyzing '+g.white+' vs '+g.black+' · ply '+i+' of '+n;if($('#analysis'))$('#analysis').textContent=analysisText;});if(page==='games')draw();}analysisText='';}catch(e){analysisText=e.message+' Open Games to retry.';}finally{processing=false;if(page==='games')draw();}}
let replay=null,replayIndex=0;
function replayPage(){const b=new Chess();b.loadPgn(replay.pgn);const history=b.history({verbose:true});board=new Chess(replayIndex?history[replayIndex-1].after:history[0].before);orientation=replay.side;selected=null;lastMove=history[replayIndex-1]?.to;setHeading('Game review',replay.white+' vs '+replay.black,'Replay the game and jump to decisions selected by the coach.');return '<div class="layout">'+boardHTML('Game replay','Ply '+replayIndex+' / '+history.length)+'<div class="panel"><h2>Move list</h2><div class="row">'+button('back','Previous')+button('forward','Next')+button('close','Game library')+'</div><p>'+history.map((m,i)=>'<button data-ply="'+(i+1)+'">'+(m.color==='w'?m.before.split(' ').pop()+'. ':'')+esc(m.san)+'</button>').join(' ')+'</p>'+personal().filter(c=>c.game===replay.id).map(c=>'<p><button data-card="'+c.id+'">'+esc(c.title)+'</button></p>').join('')+'</div></div>';}
function dayOfCamp(){const start=new Date(settings().start+'T00:00:00');return Math.max(1,Math.min(7,1+Math.round((new Date(new Date().toDateString())-start)/86400000)))||1;}
function openingRecall(){
 const records=attempts().sort((a,b)=>b.time-a.time),lines=new Map();
 for(const c of personal().filter(c=>c.rep&&!settings().excluded?.includes(c.rep))){
 const entry=lines.get(c.rep)||{cards:[],status:[]};entry.cards.push(c);entry.status.push(records.find(a=>a.card===c.id)?.pass);lines.set(c.rep,entry);}
 if(!lines.size)return '';
 return '<div class="panel"><h2>Opening recall</h2>'+[...lines].map(([line,entry])=>{const idx=entry.status.findIndex(x=>x!==true),c=entry.cards[idx<0?0:idx];return '<div class="listitem"><b>'+esc(line)+'</b><p>'+entry.status.filter(Boolean).length+' of '+entry.cards.length+' positions recalled unaided.</p><button data-card="'+esc(c.id)+'">Review line</button></div>';}).join('')+'</div>';
}
function weekPage(){
 const cfg=settings(),day=dayOfCamp();
 const plan=['Confirm your opening lines and try one diagnostic position in each subject.','Retry a missed position, then play a blitz game.','Calculate a rapid position and play its strongest reply.','Refresh your most common opening and play a blitz game.','Revisit a middlegame plan and convert an ending in rapid.','Play one blitz and one rapid game without hints. Review the first critical decision in each.','Recall your confirmed lines and retry the positions you missed.'];
 setHeading('Competition preparation','Tournament week','Your schedule and unaided results across both time controls.');
 return '<div class="cols"><div class="panel"><small>Day '+day+' of 7</small><h2>Today’s session</h2><p>'+plan[day-1]+'</p><label>Daily time budget (minutes)<input type="number" id="minutes" min="5" max="240" value="'+cfg.minutes+'"></label><p class="mini">'+Math.round(cfg.minutes*.4)+' min review · '+(cfg.minutes-Math.round(cfg.minutes*.4))+' min calculation or practice</p>'+button('daily','Begin today’s study',true)+'</div><div class="panel"><h2>Recall by format</h2>'+['blitz','rapid'].map(f=>'<h3>'+f+'</h3>'+subjects.map(t=>{const a=attempts().filter(a=>a.topic===t&&a.format===f);return '<div>'+t+' · '+a.filter(a=>a.pass).length+'/'+a.length+' unaided</div>';}).join('')).join('')+'</div></div>'+openingRecall()+'<div class="panel"><h2>Seven-day schedule</h2>'+plan.map((s,i)=>'<div class="listitem"><b>Day '+(i+1)+'</b> · '+s+'</div>').join('')+'</div>';
}
function elapsed(){return run?.active?Math.max(0,Date.now()-run.since):0;}
function clock(color){const n=Math.max(0,Math.ceil(((run?.times[color]||0)-(run?.clockSide===color?elapsed():0))/1000));return Math.floor(n/60)+':'+String(n%60).padStart(2,'0');}
function settleClock(){if(!run?.active)return;const c=run.clockSide;run.times[c]-=elapsed();run.since=Date.now();if(run.times[c]<=0)finish(c==='w'?'0-1':'1-0','Time expired');}
function finish(result,why){if(!run?.active)return;run.active=false;run.message=why+' · '+result;board.header('White',run.side==='w'?'You':'niffy_coach','Black',run.side==='b'?'You':'niffy_coach','Result',result);if(board.history().length)put('g:'+run.id,{id:run.id,date:Date.now(),pgn:board.pgn(),white:board.getHeaders().White,black:board.getHeaders().Black,side:run.side,format:run.format,result});void work();}
async function advancePractice(){if(!run?.active)return;const id=flight;
 if(board.isGameOver()){finish(board.isCheckmate()?(board.turn()==='w'?'0-1':'1-0'):'1/2-1/2',board.isCheckmate()?'Checkmate':'Draw');draw();return;}
 run.clockSide=board.turn();run.since=Date.now();draw();
 if(board.turn()!==run.side){busy=true;try{const r=await trainer.search(board.fen(),14000,{skill:run.skill});if(id!==flight||!run.active)return;settleClock();if(!run.active)return;const m=playUci(board,r.best);lastMove=m.to;run.times[m.color]+=run.inc*1000;busy=false;await advancePractice();}catch(e){if(id===flight){run.active=false;run.message=e.message;}}finally{if(id===flight){busy=false;draw();}}}
}
function practice(){if(!run){board=new Chess();orientation='w';}
 setHeading('Match room','Timed practice','Play a training game, then review the first decision that changed its course.');
 const controls='<form id="newgame"><div class="row"><label>Clock<select name="format">'+option('blitz','5-minute blitz',chosen())+option('rapid','10-minute rapid',chosen())+'</select></label><label>Increment (seconds)<input name="inc" type="number" min="0" max="60" value="0" required></label><label>Your color<select name="side"><option value="w">White</option><option value="b">Black</option></select></label><label>Opponent<select name="skill"><option value="8">Club</option><option value="14" selected>Advanced</option><option value="20">Full strength</option></select></label></div><p><button class="primary">Start game</button></p></form>';
 return '<div class="layout">'+boardHTML('Practice board',run?.active?'Game in progress':'Training game')+'<div class="panel"><h2>'+(run?.active?'Game clock':'Set up a game')+'</h2>'+(run?'<p class="clock">White <span id="cw">'+clock('w')+'</span> · Black <span id="cb">'+clock('b')+'</span></p><p>'+esc(run.message||'')+'</p>':'')+(run?.active?button('resign','Resign game'):controls)+(run&&!run.active?'<a href="#games"><u>Review in game library</u></a>':'')+'</div></div>';
}
function draw(){const el=$('#content');el.innerHTML=page==='study'?study():page==='games'?(replay?replayPage():gamesPage()):page==='practice'?practice():weekPage();}
function route(){
 const nextPage=['games','practice','week'].includes(location.hash.slice(1))?location.hash.slice(1):'study';
 if(run?.active&&nextPage!=='practice'){if(!confirm('Resign the current practice game and leave?')){location.hash='practice';return;}finish(run.side==='w'?'0-1':'1-0','Resigned');}
 if(page===nextPage)return;flight++;busy=false;selected=null;page=nextPage;replay=null;
 if(page==='study')startCard(card||ranked(topic,chosen())[0]);if(page==='practice'){run=null;board=new Chess();}
 document.querySelectorAll('nav a').forEach(a=>{if(a.hash==='#'+page)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});draw();if(page==='games')void work();
}
function openCard(c){if(!c)return;card=c;if(page!=='study'){location.hash='study';}else{startCard(c);draw();}}
document.addEventListener('click',e=>{const el=e.target.closest('button');if(!el)return;const d=el.dataset;
 if(d.unlink){unlink(d.unlink);draw();return;}
 if(d.square){if(page==='study'||page==='practice')clickSquare(d.square);return;}
 if(d.topic!==undefined){topic=d.topic;diagnostic=false;startCard(ranked(topic,chosen())[0]);draw();return;}
 if(d.card){diagnostic=false;topic='';openCard(cards().find(c=>c.id===d.card));return;}
 if(d.replay){replay=get('g:'+d.replay);replayIndex=0;draw();return;}
 if(d.ply){replayIndex=Number(d.ply);draw();return;}
 switch(d.action){
 case 'next':if(diagnostic){const i=subjects.indexOf(card.topic)+1;if(i<4){startCard(library.find(c=>c.topic===subjects[i]));draw();break;}diagnostic=false;location.hash='week';}else next();break;
 case 'retry':startCard(card);draw();break;
 case 'hint':usedHint=true;report='Study the idea: '+card.idea;draw();break;
 case 'playout':startCard(card);playout=true;report='Play your side against the engine.';draw();break;
 case 'diagnostic':diagnostic=true;topic='';openCard(library.find(c=>c.topic===subjects[0]));break;
 case 'daily':{
 const day=dayOfCamp();if(day===6){location.hash='practice';break;}
 diagnostic=day===1&&attempts().length===0;
 if(day>=2&&day<=5)pref({format:day%2===0?'blitz':'rapid'});
 topic=day===4||day===7?'Openings':day===5?'Endgames':'';
 const pool=ranked(topic,chosen()),history=attempts().filter(a=>a.format===chosen()).sort((a,b)=>b.time-a.time);
 const due=pool.find(c=>history.find(a=>a.card===c.id)?.pass===false);
 openCard(diagnostic?library.find(c=>c.topic===subjects[0]):due||pool[0]);break;}
 case 'resign':if(confirm('Resign this training game?')){finish(run.side==='w'?'0-1':'1-0','Resigned');draw();}break;
 case 'forward':{const b=new Chess();b.loadPgn(replay.pgn);replayIndex=Math.min(b.history().length,replayIndex+1);draw();break;}
 case 'back':replayIndex=Math.max(0,replayIndex-1);draw();break;
 case 'close':replay=null;draw();break;}
});
document.addEventListener('change',e=>{const el=e.target;if(el.id==='format'){pref({format:el.value});startCard(ranked(topic,chosen())[0]);draw();}if(el.id==='minutes'&&el.checkValidity()){pref({minutes:Number(el.value)});draw();}if(el.dataset.rep){const set=new Set(settings().excluded||[]);el.checked?set.delete(el.dataset.rep):set.add(el.dataset.rep);pref({excluded:[...set]});}});
document.addEventListener('submit',async e=>{e.preventDefault();const f=new FormData(e.target);
 if(e.target.id==='link-lichess'){
 const name=String(f.get('handle')).trim();
 try{const result=link(name);accountStatus='Checking '+name+'…';draw();await result;}catch(error){accountStatus=error.message;}
 if(page==='games')draw();return;
 }
 if(e.target.id==='import'){if(importing)return;importing=true;const site=f.get('site'),name=f.get('username').trim();pref({site,username:name});notice='Reading completed games…';draw();try{if(site==='lichess'){await link(name);notice='Linked '+name+' for automatic game updates.';}else{const r=await importGames(site,name);notice=r.imported+' new games from '+r.found+' qualifying games.';}}catch(error){notice=error.message;}finally{importing=false;draw();void work();}}
 if(e.target.id==='newgame'){const format=f.get('format'),base=(format==='blitz'?5:10)*60000;pref({format});board=new Chess();orientation=f.get('side');selected=lastMove=null;flight++;busy=false;run={id:'practice-'+crypto.randomUUID(),side:orientation,format,inc:Number(f.get('inc')),skill:Number(f.get('skill')),times:{w:base,b:base},since:Date.now(),clockSide:'w',active:true};void advancePractice();}
});
setInterval(()=>{if(page==='practice'&&run?.active){if(run.times[run.clockSide]<=elapsed()){settleClock();draw();}else{if($('#cw'))$('#cw').textContent=clock('w');if($('#cb'))$('#cb').textContent=clock('b');}}},150);
window.addEventListener('hashchange',route);
await sync();await startCloud();if(!get('settings'))pref(settings());if(!games().length&&!attempts().length){diagnostic=true;card=library.find(c=>c.topic==='Openings');}route();void work();
startAccounts(message=>{
 if(message)accountStatus=message;
 if($('#account-status'))$('#account-status').textContent=accountStatus;
},()=>{if(page==='games'&&!replay&&!document.activeElement?.closest('form'))draw();void work();});