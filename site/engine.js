import {Chess} from './vendor/chess.js';
export function playUci(board,uci){return board.move({from:uci.slice(0,2),to:uci.slice(2,4),promotion:uci[4]||'q'});}
export function variation(fen,line){const board=new Chess(fen),moves=[];for(const move of line){try{moves.push(playUci(board,move).san);}catch{break;}}return moves.join(' ');}
export class Engine{
 constructor(){this.queue=Promise.resolve();}
 search(fen,nodes=12000,options={}){const job=this.queue.then(()=>this.run(fen,nodes,options));this.queue=job.catch(()=>{});return job;}
 async run(fen,nodes,{skill=20,only}={}){
  const game=new Chess(fen);
  if(game.isGameOver())return {score:game.isCheckmate()?-99999:0,pv:[],best:null};
  if(!this.worker){this.worker=new Worker(new URL('./vendor/stockfish.js',import.meta.url));try{await this.command(['uci'],'uciok');}catch(e){this.reset();throw e;}}
  let score=0,pv=[];
  try{await this.command(['setoption name Skill Level value '+skill,'isready'],'readyok');
  const end=await this.command(['position fen '+fen,'go nodes '+nodes+(only?' searchmoves '+only:'')],'bestmove',line=>{
    const match=line.match(/score (cp|mate) (-?\d+).*? pv (.+)/);
    if(match){const n=Number(match[2]);score=match[1]==='cp'?n:Math.sign(n)*(100000-Math.abs(n));pv=match[3].trim().split(/\s+/);}
  });return {score,pv,best:end.split(' ')[1]};}catch(e){this.reset();throw e;}
 }
 reset(){this.worker?.terminate();this.worker=null;}
 command(commands,end,read=()=>{}){return new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>reject(Error('Engine timed out. Retry this position.')),60000);
  this.worker.onerror=()=>{clearTimeout(timer);reject(Error('Engine could not load. Refresh to retry.'));};
  this.worker.onmessage=e=>{const line=String(e.data);read(line);if(line.startsWith(end)){clearTimeout(timer);resolve(line);}};
  for(const c of commands)this.worker.postMessage(c);
 });}
}
export const trainer=new Engine(),analyst=new Engine();
export const sound=(best,played)=>best-played<=55||(best>950&&played>900);