import { randomUUID } from 'node:crypto';
import { DUMMIES, PHOTOS, suggestActivities } from '../shared/catalog';
import type { Activity, ActivitySuggestion, Extraction, Match, MeetupPoll, Person, PollKind, PollOption, Preference, ProfileInput, Snapshot, Window } from '../shared/types';
import type { Store, StoredUser } from './store';
import { formatWindow, nyNow, overlapOptions, suggestedWindows, validWindow } from './time';

export class UserError extends Error { constructor(message:string,readonly status=400){super(message);} }
export function toPhone(raw:string) {
  const digits=raw.replace(/\D/g,'');
  if(digits.length===10) return '+1'+digits;
  if(digits.length===11 && digits.startsWith('1')) return '+'+digits;
  if(raw.trim().startsWith('+') && /^[1-9]\d{9,14}$/.test(digits)) return '+'+digits;
  throw new UserError('Enter a phone number with area code, or use +country code.');
}
export function publicPerson(user:StoredUser):Person {
  const {phone:_phone,token:_token,consent:_consent,...person}=user;return person;
}
export const emptyPreference=():Preference=>({windows:[],activityAnswer:'unknown',concern:'',confirmedVersion:null,timeVote:null});
export type Send = (phone:string,text:string,poll?:MeetupPoll)=>Promise<{mode?:'native'|'text';messageId?:string}|void>;
export const pollTitle=(p:MeetupPoll)=>`${p.question} [${p.id}]`;
export const optionTitle=(p:MeetupPoll,o:PollOption)=>`${p.options.indexOf(o)+1}. ${o.label}`;
export const pollText=(p:MeetupPoll)=>`${pollTitle(p)}\n${p.options.map(o=>optionTitle(p,o)).join('\n')}\nReply VOTE ${p.id} 1 (replace 1 with your choice).`;
export function createMatch(people:StoredUser[]):Match {
  const ids=people.map(p=>p.id);
  return {id:randomUUID(),userIds:ids,chooserId:(people.find(p=>p.residentType==='Local')||people[0]).id,status:'matched',stage:'activity',round:0,timingVersion:0,version:0,proposal:null,activity:null,activities:suggestActivities(people),polls:[],preferences:Object.fromEntries(ids.map(id=>[id,emptyPreference()])),startedAt:null};
}

export class Engine {
  constructor(readonly store:Store, readonly now=()=>new Date()){}
  get state(){return this.store.state;}
  auth(token:string):StoredUser {const user=this.state.users.find(u=>u.token===token);if(!user)throw new UserError('Please enter your demo profile again.',401);return user;}
  register(name:string, rawPhone:string, consent:boolean) {
    if(name.trim().length<2 || name.trim().length>50) throw new UserError('Enter your first name (2–50 characters).');
    if(!consent) throw new UserError('Please agree to receive meetup texts.');
    const phone=toPhone(rawPhone);
    // Deliberately simple demo access, not production phone authentication.
    let user=this.state.users.find(u=>u.phone===phone);
    if(user) return {token:user.token,user:publicPerson(user)};
    if(this.state.users.length>=2) throw new UserError('Both demo spots are taken. Re-enter one of those phone numbers, or reset the demo on your laptop.',409);
    const index=this.state.users.length;
    user={id:randomUUID(),token:randomUUID(),phone,consent:true,name:name.trim(),neighborhood:'Greenwich Village',residentType:index===0?'New to the neighborhood':'Local',interests:['Exploring','Hiking','Coffee'],cuisines:['Italian','Japanese'],availability:['Flexible'],profilePhoto:PHOTOS[index],isDemo:false,ready:false};
    this.state.users.push(user);this.state.swipes[user.id]={};this.store.save();
    return {token:user.token,user:publicPerson(user)};
  }
  profile(user:StoredUser, input:ProfileInput) {
    if(this.state.match) throw new UserError('Your match is already active. Reset the demo to change profiles.',409);
    const list=(value:unknown)=>Array.isArray(value)?[...new Set(value.filter((v):v is string=>typeof v==='string').map(v=>v.trim().slice(0,40)).filter(Boolean))].slice(0,12):[];
    const interests=list(input.interests);
    if(!interests.length || typeof input.neighborhood!=='string' || !input.neighborhood.trim())throw new UserError('Choose a neighborhood and at least one interest.');
    Object.assign(user,{neighborhood:input.neighborhood.trim().slice(0,60),residentType:input.residentType==='Local'?'Local':'New to the neighborhood',interests,cuisines:list(input.cuisines),availability:list(input.availability),profilePhoto:PHOTOS.includes(input.profilePhoto)?input.profilePhoto:user.profilePhoto,ready:true});
    this.store.save();
  }
  swipe(user:StoredUser,candidateId:string,decision:'like'|'pass') {
    if(!user.ready)throw new UserError('Finish your profile first.');
    if(this.state.match)return;
    if(!['like','pass'].includes(decision))throw new UserError('Choose like or pass.');
    const peer=this.state.users.find(u=>u.id===candidateId && u.id!==user.id && u.ready);
    if(!peer && !DUMMIES.some(p=>p.id===candidateId))throw new UserError('That profile is not available.');
    this.state.swipes[user.id][candidateId]=decision;
    if(peer && decision==='like' && this.state.swipes[peer.id][user.id]==='like') {
      this.state.match=createMatch(this.state.users.filter(p=>p.id===user.id||p.id===peer.id));
    }
    this.store.save();
  }
  review(user:StoredUser) {
    if(this.state.match)return;
    for(const [id,decision] of Object.entries(this.state.swipes[user.id]))if(decision==='pass')delete this.state.swipes[user.id][id];
    this.store.save();
  }
  snapshot(user:StoredUser,services:Snapshot['services']):Snapshot {
    const peer=this.state.users.find(u=>u.id!==user.id && u.ready);
    const swipes=this.state.swipes[user.id]||{};
    const match=this.state.match;
    return {
      user:{...publicPerson(user),phone:user.phone},joined:this.state.users.filter(u=>u.ready).length,
      partner:peer?publicPerson(peer):null,hasLikedPartner:!!peer && swipes[peer.id]==='like',
      candidates:[...DUMMIES,...(peer?[publicPerson(peer)]:[])].filter(p=>!swipes[p.id]),
      match:match?{...match,polls:match.polls.filter(p=>p.userId===user.id),participants:match.userIds.map(id=>publicPerson(this.state.users.find(u=>u.id===id)!)),deliveries:this.state.deliveries.filter(d=>d.userId===user.id || d.kind==='intro').map(d=>d.userId===user.id?d:{...d,text:''})}:null,services,
    };
  }
  addHistory(userId:string,role:'user'|'assistant',text:string){
    this.state.history[userId]=[...(this.state.history[userId]||[]),{role,text}].slice(-12);
  }
  enqueue(userId:string,text:string,kind='reply',key:string=randomUUID()) {
    if(this.state.deliveries.some(d=>d.id===key))return;
    this.state.deliveries.push({id:key,userId,text,kind,status:'pending',at:this.now().toISOString()});
  }
  private person(id:string){return this.state.users.find(u=>u.id===id)!;}
  private closePolls(kinds?:PollKind[],userId?:string){
    const m=this.state.match!;
    for(const p of m.polls)if((!kinds||kinds.includes(p.kind))&&(!userId||p.userId===userId))p.status='closed';
    this.state.deliveries=this.state.deliveries.filter(d=>d.status==='sent'||!d.pollId||m.polls.some(p=>p.id===d.pollId&&p.status==='open'));
  }
  private openPoll(userId:string,kind:PollKind,question:string,options:Omit<PollOption,'id'>[],proposalVersion?:number){
    const m=this.state.match!;
    this.closePolls([kind],userId);
    const p:MeetupPoll={id:'P'+randomUUID().replace(/-/g,'').slice(0,10).toUpperCase(),userId,kind,question,options:options.map((o,i)=>({...o,id:String(i+1)})),status:'open',selection:null,round:m.round,timingVersion:m.timingVersion,proposalVersion};
    m.polls.push(p);this.enqueue(userId,pollText(p),'poll',p.id);
    this.state.deliveries.at(-1)!.pollId=p.id;
    return p;
  }
  private delivered(p:MeetupPoll){return this.state.deliveries.some(d=>d.pollId===p.id&&d.userId===p.userId&&d.status==='sent');}
  start(){
    const m=this.state.match;if(!m)throw new UserError('Both people need to like each other first.',409);
    if(m.status==='cancelled')throw new UserError('This meetup was cancelled. Restart the demo for a new one.',409);
    if(m.startedAt)return;
    if(m.userIds.some(id=>!this.person(id).consent))throw new UserError('Both people must agree to receive texts.');
    m.startedAt=this.now().toISOString();m.status='collecting';
    const chooser=this.person(m.chooserId);
    for(const id of m.userIds){
      const peer=this.person(m.userIds.find(other=>other!==id)!);
      this.enqueue(id,`Hi ${this.person(id).name}! LinkUp here. You matched with ${peer.name}. ${id===m.chooserId?'You’ll lead the activity choice. Pick an idea in the poll or suggest your own.':`${chooser.name} will pick or suggest an activity, then you get an approval poll.`} We’ll use polls for availability, time and final confirmation. Tap one choice per poll. You can also reply with the poll code and option number. All times are New York time. Reply STOP to cancel.`, 'intro',`${m.id}:intro:${id}`);
    }
    this.activityPoll();this.store.save();
  }
  private activityPoll(){
    const m=this.state.match!;m.stage='activity';
    this.openPoll(m.chooserId,'activity','What should you two do?',[
      ...m.activities.map(a=>({label:`${a.name} · ${a.durationMinutes} min · ${a.neighborhood}`,action:'activity' as const,activityId:a.id})),
      {label:'Suggest my own activity',action:'suggest'},
    ]);
  }
  private resetTiming(){
    const m=this.state.match!;m.proposal=null;m.status='collecting';m.stage=!m.activity?'activity':m.userIds.every(id=>m.preferences[id].activityAnswer==='yes')?'availability':'approval';m.timingVersion++;
    for(const p of Object.values(m.preferences)){p.confirmedVersion=null;p.timeVote=null;}
    this.closePolls(['availability','time','confirmation','next']);
    this.state.deliveries=this.state.deliveries.filter(d=>d.status==='sent'||!['proposal','confirmed','waiting-confirmation','poll-help'].includes(d.kind));
  }
  private resetActivity(reason:string){
    const m=this.state.match!;this.resetTiming();this.closePolls();m.round++;m.activity=null;
    for(const p of Object.values(m.preferences))p.activityAnswer='unknown';
    for(const id of m.userIds)this.enqueue(id,reason+' Saved availability is kept; the next activity needs a fresh approval.','changed');
    this.activityPoll();
  }
  private chooseActivity(activity:Activity){
    const m=this.state.match!;this.resetTiming();this.closePolls();m.round++;m.activity=activity;m.stage='approval';
    for(const id of m.userIds)m.preferences[id].activityAnswer=id===m.chooserId?'yes':'unknown';
    const recipient=m.userIds.find(id=>id!==m.chooserId)!;
    this.enqueue(m.chooserId,`Your pick: ${activity.name}. I’m asking ${this.person(recipient).name} before planning a time.`, 'activity');
    this.enqueue(recipient,`${this.person(m.chooserId).name} ${activity.suggestedBy?'suggests':'picked'}: ${activity.name} (${activity.durationMinutes} minutes). Meet: ${activity.meetingPoint}. ${activity.note}${activity.url?' '+activity.url:''}`, 'activity');
    this.openPoll(recipient,'approval',`Try ${activity.name}?`,[{label:'Yes, I’d like that',action:'approve'},{label:'Ask for another activity',action:'different'}]);
  }
  suggest(userId:string,input:ActivitySuggestion){
    const m=this.state.match;
    if(!m?.startedAt||m.status==='cancelled')throw new UserError('Start an active meetup first.',409);
    if(userId!==m.chooserId)throw new UserError('The local leads suggestions. Choose another activity in your poll or text your preference to ask them.',403);
    if(typeof input.name!=='string'||input.name.trim().length<3||input.name.length>120||typeof input.meetingPoint!=='string'||input.meetingPoint.trim().length<5||input.meetingPoint.length>240||typeof input.outdoor!=='boolean'||!Number.isInteger(input.durationMinutes)||input.durationMinutes<30||input.durationMinutes>240)throw new UserError('Include an activity name, a specific public meeting point, and a duration of 30 to 240 minutes.');
    const person=this.person(userId);
    const activity:Activity={id:randomUUID(),name:input.name.trim(),meetingPoint:input.meetingPoint.trim(),durationMinutes:input.durationMinutes,outdoor:input.outdoor,neighborhood:person.neighborhood,category:'Local suggestion',note:`Suggested by ${person.name}. Check the meeting point and any opening hours together.`,url:'',tags:[],suggestedBy:userId};
    m.activities=[...m.activities.filter(a=>!a.suggestedBy),activity];
    this.chooseActivity(activity);this.store.save();
  }
  private availabilityPoll(userId:string){
    const m=this.state.match!;
    if(m.polls.some(p=>p.userId===userId&&p.kind==='availability'&&p.status==='open'))return;
    const other=m.userIds.find(id=>id!==userId)!;
    const windows=[...new Map([...m.preferences[other].windows,...suggestedWindows(this.now(),m.activity!.outdoor)].filter(w=>validWindow(w,this.now())).map(w=>[JSON.stringify(w),w])).values()].slice(0,4);
    this.openPoll(userId,'availability',`When are you free for ${m.activity!.durationMinutes} minutes?`,[
      ...windows.map(window=>({label:formatWindow(window),action:'availability' as const,window})),
      {label:'Other times / I’ll text my availability',action:'other-times'},
    ]);
  }
  private advanceTiming(){
    const m=this.state.match!;
    if(m.proposal||!m.activity||!m.userIds.every(id=>m.preferences[id].activityAnswer==='yes'))return;
    for(const id of m.userIds)m.preferences[id].windows=m.preferences[id].windows.filter(w=>validWindow(w,this.now()));
    if(m.userIds.some(id=>!m.preferences[id].windows.length)){
      m.stage='availability';for(const id of m.userIds)if(!m.preferences[id].windows.length)this.availabilityPoll(id);return;
    }
    const [a,b]=m.userIds.map(id=>m.preferences[id].windows);
    const slots=overlapOptions(a,b,m.activity.durationMinutes,this.now(),m.activity.outdoor);
    if(!slots.length){
      m.stage='availability';
      for(const id of m.userIds){
        if(!m.polls.some(p=>p.userId===id&&p.kind==='availability'&&p.status==='open'))this.enqueue(id,`No shared ${m.activity.durationMinutes}-minute window yet${m.activity.outdoor?' within our outdoor planning hours (9 AM to 6 PM)':''}. Pick another window or text more availability.`, 'no-overlap');
        this.availabilityPoll(id);
      }
      return;
    }
    if(m.stage==='time'||m.proposal)return;
    this.closePolls(['availability']);m.stage='time';
    for(const id of m.userIds)this.openPoll(id,'time',`Pick a time for ${m.activity.name}`,[
      ...slots.map(window=>({label:formatWindow(window),action:'time' as const,window})),
      {label:'None of these / change my availability',action:'other-times'},
    ]);
  }
  private setWindows(userId:string,windows:Window[],action:'add'|'replace'){
    const m=this.state.match!,p=m.preferences[userId];
    const next=[...new Map((action==='replace'?windows:[...p.windows,...windows]).map(w=>[JSON.stringify(w),w])).values()].sort((a,b)=>(a.date+a.start+a.end).localeCompare(b.date+b.start+b.end));
    if(JSON.stringify(next)===JSON.stringify(p.windows))return;
    const hadPlan=!!m.proposal||m.stage==='time';
    p.windows=next;
    if(hadPlan)this.resetTiming();
    else this.closePolls(['availability'],userId);
    if(hadPlan)for(const id of m.userIds)this.enqueue(id,'Availability changed. Previous time votes and confirmations are cleared; we’ll vote again.', 'changed');
  }
  private changeTime(userId:string){
    this.setWindows(userId,[],'replace');this.resetTiming();this.advanceTiming();
  }
  private confirmationPoll(userId:string){
    const m=this.state.match!,proposal=m.proposal!;
    this.openPoll(userId,'confirmation',`Confirm plan #${proposal.version}?`,[
      {label:`Confirm plan #${proposal.version}`,action:'confirm'},
      {label:'Change the time',action:'change-time'},
      {label:'Choose another activity',action:'different'},
      {label:'Cancel this meetup',action:'cancel'},
    ],proposal.version);
  }
  private propose(slot:Window){
    const m=this.state.match!;
    this.closePolls(['time','confirmation','next']);m.version++;m.proposal={...slot,version:m.version,activityId:m.activity!.id};m.status='proposed';m.stage='confirmation';
    for(const id of m.userIds){
      m.preferences[id].confirmedVersion=null;
      this.enqueue(id,`Plan #${m.version}: ${m.activity!.name}. ${formatWindow(slot)}. Meet: ${m.activity!.meetingPoint}. Both of you chose this time. Confirm in the poll, or reply CONFIRM ${m.version}. It is only final after both confirmations.`, 'proposal',`${m.id}:proposal:${m.version}:${id}`);
      this.confirmationPoll(id);
    }
  }
  private confirm(userId:string){
    const m=this.state.match!,proposal=m.proposal;
    if(!proposal)return;
    const current=nyNow(this.now());
    if(!validWindow(proposal,this.now())||proposal.date+proposal.start<=current.date+current.time){
      this.enqueue(userId,'That time has passed. Let’s pick another time.');this.changeTime(userId);return;
    }
    const delivered=this.state.deliveries.some(d=>d.id===`${m.id}:proposal:${proposal.version}:${userId}`&&d.status==='sent');
    if(!delivered)throw new UserError('Wait for the full plan to arrive before confirming.',409);
    m.preferences[userId].confirmedVersion=proposal.version;
    if(m.userIds.every(id=>m.preferences[id].confirmedVersion===proposal.version)){
      m.status='confirmed';m.stage='done';
      for(const id of m.userIds){
        this.enqueue(id,`Confirmed! ${m.activity!.name}. ${formatWindow(proposal)}. Meet: ${m.activity!.meetingPoint}. ${m.activity!.outdoor?'Check weather and conditions together. ':''}No booking or reservation has been made. Enjoy meeting your neighbor!`,'confirmed',`${m.id}:confirmed:${proposal.version}:${id}`);
        this.openPoll(id,'next','Need to change anything?',[{label:'All set, see you there',action:'keep'},{label:'Reschedule',action:'change-time'},{label:'Change the activity',action:'different'},{label:'Cancel the meetup',action:'cancel'}],proposal.version);
      }
    }else this.enqueue(userId,'Your confirmation is saved. Waiting for your match to confirm this exact plan.','waiting-confirmation');
  }
  private cancel(){
    const m=this.state.match!;m.status='cancelled';m.proposal=null;this.closePolls();
    for(const p of Object.values(m.preferences))p.confirmedVersion=null;
    this.state.deliveries=this.state.deliveries.filter(d=>d.status==='sent');
    for(const id of m.userIds)this.enqueue(id,'This LinkUp meetup has been cancelled. No plan or reservation is confirmed.','cancelled');
  }
  vote(userId:string,pollId:string,optionId:string,selected=true){
    const m=this.state.match;
    if(!m?.startedAt||m.status==='cancelled')throw new UserError('This meetup is no longer accepting votes.',409);
    const p=m.polls.find(p=>p.id===pollId&&p.userId===userId),o=p?.options.find(o=>o.id===optionId);
    if(!p||!o)throw new UserError('That poll or option is not yours.',404);
    if(!this.delivered(p))throw new UserError('This poll has not been delivered yet. Retry delivery first.',409);
    if(!selected){
      if(p.selection!==o.id||p.round!==m.round||p.timingVersion!==m.timingVersion)return;
      p.selection=null;
      if(p.kind==='confirmation'&&o.action==='confirm'&&m.proposal&&p.proposalVersion===m.proposal.version){
        const slot={date:m.proposal.date,start:m.proposal.start,end:m.proposal.end};
        this.state.deliveries=this.state.deliveries.filter(d=>d.status==='sent'||!['confirmed','waiting-confirmation'].includes(d.kind));
        for(const id of m.userIds)this.enqueue(id,'A confirmation was withdrawn. The plan needs two fresh confirmations.','changed');
        this.propose(slot);
      }else if(p.kind==='activity')this.resetActivity('The activity vote was withdrawn.');
      else if(p.kind==='approval'){
        this.resetTiming();m.preferences[userId].activityAnswer='unknown';m.stage='approval';
        this.openPoll(userId,'approval',`Try ${m.activity!.name}?`,[{label:'Yes, I’d like that',action:'approve'},{label:'Ask for another activity',action:'different'}]);
      }else if(p.kind==='availability')this.changeTime(userId);
      else if(p.kind==='time'){this.resetTiming();this.advanceTiming();}
      this.store.save();return;
    }
    if(p.status==='answered'&&p.selection===o.id)return;
    // A participant can change a current approval or confirmation vote.
    if(p.status==='answered'&&p.round===m.round&&(p.kind==='approval'||(p.kind==='confirmation'&&p.proposalVersion===m.proposal?.version)))p.status='open';
    if(p.status!=='open'||p.round!==m.round||(!['activity','approval'].includes(p.kind)&&p.timingVersion!==m.timingVersion))throw new UserError('That poll is closed. Use your latest open poll or text CHANGE ACTIVITY / CHANGE TIME.',409);
    if(o.window&&(!validWindow(o.window,this.now())||(p.kind==='time'&&!overlapOptions([o.window],[o.window],m.activity!.durationMinutes,this.now(),m.activity!.outdoor).some(w=>JSON.stringify(w)===JSON.stringify(o.window))))){
      this.enqueue(userId,'That option is no longer a future time. Please choose fresh availability.');this.changeTime(userId);this.store.save();return;
    }
    p.selection=o.id;p.status='answered';
    switch(o.action){
      case 'activity': {
        if(userId!==m.chooserId)throw new UserError('Only the local leading this match can choose the activity.',403);
        const activity=m.activities.find(a=>a.id===o.activityId);if(!activity)throw new UserError('Activity unavailable.');
        this.chooseActivity(activity);p.round=m.round;p.timingVersion=m.timingVersion;break;
      }
      case 'suggest':
        p.status='open';
        this.enqueue(userId,'What would you like to do? Reply with the activity, a specific public meeting point, and duration. Example: SUGGEST: Bookstore hop | Washington Square Arch, NYC | 60 | outdoor. Or use “Suggest an activity” in the app.');break;
      case 'approve':m.preferences[userId].activityAnswer='yes';this.enqueue(m.chooserId,`${this.person(userId).name} approved ${m.activity!.name}. Let’s vote on availability.`);this.advanceTiming();break;
      case 'different':this.resetActivity(`${this.person(userId).name} would like another activity.`);break;
      case 'availability':this.setWindows(userId,[o.window!],'replace');p.timingVersion=m.timingVersion;this.advanceTiming();break;
      case 'other-times':this.changeTime(userId);this.enqueue(userId,'Text another day and time range, for example “Tomorrow 2 PM to 6 PM”. I’ll turn the shared availability into a new time poll.');break;
      case 'time': {
        m.preferences[userId].timeVote=JSON.stringify(o.window);p.status='open';
        const votes=m.userIds.map(id=>m.preferences[id].timeVote);
        if(votes.every(v=>v===votes[0]))this.propose(o.window!);
        else if(votes.every(Boolean))for(const id of m.userIds)this.enqueue(id,`You chose different times. ${this.person(m.userIds.find(other=>other!==id)!).name} picked ${formatWindow(JSON.parse(m.preferences[m.userIds.find(other=>other!==id)!].timeVote!))}. Choose the same time in your current poll, or change availability.`, 'time-tie');
        else this.enqueue(userId,'Time vote saved. Your match needs to pick the same slot before you both confirm.');
        break;
      }
      case 'confirm':
        if(p.proposalVersion!==m.proposal?.version)throw new UserError('That plan was replaced. Use the latest confirmation poll.',409);
        this.confirm(userId);break;
      case 'change-time':this.changeTime(userId);break;
      case 'cancel':this.cancel();break;
      case 'keep':this.enqueue(userId,'All set. Your activity and time are in the confirmed plan above.');break;
    }
    this.store.save();
  }
  private remember(messageId:string){
    if(this.state.seenMessages.includes(messageId))return false;
    this.state.seenMessages=[...this.state.seenMessages,messageId].slice(-1000);return true;
  }
  receiveVote(messageId:string,phone:string,title:string,option:string,selected:boolean){
    const user=this.state.users.find(u=>u.phone===phone),m=this.state.match;
    if(!user||!m?.startedAt||m.status==='cancelled'||!this.remember(messageId))return;
    const p=m.polls.find(p=>p.userId===user.id&&pollTitle(p)===title),o=p?.options.find(o=>optionTitle(p,o)===option);
    if(!p||!o){
      if(p&&p.kind==='activity'&&p.status==='open'&&user.id===m.chooserId&&selected){
        this.addHistory(user.id,'user',`Suggested in poll: ${option.slice(0,120)}`);
        this.enqueue(user.id,`Your activity idea: ${option.slice(0,120)}. Please add a public meeting point and duration so your match can review it. Reply SUGGEST: ${option.slice(0,120)} | meeting point | 60 | outdoor (or indoor).`);
      }
      this.store.save();return;
    }
    this.addHistory(user.id,'user',`${selected?'Voted':'Withdrew vote'} ${p.id}: ${o.label}`);
    try{this.vote(user.id,p.id,o.id,selected);}catch(error){this.enqueue(user.id,error instanceof UserError?error.message:'That vote could not be saved. Try the latest poll.');}
    this.store.save();
  }
  async receive(messageId:string,phone:string,text:string,extract:(text:string,id:string,m:Match)=>Promise<Extraction>){
    const user=this.state.users.find(u=>u.phone===phone),m=this.state.match;
    if(!user||!m?.startedAt||m.status==='cancelled'||!this.remember(messageId))return;
    this.addHistory(user.id,'user',text);this.store.save();
    try{
      const clean=text.trim(),numbered=/^confirm\s*#?\s*(\d+)\s*[.!]?$/i.exec(clean),vote=/^(?:vote\s+)?(P[A-F0-9]{10})\s+(\d+)\s*[.!]?$/i.exec(clean);
      if(/^(stop|unsubscribe|cancel meetup)\s*[.!]?$/i.test(clean))this.cancel();
      else if(/^change (activity|place)$/i.test(clean))this.resetActivity(`${user.name} asked for another activity.`);
      else if(/^change time$/i.test(clean))this.changeTime(user.id);
      else if(/^suggest\s*:/i.test(clean)){
        const [name,meetingPoint,duration='60',environment='outdoor']=clean.replace(/^suggest\s*:/i,'').split('|').map(s=>s.trim());
        this.suggest(user.id,{name,meetingPoint,durationMinutes:Number(duration),outdoor:environment.toLowerCase()!=='indoor'});
      }else if(numbered){
        const p=m.polls.find(p=>p.userId===user.id&&p.kind==='confirmation'&&p.status!=='closed'&&p.proposalVersion===Number(numbered[1])&&p.proposalVersion===m.proposal?.version);
        if(!p)throw new UserError('That plan is no longer current. Use the latest confirmation poll.');
        this.vote(user.id,p.id,p.options.find(o=>o.action==='confirm')!.id);
      }else if(vote)this.vote(user.id,vote[1].toUpperCase(),vote[2]);
      else if(/^\d+$/.test(clean)){
        const polls=m.polls.filter(p=>p.userId===user.id&&p.status==='open'&&this.delivered(p));
        if(polls.length!==1)throw new UserError('Please include the poll code: VOTE P… 1.');
        this.vote(user.id,polls[0].id,clean);
      }else this.apply(user.id,await extract(text,user.id,m));
    }catch(error){
      console.error('Planner:',error instanceof Error?error.message:'Unknown error');
      this.enqueue(user.id,error instanceof UserError?error.message:'I couldn’t interpret that reply right now. Your match is saved. You can still tap a poll, send its code and option number, or resend your message in a moment.','error');
    }
    this.store.save();
  }
  apply(userId:string,input:Extraction){
    const m=this.state.match!;if(m.status==='cancelled')return;
    if(input.cancel){this.cancel();return;}
    if(input.windows.some(w=>!validWindow(w,this.now()))){this.enqueue(userId,'Please give a future day and time range within the next month, in New York time.');return;}
    if(input.concern)m.preferences[userId].concern=input.concern.slice(0,300);
    if(input.availabilityAction!=='none')this.setWindows(userId,input.windows,input.availabilityAction);
    if(input.suggestion){this.suggest(userId,input.suggestion);return;}
    if(input.wantsAlternative||input.activityAnswer==='no'){
      this.resetActivity(`${this.person(userId).name} asked for another activity${input.concern?': '+input.concern.slice(0,200):'.'}`);return;
    }
    if(input.pollId&&input.optionId){
      const p=m.polls.find(p=>p.id===input.pollId&&p.userId===userId);
      if(p?.kind==='confirmation')this.enqueue(userId,`Please tap the confirmation poll or reply CONFIRM ${m.proposal?.version}.`);
      else this.vote(userId,input.pollId,input.optionId);
      return;
    }
    if(input.activityAnswer==='yes'&&m.stage==='approval'){
      const p=m.polls.find(p=>p.userId===userId&&p.kind==='approval'&&p.status==='open');
      if(p)this.vote(userId,p.id,p.options.find(o=>o.action==='approve')!.id);
    }
    if(input.clarification){this.enqueue(userId,input.clarification);return;}
    if(input.activityAnswer==='maybe'&&m.activity){
      m.preferences[userId].activityAnswer='maybe';this.resetTiming();m.stage='approval';
      this.enqueue(userId,'Let’s settle the activity before confirming a time. Tell me what would help you decide, or use this poll.');
      this.openPoll(userId,'approval',`Still want to try ${m.activity.name}?`,[{label:'Yes, I’d like that',action:'approve'},{label:'Ask for another activity',action:'different'}]);return;
    }
    this.advanceTiming();
    if(m.stage==='activity')this.enqueue(userId,userId===m.chooserId?'Choose an activity in your poll, or send SUGGEST: activity | public meeting point | minutes | outdoor/indoor.':'Your preferences are saved. Waiting for the local’s activity pick, then you get an approval poll.');
    else if(m.stage==='confirmation')this.enqueue(userId,`Please use the final poll or reply CONFIRM ${m.proposal!.version} to confirm the complete plan.`);
    else if(m.status==='confirmed')this.enqueue(userId,'Your confirmed plan is saved. Use the latest poll to reschedule or change the activity.');
  }
  async flush(send:Send,retry=false){
    const blocked=new Set<string>();
    for(const d of this.state.deliveries){
      if(d.status==='sent'||blocked.has(d.userId))continue;
      if(d.status==='failed'&&!retry){blocked.add(d.userId);continue;}
      const user=this.state.users.find(u=>u.id===d.userId);if(!user)continue;
      const poll=d.pollId?this.state.match?.polls.find(p=>p.id===d.pollId):undefined;
      if(d.pollId&&(!poll||poll.status!=='open'))continue;
      try{const receipt=await send(user.phone,d.text,poll);d.status='sent';d.mode=receipt?.mode;d.providerMessageId=receipt?.messageId;delete d.error;this.addHistory(user.id,'assistant',d.text);}
      catch(error){d.status='failed';d.error=error instanceof Error?error.message:'Photon could not deliver this message.';blocked.add(d.userId);}
      this.store.save();
    }
  }
}
