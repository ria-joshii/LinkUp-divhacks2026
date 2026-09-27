import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import type {AddressInfo} from 'node:net';
import {Engine,optionTitle,pollTitle,type Send} from '../server/engine';
import {SerialQueue,Store} from '../server/store';
import {createApi} from '../server/http';
import {extractMessage,parseExtraction} from '../server/gemini';
import {deliver} from '../server/transport';
import {DUMMIES} from '../shared/catalog';
import {overlapOptions,validWindow} from '../server/time';
import type {Extraction,PollKind,Snapshot,Window} from '../shared/types';
import {resolveContents,type ContentInput} from 'spectrum-ts';

const now=()=>new Date('2026-09-27T16:00:00Z');
const services:Snapshot['services']={photon:true,gemini:true,transport:'photon',polls:'native',message:'Test transport'};
const send:Send=async()=>({mode:'native',messageId:'test-receipt'});
const noAI=async():Promise<Extraction>=>{throw Error('This action must not call Gemini');};
const reply=(partial:Partial<Extraction>={}):Extraction=>({windows:[],availabilityAction:'none',activityAnswer:'unknown',wantsAlternative:false,suggestion:null,pollId:'',optionId:'',concern:'',clarification:'',cancel:false,...partial});
const windowA:Window={date:'2026-09-28',start:'14:00',end:'17:00'};
const windowB:Window={date:'2026-09-28',start:'15:00',end:'18:00'};
function setup(path?:string){
  const e=new Engine(new Store(path),now);
  const a=e.auth(e.register('New Neighbor','2025550101',true).token),b=e.auth(e.register('Local Neighbor','2025550102',true).token);
  for(const u of [a,b])e.profile(u,{neighborhood:'Greenwich Village',residentType:u.id===b.id?'Local':'New to the neighborhood',interests:['Hiking','Exploring'],cuisines:[],availability:['Flexible'],profilePhoto:u.profilePhoto});
  return {e,a,b};
}
const open=(e:Engine,id:string,kind:PollKind)=>{const p=e.state.match!.polls.find(p=>p.userId===id&&p.kind===kind&&p.status==='open');assert.ok(p,`missing ${kind} poll for ${id}; stage ${e.state.match!.stage}`);return p;};
async function started(){const ctx=setup();const {e,a,b}=ctx;e.swipe(a,b.id,'like');e.swipe(b,a.id,'like');e.start();await e.flush(send);return ctx;}
async function approved(activityId='village-explore'){
  const ctx=await started(),{e,a,b}=ctx,p=open(e,b.id,'activity');
  e.vote(b.id,p.id,p.options.find(o=>o.activityId===activityId)!.id);await e.flush(send);
  const approval=open(e,a.id,'approval');e.vote(a.id,approval.id,'1');await e.flush(send);return ctx;
}
async function timing(activityId='village-explore'){
  const ctx=await approved(activityId),{e,a,b}=ctx;
  e.apply(a.id,reply({availabilityAction:'replace',windows:[windowA]}));await e.flush(send);
  e.apply(b.id,reply({availabilityAction:'replace',windows:[windowB]}));await e.flush(send);return ctx;
}
async function proposed(activityId='village-explore'){
  const ctx=await timing(activityId),{e,a,b}=ctx;
  e.vote(a.id,open(e,a.id,'time').id,'1');e.vote(b.id,open(e,b.id,'time').id,'1');await e.flush(send);return ctx;
}

test('sample swipes never match; only mutual real likes start a shared local-led match',()=>{
  const {e,a,b}=setup();for(const d of DUMMIES)e.swipe(a,d.id,'like');assert.equal(e.state.match,null);
  e.swipe(a,b.id,'like');assert.equal(e.state.match,null);e.swipe(b,a.id,'like');
  assert.equal(e.state.match!.chooserId,b.id);assert.equal(e.snapshot(a,services).match!.id,e.snapshot(b,services).match!.id);
  assert.throws(()=>e.register('Third','2025550199',true),/spots are taken/);
  const snapshot=JSON.stringify(e.snapshot(a,services));assert.ok(!snapshot.includes(b.phone)&&!snapshot.includes(b.token));
});
test('intro and activity poll delivery is idempotent; retry does not duplicate sent messages',async()=>{
  const {e,a,b}=setup();e.swipe(a,b.id,'like');e.swipe(b,a.id,'like');e.start();e.start();assert.equal(e.state.deliveries.length,3);
  const sent:string[]=[];await e.flush(async(phone,text)=>{if(phone===b.phone)throw Error('test failure');sent.push(text);});
  assert.equal(e.state.deliveries.filter(d=>d.status==='sent').length,1);
  await e.flush(async(_phone,text)=>{sent.push(text);},true);assert.equal(new Set(sent).size,3);assert.equal(sent.length,3);
});
test('native polls drive the full flow without Gemini; local choice requires newcomer approval',async()=>{
  const {e,a,b}=await started();const pick=open(e,b.id,'activity');
  assert.ok(pick.options.some(o=>o.label.includes('hike')));assert.ok(pick.options.some(o=>o.label.includes('Explore')));
  assert.throws(()=>e.vote(a.id,pick.id,'1'),/not yours/);
  const activity=pick.options.find(o=>o.activityId==='ramble-hike')!;
  e.receiveVote('pick',b.phone,pollTitle(pick),optionTitle(pick,activity),true);await e.flush(send);
  assert.equal(e.state.match!.stage,'approval');assert.equal(e.state.match!.preferences[a.id].activityAnswer,'unknown');assert.equal(e.state.match!.proposal,null);
  const approval=open(e,a.id,'approval');e.receiveVote('approve',a.phone,pollTitle(approval),optionTitle(approval,approval.options[0]),true);await e.flush(send);
  for(const user of [a,b]){const p=open(e,user.id,'availability');e.receiveVote('availability-'+user.id,user.phone,pollTitle(p),optionTitle(p,p.options[0]),true);await e.flush(send);}
  for(const user of [a,b]){const p=open(e,user.id,'time');e.receiveVote('time-'+user.id,user.phone,pollTitle(p),optionTitle(p,p.options[0]),true);await e.flush(send);}
  const proposal=e.state.match!.proposal!;assert.ok(proposal);assert.equal(proposal.end,'11:30');assert.equal(e.state.match!.status,'proposed');
  await e.receive('ca',a.phone,`CONFIRM ${proposal.version}`,noAI);assert.equal(e.state.match!.status,'proposed');
  const final=open(e,b.id,'confirmation');e.receiveVote('cb',b.phone,pollTitle(final),optionTitle(final,final.options[0]),true);
  assert.equal(e.state.match!.status,'confirmed');assert.equal(e.state.deliveries.filter(d=>d.kind==='confirmed').length,2);
  e.receiveVote('cb',b.phone,pollTitle(final),optionTitle(final,final.options[0]),true);assert.equal(e.state.deliveries.filter(d=>d.kind==='confirmed').length,2);
});
test('local can submit a concrete suggestion by text, which newcomer can reject',async()=>{
  const {e,a,b}=await started();
  await e.receive('suggest',b.phone,'SUGGEST: Bookstore hop | Washington Square Arch, NYC | 90 | outdoor',noAI);await e.flush(send);
  assert.equal(e.state.match!.activity!.name,'Bookstore hop');assert.equal(e.state.match!.activity!.suggestedBy,b.id);assert.equal(e.state.match!.proposal,null);
  assert.throws(()=>e.suggest(a.id,{name:'Art',meetingPoint:'Library',durationMinutes:60,outdoor:false}),/local leads/);
  e.vote(a.id,open(e,a.id,'approval').id,'2');assert.equal(e.state.match!.activity,null);assert.equal(e.state.match!.stage,'activity');
});
test('incomplete custom suggestions cannot become a plan',async()=>{
  const {e,b}=await started();
  assert.throws(()=>e.suggest(b.id,{name:'Hike',meetingPoint:'',durationMinutes:90,outdoor:true}),/specific public meeting point/);
  assert.equal(e.state.match!.activity,null);
});
test('custom activity duration is respected by the overlap calculation',async()=>{
  const {e,a,b}=await started();e.suggest(b.id,{name:'Museum afternoon',meetingPoint:'Museum main entrance, NYC',durationMinutes:120,outdoor:false});await e.flush(send);
  e.vote(a.id,open(e,a.id,'approval').id,'1');await e.flush(send);
  e.apply(a.id,reply({availabilityAction:'replace',windows:[windowA]}));e.apply(b.id,reply({availabilityAction:'replace',windows:[windowB]}));await e.flush(send);
  const p=open(e,a.id,'time');assert.deepEqual(p.options[0].window,{date:'2026-09-28',start:'15:00',end:'17:00'});
});
test('disagreeing time votes do not finalize a slot; either person can converge',async()=>{
  const {e,a,b}=await timing();const pa=open(e,a.id,'time'),pb=open(e,b.id,'time');
  e.vote(a.id,pa.id,'1');e.vote(b.id,pb.id,'2');assert.equal(e.state.match!.proposal,null);assert.equal(e.state.match!.stage,'time');
  assert.equal(e.state.deliveries.filter(d=>d.kind==='time-tie').length,2);
  e.vote(a.id,pa.id,'2');assert.equal(e.state.match!.proposal!.start,'15:30');assert.equal(e.state.match!.status,'proposed');
});
test('stale polls, old plan numbers, and undelivered confirmations cannot approve a plan',async()=>{
  const {e,a,b}=await proposed();const old=e.state.match!.proposal!.version,oldPoll=open(e,a.id,'confirmation');
  await e.receive('old-confirm',a.phone,`confirm ${old}`,noAI);
  e.suggest(b.id,{name:'Different walk',meetingPoint:'Pier 45 entrance',durationMinutes:60,outdoor:true});await e.flush(send);
  assert.throws(()=>e.vote(a.id,oldPoll.id,'1'),/closed/);await e.receive('stale',b.phone,`confirm ${old}`,noAI);
  assert.equal(e.state.match!.proposal,null);assert.ok(Object.values(e.state.match!.preferences).every(p=>p.confirmedVersion===null));
  e.vote(a.id,open(e,a.id,'approval').id,'1');await e.flush(send);
  e.vote(a.id,open(e,a.id,'time').id,'1');e.vote(b.id,open(e,b.id,'time').id,'1');
  assert.throws(()=>e.vote(a.id,open(e,a.id,'confirmation').id,'1'),/not been delivered/);
  assert.equal(e.state.match!.preferences[a.id].confirmedVersion,null);
});
test('a withdrawn native confirmation revokes the plan and requires fresh votes',async()=>{
  const {e,a,b}=await proposed(),pa=open(e,a.id,'confirmation');
  e.vote(a.id,pa.id,'1');e.vote(b.id,open(e,b.id,'confirmation').id,'1');await e.flush(send);
  assert.equal(e.state.match!.status,'confirmed');const old=e.state.match!.proposal!.version;
  e.receiveVote('withdraw',a.phone,pollTitle(pa),optionTitle(pa,pa.options[0]),false);await e.flush(send);
  assert.equal(e.state.match!.status,'proposed');assert.ok(e.state.match!.proposal!.version>old);assert.ok(Object.values(e.state.match!.preferences).every(p=>p.confirmedVersion===null));
  for(const user of [a,b])e.vote(user.id,open(e,user.id,'confirmation').id,'1');
  assert.equal(e.state.match!.status,'confirmed');assert.equal(e.state.deliveries.filter(d=>d.kind==='confirmed').length,4);
});
test('rescheduling a confirmed activity keeps the activity, clears both confirmations',async()=>{
  const {e,a,b}=await proposed();for(const u of [a,b])e.vote(u.id,open(e,u.id,'confirmation').id,'1');await e.flush(send);
  const activity=e.state.match!.activity!.id,p=open(e,a.id,'next');e.vote(a.id,p.id,p.options.find(o=>o.action==='change-time')!.id);
  assert.equal(e.state.match!.activity!.id,activity);assert.equal(e.state.match!.proposal,null);assert.ok(Object.values(e.state.match!.preferences).every(p=>p.confirmedVersion===null));assert.ok(open(e,a.id,'availability'));
});
test('no overlap keeps both availability polls open without inventing times',async()=>{
  const {e,a,b}=await approved();
  e.apply(a.id,reply({availabilityAction:'replace',windows:[windowA]}));e.apply(b.id,reply({availabilityAction:'replace',windows:[{...windowB,start:'18:00',end:'20:00'}]}));
  assert.equal(e.state.match!.proposal,null);assert.equal(e.state.match!.stage,'availability');for(const u of [a,b])assert.ok(open(e,u.id,'availability'));
});
test('invalid dates and elapsed windows are rejected; hikes use their duration and daytime bounds',()=>{
  assert.equal(validWindow({date:'2026-02-30',start:'14:00',end:'17:00'},now()),false);
  assert.equal(validWindow({date:'2026-09-27',start:'09:00',end:'10:00'},now()),false);
  assert.equal(overlapOptions([windowA],[windowB],90,now(),true)[0].end,'16:30');
  assert.equal(overlapOptions([{...windowA,start:'18:00',end:'21:00'}],[{...windowA,start:'18:00',end:'21:00'}],90,now(),true).length,0);
});
test('availability alone cannot approve an activity or confirm a plan',async()=>{
  const {e,a,b}=await started(),p=open(e,b.id,'activity');e.vote(b.id,p.id,'1');await e.flush(send);
  e.apply(a.id,reply({availabilityAction:'replace',windows:[windowA]}));
  assert.equal(e.state.match!.preferences[a.id].activityAnswer,'unknown');assert.equal(e.state.match!.proposal,null);assert.equal(e.state.match!.stage,'approval');
});
test('Gemini cannot cast a final confirmation vote',async()=>{
  const {e,a}=await proposed(),p=open(e,a.id,'confirmation');
  e.apply(a.id,reply({pollId:p.id,optionId:'1'}));assert.equal(e.state.match!.preferences[a.id].confirmedVersion,null);
});
test('numbered fallback votes and STOP do not need an AI key',async()=>{
  const {e,a,b}=await started(),p=open(e,b.id,'activity');
  await e.receive('fallback',b.phone,`VOTE ${p.id} 1`,noAI);assert.equal(e.state.match!.stage,'approval');
  await e.receive('stop',a.phone,'STOP',noAI);assert.equal(e.state.match!.status,'cancelled');assert.equal(e.state.deliveries.filter(d=>d.kind==='cancelled').length,2);assert.ok(e.state.match!.polls.every(p=>p.status==='closed'));
});
test('stored polls survive a restart; legacy profiles migrate without sending obsolete restaurant plans',async()=>{
  const dir=mkdtempSync(join(tmpdir(),'linkup-test-'));
  try{
    const path=join(dir,'data.json'),{e,a,b}=setup(path);e.swipe(a,b.id,'like');e.swipe(b,a.id,'like');e.start();await e.flush(send);
    const restored=new Engine(new Store(path),now);assert.equal(restored.auth(a.token).phone,a.phone);assert.equal(restored.state.match!.polls[0].id,e.state.match!.polls[0].id);
    const old=JSON.parse(readFileSync(path,'utf8'));old.version=1;old.match={id:'old-plan'};writeFileSync(path,JSON.stringify(old));
    const migrated=new Store(path);assert.equal(migrated.state.version,2);assert.equal(migrated.state.users.length,2);assert.equal(migrated.state.match!.startedAt,null);assert.equal(migrated.state.deliveries.length,0);assert.ok(readFileSync(path+'.v1-backup','utf8').includes('old-plan'));
  }finally{rmSync(dir,{recursive:true,force:true});}
});
test('HTTP: authenticated own poll voting, suggestion authorization and retry-safe handoff',async()=>{
  const {e,a,b}=setup(),q=new SerialQueue(),server=createApi(e,q,()=>services,async retry=>{await e.flush(send,retry);});
  await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));const base=`http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const post=(path:string,token:string,input:unknown)=>fetch(base+path,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify(input)});
  try{
    assert.equal((await fetch(base+'/state')).status,401);
    assert.equal((await post('/match/text',a.token,{})).status,409);
    await Promise.all([post('/swipes',a.token,{candidateId:b.id,decision:'like'}),post('/swipes',b.token,{candidateId:a.id,decision:'like'})]);
    await Promise.all([post('/match/text',a.token,{}),post('/match/text',b.token,{})]);await q.run(()=>{});assert.equal(e.state.deliveries.length,3);
    const p=open(e,b.id,'activity');assert.equal((await post('/poll/vote',a.token,{pollId:p.id,optionId:'1'})).status,404);
    assert.equal((await post('/poll/vote',b.token,{pollId:p.id,optionId:'1'})).status,200);await q.run(()=>{});
    assert.equal((await post('/match/suggest',a.token,{name:'Walk',meetingPoint:'Arch',durationMinutes:60,outdoor:true})).status,403);
    assert.equal((await post('/demo/restart',a.token,{})).status,200);assert.equal(e.state.match,null);assert.equal(e.state.users.length,2);
  }finally{await new Promise<void>(resolve=>server.close(()=>resolve()));}
});
test('Gemini uses structured output and rejects malformed, blocked, empty, and provider errors',async()=>{
  const original=globalThis.fetch,key=process.env.GEMINI_API_KEY,model=process.env.GEMINI_MODEL;process.env.GEMINI_API_KEY='test-key';process.env.GEMINI_MODEL='gemini-3.5-flash-lite';
  try{
    const {e,a}=await started(),expected=reply({availabilityAction:'add',windows:[windowA]});
    globalThis.fetch=(async(url,init)=>{assert.equal(String(url),'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent');assert.equal(new Headers(init?.headers).get('x-goog-api-key'),'test-key');const body=JSON.parse(String(init?.body));assert.equal(body.generationConfig.responseMimeType,'application/json');assert.ok(body.generationConfig.responseJsonSchema.properties.suggestion);return new Response(JSON.stringify({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify(expected)}]}}]}));}) as typeof fetch;
    assert.deepEqual(await extractMessage('tomorrow 2 to 5 PM',a.id,e.state.match!,a,[]),expected);
    for(const status of [400,403,404,429,503]){globalThis.fetch=(async()=>new Response('{}',{status})) as typeof fetch;await assert.rejects(()=>extractMessage('hi',a.id,e.state.match!,a,[]),new RegExp(String(status)));}
    globalThis.fetch=(async()=>new Response(JSON.stringify({candidates:[{finishReason:'SAFETY'}]}))) as typeof fetch;await assert.rejects(()=>extractMessage('hi',a.id,e.state.match!,a,[]),/SAFETY/);
    globalThis.fetch=(async()=>new Response('{}')) as typeof fetch;await assert.rejects(()=>extractMessage('hi',a.id,e.state.match!,a,[]),/empty/);
    assert.throws(()=>parseExtraction({...expected,windows:[null]}),/unexpected/);
  }finally{globalThis.fetch=original;if(key===undefined)delete process.env.GEMINI_API_KEY;else process.env.GEMINI_API_KEY=key;if(model===undefined)delete process.env.GEMINI_MODEL;else process.env.GEMINI_MODEL=model;}
});
test('transport creates a real poll, supports text fallback, and does not mask uncertain delivery',async()=>{
  const {e,b}=await started(),ballot=open(e,b.id,'activity'),seen:ContentInput[]=[];
  const chat={send:async(content:ContentInput)=>{seen.push(content);return {id:'receipt'};}};
  assert.equal((await deliver(chat,'fallback',ballot))?.mode,'native');
  const resolved=await resolveContents(seen);assert.equal(resolved[0].type,'poll');
  let attempts=0;const unsupported={send:async(content:ContentInput)=>{attempts++;if(attempts===1)throw Error('polls are unsupported');assert.equal(content,'fallback');return {id:'text'};}};
  assert.equal((await deliver(unsupported,'fallback',ballot))?.mode,'text');assert.equal(attempts,2);
  let calls=0;await assert.rejects(()=>deliver({send:async()=>{calls++;throw Error('timeout');}},'fallback',ballot),/timeout/);assert.equal(calls,1);
});
test('a maybe answer revokes a proposed plan until activity approval is renewed',async()=>{
  const {e,a}=await proposed();e.apply(a.id,reply({activityAnswer:'maybe'}));
  assert.equal(e.state.match!.proposal,null);assert.equal(e.state.match!.preferences[a.id].activityAnswer,'maybe');assert.equal(e.state.match!.stage,'approval');assert.ok(open(e,a.id,'approval'));
});
test('approval can include availability without bypassing the approval poll',async()=>{
  const {e,a,b}=await started(),p=open(e,b.id,'activity');e.vote(b.id,p.id,'1');await e.flush(send);
  e.apply(a.id,reply({activityAnswer:'yes',availabilityAction:'add',windows:[windowA]}));
  assert.equal(e.state.match!.preferences[a.id].activityAnswer,'yes');assert.deepEqual(e.state.match!.preferences[a.id].windows,[windowA]);assert.equal(e.state.match!.stage,'availability');
});
test('a user-added native activity option requests its details before approval',async()=>{
  const {e,b}=await started(),p=open(e,b.id,'activity');e.receiveVote('custom-vote',b.phone,pollTitle(p),'Visit my favorite gallery',true);
  assert.equal(e.state.match!.activity,null);assert.ok(e.state.deliveries.at(-1)!.text.includes('public meeting point and duration'));
});
test('changing a current confirmation vote to reschedule clears the earlier yes',async()=>{
  const {e,a,b}=await proposed(),pa=open(e,a.id,'confirmation'),pb=open(e,b.id,'confirmation');
  e.vote(a.id,pa.id,'1');assert.ok(e.state.match!.preferences[a.id].confirmedVersion);
  e.vote(a.id,pa.id,pa.options.find(o=>o.action==='change-time')!.id);
  assert.equal(e.state.match!.proposal,null);assert.equal(e.state.match!.preferences[a.id].confirmedVersion,null);assert.throws(()=>e.vote(b.id,pb.id,'1'),/closed/);
});
