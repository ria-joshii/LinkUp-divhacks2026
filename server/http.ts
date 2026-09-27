import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { Engine, UserError } from './engine';
import type { Snapshot, ProfileInput, ActivitySuggestion } from '../shared/types';
import { SerialQueue } from './store';

async function body(req:IncomingMessage):Promise<Record<string,unknown>>{
  const chunks:Buffer[]=[];let size=0;
  for await(const chunk of req){const b=Buffer.from(chunk);size+=b.length;if(size>16000)throw new UserError('Request too large.',413);chunks.push(b);}
  try{const value=JSON.parse(Buffer.concat(chunks).toString('utf8')||'{}');if(!value||typeof value!=='object'||Array.isArray(value))throw Error();return value;}
  catch{throw new UserError('Send a valid JSON object.');}
}
function json(res:ServerResponse,status:number,data:unknown){res.writeHead(status,{'Content-Type':'application/json','Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Authorization, Content-Type','Access-Control-Allow-Methods':'GET, POST, OPTIONS','Cache-Control':'no-store'});res.end(status===204?'':JSON.stringify(data));}

export function createApi(engine:Engine,queue:SerialQueue,services:()=>Snapshot['services'],flush:(retry:boolean)=>Promise<void>){
  return createServer(async(req,res)=>{
    try{
      if(req.method==='OPTIONS'){json(res,204,{});return;}
      const path=new URL(req.url||'/', 'http://localhost').pathname;
      if(req.method==='GET'&&path==='/health'){json(res,200,{ok:true,...services()});return;}
      if(req.method==='POST'&&path==='/session'){
        const input=await body(req);
        const result=await queue.run(()=>engine.register(String(input.name||''),String(input.phone||''),input.consent===true));
        json(res,200,result);return;
      }
      const token=req.headers.authorization?.replace(/^Bearer\s+/i,'')||'';
      const user=engine.auth(token);
      if(req.method==='GET'&&path==='/state'){json(res,200,engine.snapshot(user,services()));return;}
      if(req.method!=='POST')throw new UserError('Not found.',404);
      const input=await body(req);
      // Resolve the token again after any queued operation/reset.
      await queue.run(()=>{
        const current=engine.auth(token);
        if(path==='/me')engine.profile(current,input as unknown as ProfileInput);
        else if(path==='/swipes')engine.swipe(current,String(input.candidateId||''),input.decision as 'like'|'pass');
        else if(path==='/review')engine.review(current);
        else if(path==='/match/text'){
          const status=services();
          if(!status.photon)throw new UserError(status.message||'Photon is still connecting. Try again shortly.',503);
          engine.start();
        }else if(path==='/poll/vote'){
          engine.vote(current.id,String(input.pollId||''),String(input.optionId||''),input.selected!==false);
        }else if(path==='/match/suggest'){
          engine.suggest(current.id,input as unknown as ActivitySuggestion);
        }else if(path==='/demo/restart'){
          engine.state.match=null;engine.state.deliveries=[];engine.state.history={};
          engine.state.swipes=Object.fromEntries(engine.state.users.map(u=>[u.id,{}]));engine.store.save();
        }else throw new UserError('Not found.',404);
      });
      json(res,200,engine.snapshot(user,services()));
      if(['/match/text','/poll/vote','/match/suggest'].includes(path))void queue.run(()=>flush(true)).catch(e=>console.error('Text delivery:',e.message));
    }catch(error){
      if(error instanceof UserError)json(res,error.status,{error:error.message});
      else{console.error('API:',error instanceof Error?error.message:'Unknown error');json(res,500,{error:'The backend hit a problem. Check its terminal and try again.'});}
    }
  });
}
