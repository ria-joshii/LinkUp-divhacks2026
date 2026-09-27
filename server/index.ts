import { resolve } from 'node:path';
import { networkInterfaces } from 'node:os';
import { Spectrum } from 'spectrum-ts';
import { imessage } from 'spectrum-ts/providers/imessage';
import { Engine, toPhone, type Send } from './engine';
import { SerialQueue, Store } from './store';
import { createApi } from './http';
import { extractMessage } from './gemini';
import { deliver, unwrapContent } from './transport';
import type { Snapshot } from '../shared/types';

const store=new Store(resolve(process.env.DATA_FILE||'server/data/demo.json'));
const engine=new Engine(store);
const queue=new SerialQueue();
const mode=process.env.PHOTON_MODE==='console'?'console':'photon';
const status:Snapshot['services']={photon:false,gemini:!!process.env.GEMINI_API_KEY?.trim(),transport:mode,polls:process.env.PHOTON_POLLS==='text'?'text':'native',message:'Photon is connecting…'};
let send:Send|null=null;
const flush=async(retry=false)=>{if(send)await engine.flush(send,retry);};
const server=createApi(engine,queue,()=>({...status}),flush);
const port=Number(process.env.PORT||8787);
server.on('error',(error:NodeJS.ErrnoException)=>{console.error(error.code==='EADDRINUSE'?`Port ${port} is already in use. Stop the old backend terminal, then run npm run server again.`:error.message);process.exit(1);});
server.listen(port,'0.0.0.0',()=>{
  console.log(`LinkUp backend: http://localhost:${port}/health`);
  try{for(const list of Object.values(networkInterfaces()))for(const n of list||[])if(n.family==='IPv4'&&!n.internal)console.log(`Phone health check: http://${n.address}:${port}/health`);}
  catch{console.log(`Phone health check: http://YOUR_LAPTOP_WIFI_IP:${port}/health`);}
  console.log('Demo: two people, Photon activity polls, Gemini planner. Keep this terminal open.');
});

if(mode==='console'){
  status.photon=true;status.message='Rehearsal mode: outbound texts appear in this terminal only.';
  send=async(phone,text)=>{console.log(`[CONSOLE ONLY …${phone.slice(-4)}] ${text}`);return {mode:'text'};};
}else{
  const projectId=process.env.PROJECT_ID?.trim()||process.env.SPECTRUM_PROJECT_ID?.trim();
  const projectSecret=process.env.PROJECT_SECRET?.trim()||process.env.SPECTRUM_PROJECT_SECRET?.trim();
  if(!projectId||!projectSecret){status.message='Add PROJECT_ID and PROJECT_SECRET to .env, then restart npm run server.';console.error(status.message);}
  else void (async()=>{
    try{
      const app=await Spectrum({projectId,projectSecret,providers:[imessage.config()]});
      const im=imessage(app);
      send=async(phone,text,ballot)=>{
        try{const chat=await im.space.create(await im.user(phone));return await deliver(chat,text,ballot,status.polls==='text');}
        catch(error){
          const message=error instanceof Error?error.message:'';
          console.error(`Photon delivery failed for …${phone.slice(-4)}:`,message.replace(/\+?\d{10,15}/g,'[phone]'));
          throw new Error(/not allowed/i.test(message)?'Add both demo numbers as project users in the Photon dashboard, then tap Retry texts.':'Photon could not send this text. Check its dashboard and your backend terminal, then retry.');
        }
      };
      status.photon=true;status.message='Photon connected';
      console.log('Photon connected. Gemini:',status.gemini?'configured':'GEMINI_API_KEY missing');
      await queue.run(()=>flush());
      for await(const [space,message] of app.messages){
        if(message.platform!=='imessage'||message.direction!=='inbound'||!message.sender?.id)continue;
        // The demo uses private DMs. Never ingest a group thread as one person's answer.
        if(imessage(space).type!=='dm')continue;
        let phone:string;try{phone=toPhone(message.sender.id);}catch{continue;}
        const content=unwrapContent(message.content);
        await queue.run(async()=>{
          if(content.type==='poll_option')engine.receiveVote(message.id,phone,content.poll.title,content.option.title,content.selected);
          else if(content.type==='text')await engine.receive(message.id,phone,content.text,(text,id,match)=>extractMessage(text,id,match,engine.state.users.find(u=>u.id===id)!,engine.state.history[id]||[]));
          await flush();
        });
      }
      status.photon=false;status.message='Photon disconnected. Restart the backend to reconnect.';
    }catch(error){status.photon=false;status.message='Photon could not connect. Verify PROJECT_ID / PROJECT_SECRET and restart the backend.';console.error(status.message,error instanceof Error?error.message:'');}
  })();
}
