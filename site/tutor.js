import {Chess} from './vendor/chess.js';
import {playUci,variation} from './engine.js';

const pieces={p:'pawn',n:'knight',b:'bishop',r:'rook',q:'queen',k:'king'};
const values={p:1,n:3,b:3,r:5,q:9,k:0};
export const uci=m=>m.from+m.to+(m.promotion||'');
const other=color=>color==='w'?'b':'w';
function balance(board,side){
 return board.board().flat().filter(Boolean).reduce((sum,p)=>sum+(p.color===side?1:-1)*values[p.type],0);
}
function trace(fen,line){
 const board=new Chess(fen),side=board.turn(),steps=[];
 for(const code of line.slice(0,8)){
  const m=playUci(board,code);
  const enemy=other(m.color),targets=board.board().flat().filter(p=>p?.color===enemy&&values[p.type]>=3&&board.attackers(p.square,m.color).includes(m.to));
  const file=m.to.charCodeAt(0)-97;
  const openFile=(m.piece==='r'||m.piece==='q')&&board.board().every(rank=>rank[file]?.type!=='p');
  const passed=m.piece==='p'&&!m.promotion&&board.board().flat().every(p=>!p||p.color!==enemy||p.type!=='p'||Math.abs(p.square.charCodeAt(0)-m.to.charCodeAt(0))>1||(m.color==='w'?p.square[1]<=m.to[1]:p.square[1]>=m.to[1]));
  const hanging=targets.filter(p=>!board.attackers(p.square,enemy).length);
  steps.push({code,m,targets,hanging,openFile,passed,delta:balance(board,side),mate:board.isCheckmate(),check:board.isCheck()});
 }
 return steps;
}
function describe(step){
 const {m,mate,check,targets,hanging,openFile,passed}=step;
 if(mate)return m.san+' delivers checkmate.';
 if(m.promotion)return m.san+' promotes to a '+pieces[m.promotion]+(check?' with check.':'.');
 if(m.captured)return m.san+' takes the '+pieces[m.captured]+' on '+(m.isEnPassant()?m.to[0]+m.from[1]:m.to)+(check?' with check.':'.');
 if(m.isKingsideCastle()||m.isQueensideCastle())return m.san+' castles, moving the king and bringing the rook into play.';
 if(targets.length&&(check||targets.length>1))return m.san+' attacks '+targets.map(p=>'the '+pieces[p.type]+' on '+p.square).join(' and ')+(check?' while checking the king.':'.');
 if(check)return m.san+' checks the king. The reply must address the check.';
 if(hanging.length)return m.san+' attacks the undefended '+pieces[hanging[0].type]+' on '+hanging[0].square+'.';
 if(passed)return m.san+' advances a passed pawn. No opposing pawn stands ahead on its file or either neighboring file.';
 if(openFile)return m.san+' puts the '+pieces[m.piece]+' on the open '+m.to[0]+'-file.';
 if(['d4','d5','e4','e5'].includes(m.to)&&m.piece==='p')return m.san+' puts a pawn in the center and controls adjacent squares on the next rank.';
 if(['n','b'].includes(m.piece)&&m.from[1]===(m.color==='w'?'1':'8'))return m.san+' develops the '+pieces[m.piece]+' from its starting rank to '+m.to+'.';
 return m.san+' moves the '+pieces[m.piece]+' to '+m.to+'.';
}
function explanation(fen,steps){
 if(!steps.length)return 'The position is already over.';
 const board=new Chess(fen),initial=balance(board,board.turn()),last=steps.at(-1);
 const delta=last.delta-initial;
 let outcome='';
 if(last.mate)outcome=' '+last.m.san+' ends the line in mate.';
 else if(Math.abs(delta)>=1)outcome=' By the end of this shown line, '+(delta>0?'your side gains ':'your side gives up ')+Math.abs(delta)+' points of material relative to the starting position.';
 return [describe(steps[0]),steps[1]&&describe(steps[1]),steps[2]&&describe(steps[2])].filter(Boolean).join(' ')+outcome;
}
const expected=cp=>1/(1+Math.exp(-cp/360));
function verdict(best,actual,matched,second,sacrifice){
 const loss=Math.max(0,expected(best)-expected(actual));
 if(matched){
  const only=second!==undefined&&expected(best)-expected(second)>=0.16;
  if(only&&sacrifice&&best>=120)return 'Brilliant sacrifice';
  return only?'Critical move':'Best move';
 }
 if(best>=99000&&actual<99000&&loss>=0.08)return 'Missed forced mate';
 if(best>-99000&&actual<=-99000&&loss>=0.06)return 'Allows forced mate';
 if(best>=180&&actual<100&&loss>=0.13)return 'Missed winning chance';
 if(best>=-55&&actual<=-150&&loss>=0.13)return 'Blunder';
 if(loss>=0.22)return 'Blunder';
 if(loss>=0.12)return 'Mistake';
 if(loss>=0.055)return 'Inaccuracy';
 if(loss>=0.025)return 'Good move';
 return 'Excellent move';
}
export async function reviewMove(engine,move,nodes=85000,findAlternative=false){
 const position=new Chess(move.before),code=uci(move),first=await engine.search(move.before,nodes);
 if(!first.best)throw Error('There are no legal moves to review in this position.');
 const reply=await engine.search(move.after,nodes);
 // Compare the engine’s unrestricted search with the score after the actual move.
 const matched=first.best===code,actual=matched?first.score:-reply.score;
 const choices=findAlternative&&matched?position.moves({verbose:true}).map(uci).filter(m=>m!==code):[];
 const second=choices.length?(await engine.search(move.before,nodes,{only:choices.join(' ')})).score:undefined;
 const bestLine=first.pv[0]===first.best?first.pv:[first.best];
 const playedLine=[code,...reply.pv];
 const bestSteps=trace(move.before,bestLine),playedSteps=trace(move.before,playedLine);
 const initial=balance(position,move.color);
 const sacrifice=bestSteps[1]?.m.to===bestSteps[0].m.to&&bestSteps[1].delta<=initial-2&&bestSteps[1].m.captured&&values[bestSteps[1].m.captured]>=3;
 const danger=playedSteps[1];
 let thinking='Compare two candidates. For each one, find the opponent’s most forcing reply and judge the resulting position.';
 if(position.isCheck()||danger?.check)thinking='Start with king safety. List legal responses to a check, then test whether the opponent can check again or force mate.';
 else if(danger?.m.captured)thinking='Before committing, scan every enemy capture. Ask what your move leaves undefended, and follow the exchanges until the position settles.';
 else if(bestSteps[0].check||bestSteps[0].m.captured)thinking='List your checks and captures first. For each candidate, calculate the opponent’s best defense before judging the payoff.';
 else if(position.board().flat().filter(Boolean).length<=10)thinking='Compare king activity and passed pawns. Count the moves each side needs to promote before committing to a pawn move.';
 else if(bestSteps[0].openFile)thinking='Compare the open files. Look for a rook entry square you can reach before the opponent contests the file.';
 else if(bestSteps[0].m.piece==='p')thinking='Compare your pawn breaks. Calculate captures on both sides of the break and check which files or diagonals open.';
 const label=verdict(first.score,actual,matched,second,sacrifice);
 const summary=label==='Missed winning chance'?'The best line keeps a clear advantage. After your move the opponent has a stronger defense.':label==='Allows forced mate'?'The opponent can force checkmate after your move. Play through their checks to see how the escape squares disappear.':label==='Brilliant sacrifice'?'The engine prefers giving up material here. Follow the best line to see the compensation.':label==='Critical move'?'The strongest alternative gives up a substantial part of the position’s value.':choices.length===0&&findAlternative&&matched?'This was the only legal move.':'';
 const evaluation=n=>n>=99000?'Forced mate for your side':n<=-99000?'Forced mate against your side':(n>=0?'+':'')+(n/100).toFixed(2);
 return {label,summary,thinking,fen:move.before,bestNotes:bestSteps.map(describe),playedNotes:playedSteps.map(describe),played:explanation(move.before,playedSteps),best:explanation(move.before,bestSteps),
 playedLine:playedSteps.map(s=>s.code),bestLine:bestSteps.map(s=>s.code),playedSan:variation(move.before,playedLine.slice(0,8)),bestSan:variation(move.before,bestLine.slice(0,8)),
 comparison:'Engine evaluation after your move '+evaluation(actual)+' · best line '+evaluation(first.score)};
}
