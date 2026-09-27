import React, {useCallback,useEffect,useRef,useState} from 'react';
import {ActivityIndicator,AppState,BackHandler,KeyboardAvoidingView,Linking,Platform,Pressable,ScrollView,StatusBar,StyleSheet,Text,View} from 'react-native';
import {SafeAreaProvider,SafeAreaView} from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {Ionicons} from '@expo/vector-icons';
import type {Activity,ActivitySuggestion,MeetupPoll,Person,ProfileInput,Snapshot,Window} from './shared/types';
import {PHOTOS} from './shared/catalog';
import {api,ApiError,API_BASE_URL} from './src/api';
import {AppButton,Chip,ErrorNote,Eyebrow,Photo,TextField,Wordmark} from './src/ui';
import {COLORS,styles} from './src/theme';
import {SwipeDeck} from './src/SwipeDeck';

const SESSION='@linkup/demo-v1';
type Tab='discover'|'match'|'planning'|'settings';
const interestOptions=['Exploring','Hiking','Nature','Photography','Walking','Picnics','Coffee','Bookstores','Jazz','Film','Art galleries','Running','Board games','Thrifting','Dumplings','Badminton'];
const cuisineOptions=['Chinese','Thai','Italian','Japanese','Indian','Mediterranean'];
function formatSlot(slot:Window){
  const date=new Date(slot.date+'T12:00:00Z').toLocaleDateString('en-US',{weekday:'long',month:'short',day:'numeric',timeZone:'UTC'});
  const time=(s:string)=>{const [h,m]=s.split(':').map(Number);return `${h%12||12}${m?':'+String(m).padStart(2,'0'):''} ${h>=12?'PM':'AM'}`;};
  return `${date}\n${time(slot.start)} – ${time(slot.end)} · New York time`;
}
function Header({onBack,label}:{onBack:()=>void;label:string}){return <View style={styles.backHeader}><Pressable accessibilityLabel="Back" accessibilityRole="button" onPress={onBack} style={styles.circleButton}><Ionicons name="chevron-back" size={22}/></Pressable><Text style={styles.stepLabel}>{label}</Text><View style={{width:46}}/></View>;}

function Login({onJoin,busy,error}:{onJoin:(name:string,phone:string,consent:boolean)=>void;busy:boolean;error:string}){
  const [name,setName]=useState(''),[phone,setPhone]=useState(''),[consent,setConsent]=useState(false);
  return <SafeAreaView style={styles.safe}><KeyboardAvoidingView behavior={Platform.OS==='ios'?'padding':undefined} style={styles.flex}><ScrollView contentContainerStyle={{flexGrow:1}} keyboardShouldPersistTaps="handled"><View style={[styles.loginScreen,{minHeight:740}]}>
    <View style={styles.mapDecor}>{[0,1,2,3].map(i=><View key={'h'+i} style={[styles.mapLineH,{top:36+i*56}]}/>)}{[0,1,2,3].map(i=><View key={'v'+i} style={[styles.mapLineV,{left:28+i*72}]}/>)}</View>
    <View style={styles.loginTop}><View style={styles.stamp}><Text style={styles.stampText}>NYC · BLOCK BY BLOCK</Text></View><View><Wordmark/><Text style={styles.heroTitle}>Meet a neighbor.{"\n"}Find your next{"\n"}favorite adventure.</Text><Text style={styles.bodyCopy}>New person. New block. Your next good conversation could be three streets away.</Text></View></View>
    <View style={styles.loginPanel}><TextField label="YOUR NAME" value={name} onChangeText={setName} placeholder="First name"/><TextField label="PHONE NUMBER" value={phone} onChangeText={setPhone} placeholder="Your real number" phone/>
      <Pressable accessibilityRole="checkbox" aria-checked={consent} accessibilityState={{checked:consent}} onPress={()=>setConsent(!consent)} style={s.consent}><Ionicons name={consent?'checkbox':'square-outline'} size={23} color={COLORS.cobalt}/><Text style={s.consentText}>I agree to receive meetup texts from LinkUp on this number.</Text></Pressable>
      <ErrorNote message={error}/><AppButton busy={busy} disabled={!name.trim()||!phone.trim()||!consent} onPress={()=>onJoin(name,phone,consent)} icon={<Ionicons name="arrow-forward" size={20} color="white"/>}>Find my corner</AppButton><Text style={styles.finePrint}>Two-person demo · No phone or ID verification.</Text>
    </View></View></ScrollView></KeyboardAvoidingView></SafeAreaView>;
}

function Profile({snapshot,onSave,busy,error,onLogout}:{snapshot:Snapshot;onSave:(p:ProfileInput)=>void;busy:boolean;error:string;onLogout:()=>void}){
  const u=snapshot.user;
  const [neighborhood,setNeighborhood]=useState(u.neighborhood),[residentType,setType]=useState(u.residentType),[interests,setInterests]=useState(u.interests),[cuisines,setCuisines]=useState(u.cuisines),[availability,setAvailability]=useState(u.availability[0]||'Flexible'),[photo,setPhoto]=useState(u.profilePhoto);
  const toggle=(item:string,list:string[],set:(items:string[])=>void)=>set(list.includes(item)?list.filter(x=>x!==item):[...list,item]);
  return <SafeAreaView style={styles.safe}><View style={styles.stickyHeader}><Wordmark compact/><Text style={styles.stepLabel}>YOUR CITY PROFILE</Text></View><ScrollView contentContainerStyle={styles.profileContent} keyboardShouldPersistTaps="handled"><View style={styles.sectionHeading}><Eyebrow>HEY, {u.name.toUpperCase()}</Eyebrow><Text style={styles.pageTitle}>What’s your{"\n"}NYC energy?</Text><Text style={styles.bodyCopy}>A little about you. A reason to say hello.</Text></View>
    <View style={styles.profileSection}><Text style={styles.sectionTitle}>Choose a demo portrait</Text><View style={[styles.wrapRow,{marginTop:14}]}>{PHOTOS.map(uri=><Pressable key={uri} accessibilityLabel={`Select portrait ${PHOTOS.indexOf(uri)+1}`} onPress={()=>setPhoto(uri)}><Photo uri={uri} name={u.name} style={[styles.profilePhoto,{width:62,height:62,borderWidth:3,borderColor:uri===photo?COLORS.orange:'transparent'}]}/></Pressable>)}</View><Text style={styles.smallMuted}>Sample photos for this demo.</Text></View>
    <View style={styles.profileSection}><TextField label="NEIGHBORHOOD" value={neighborhood} onChangeText={setNeighborhood}/><Text style={styles.sectionTitle}>What kind of neighbor are you?</Text>{(['New to the neighborhood','Local'] as const).map(t=><Pressable key={t} onPress={()=>setType(t)} style={[styles.choice,residentType===t&&styles.choiceSelected]}><View style={[styles.radio,residentType===t&&styles.radioSelected]}/><Text style={styles.choiceText}>{t}</Text></Pressable>)}</View>
    <View style={styles.profileSection}><Text style={styles.sectionTitle}>What are you into?</Text><View style={[styles.wrapRow,{marginTop:12}]}>{interestOptions.map(i=><Chip key={i} label={i} selected={interests.includes(i)} onPress={()=>toggle(i,interests,setInterests)}/>)}</View></View>
    <View style={styles.profileSection}><Text style={styles.sectionTitle}>Any food favorites? (optional)</Text><View style={[styles.wrapRow,{marginTop:12}]}>{cuisineOptions.map(i=><Chip key={i} label={i} selected={cuisines.includes(i)} onPress={()=>toggle(i,cuisines,setCuisines)}/>)}</View></View>
    <View style={styles.profileSection}><Text style={styles.sectionTitle}>When do you usually wander?</Text><View style={[styles.wrapRow,{marginTop:12}]}>{['Weeknights','Saturday','Sunday','Flexible'].map(i=><Chip key={i} label={i} selected={availability===i} onPress={()=>setAvailability(i)}/>)}</View><Text style={[styles.smallMuted,{marginTop:10}]}>You’ll vote on an activity and exact time in Messages.</Text></View>
    <ErrorNote message={error}/><AppButton busy={busy} disabled={!interests.length||!neighborhood.trim()} onPress={()=>onSave({neighborhood,residentType,interests,cuisines,availability:[availability],profilePhoto:photo})}>Find people near me</AppButton><AppButton variant="quiet" onPress={onLogout}>Use a different number</AppButton>
  </ScrollView></SafeAreaView>;
}

function PersonCard({person}:{person:Person}){return <View style={styles.personCard}><View style={[styles.personImageWrap,{height:315}]}><Photo uri={person.profilePhoto} name={person.name} style={styles.personImage}/><View style={styles.residentRibbon}><Text style={styles.residentRibbonText}>{person.residentType.toUpperCase()}</Text></View></View><View style={styles.personDetails}><View style={styles.personTitleRow}><View style={{flex:1}}><Text style={styles.personName}>{person.name}</Text><View style={styles.neighborhoodRow}><Ionicons name="location-outline" size={14} color={COLORS.muted}/><Text style={styles.neighborhoodText}>{person.neighborhood}</Text></View></View><Text style={[styles.liveLabel,{backgroundColor:person.isDemo?COLORS.lavender:COLORS.sage}]}>{person.isDemo?'SAMPLE':'JOINED'}</Text></View><View style={styles.detailBlock}><Text style={styles.detailLabel}>INTO</Text><View style={styles.wrapRow}>{person.interests.map(i=><Chip key={i} label={i}/>)}</View></View><View style={styles.detailGrid}><View style={styles.detailCol}><Text style={styles.detailLabel}>EATS</Text><Text style={styles.detailStrong}>{person.cuisines.join(' · ')||'Open to suggestions'}</Text></View><View style={[styles.detailCol,styles.detailColRight]}><Text style={styles.detailLabel}>FREE AROUND</Text><Text style={styles.detailStrong}>{person.availability.join(' · ')}</Text></View></View></View></View>;}

function Discover({snap,onSwipe,onMatch,onSettings,onReview,busy,error,notice}:{snap:Snapshot;onSwipe:(id:string,d:'like'|'pass')=>Promise<boolean>;onMatch:()=>void;onSettings:()=>void;onReview:()=>void;busy:boolean;error:string;notice:string}){
  const person=snap.candidates[0];
  const [dragging,setDragging]=useState(false);
  return <SafeAreaView style={styles.safe}><View style={styles.discoverHeader}><View><Wordmark compact/><Text style={styles.citySubtitle}>NYC, BLOCK BY BLOCK</Text></View><Pressable accessibilityLabel="Your profile and demo settings" onPress={onSettings}><Photo uri={snap.user.profilePhoto} name={snap.user.name} style={styles.headerAvatar}/></Pressable></View><ScrollView scrollEnabled={!dragging} contentContainerStyle={styles.discoverContent}>
    <Pressable disabled={!snap.match} onPress={onMatch} style={styles.meetupBanner}><View style={styles.ticketIcon}><Text style={styles.ticketIconText}>L</Text></View><View style={{flex:1}}><Text style={styles.bannerLabel}>{snap.match?'YOUR CONNECTION':'A LITTLE CLOSER TO YOUR CITY'}</Text><Text style={styles.bannerTitle}>{snap.match?snap.match.status==='confirmed'?'Your hangout is confirmed':'Your meetup is waiting':snap.joined<2?'Waiting for your second neighbor':'Two neighbors. One new adventure.'}</Text></View>{snap.match&&<Ionicons name="arrow-forward" size={20}/>}</Pressable>
    <ErrorNote message={error}/>{notice?<Text style={s.notice}>{notice}</Text>:null}
    {snap.match?<View style={s.empty}><Text style={styles.pageTitle}>A new{"\n"}connection.</Text><Text style={styles.bodyCopy}>You and {snap.partner?.name} both said yes.</Text><AppButton onPress={onMatch}>View your meetup</AppButton></View>:person?<><View style={styles.coordinateRow}><Text style={styles.coordinateText}>40.7128° N</Text><Text style={styles.coordinateText}>YOUR NEIGHBORHOOD EDIT</Text><Text style={styles.coordinateText}>74.0060° W</Text></View><SwipeDeck key={person.id} disabled={busy} personName={person.name} nextName={snap.candidates[1]?.name} onDragChange={setDragging} onSwipe={d=>onSwipe(person.id,d)}><PersonCard person={person}/></SwipeDeck></>:<View style={s.empty}><View style={styles.thanksStamp}><Ionicons name="hourglass-outline" size={30}/></View><Text style={styles.pageTitle}>{snap.hasLikedPartner?'Your hello\nis out there.':'You’re all\ncaught up.'}</Text><Text style={styles.bodyCopy}>{snap.hasLikedPartner?`Waiting for ${snap.partner?.name} to like you back. This screen updates automatically.`:snap.joined<2?'Have the other person open the same Expo app and finish their profile. Their card will appear here.':'Want another look at the people you passed?'}</Text><AppButton onPress={onReview} variant="secondary" busy={busy}>Review passed profiles</AppButton></View>}
  </ScrollView></SafeAreaView>;
}

function ActivityCard({activity}:{activity:Activity}){
  return <View style={styles.mysteryCard}>
    <View style={styles.mysteryTop}><Eyebrow>{activity.suggestedBy?'A LOCAL’S IDEA':'YOUR NEXT ADVENTURE'}</Eyebrow><Ionicons name={activity.outdoor?'leaf-outline':'cafe-outline'} size={22}/></View>
    <Text style={styles.quote}>{activity.name}</Text><Text style={styles.spotCategory}>{activity.category.toUpperCase()} · {activity.durationMinutes} MIN · {activity.outdoor?'OUTDOORS':'INDOORS'}</Text>
    <Text style={[styles.detailLabel,{marginTop:14}]}>MEET HERE</Text><Text style={styles.smallBody}>{activity.meetingPoint}</Text>
    <Text style={[styles.smallMuted,{marginVertical:12}]}>{activity.note}</Text>
    {activity.url?<Pressable accessibilityRole="link" onPress={()=>void Linking.openURL(activity.url)} style={styles.mysteryFooter}><Text style={styles.mysteryFooterText}>EXPLORE THE SPOT</Text><Ionicons name="open-outline" size={16}/></Pressable>:null}
  </View>;
}
function ActivityIdeas({activities}:{activities:Activity[]}){
  return <View style={styles.agentCard}><Eyebrow>A FEW WAYS TO CONNECT</Eyebrow>{activities.slice(0,5).map(a=><View key={a.id} style={s.idea}><Ionicons name={a.category==='Hiking'?'trail-sign-outline':a.category==='Games'?'dice-outline':a.outdoor?'compass-outline':'cafe-outline'} size={21} color={COLORS.cobalt}/><View style={{flex:1}}><Text style={styles.detailStrong}>{a.name}</Text><Text style={styles.smallMuted}>{a.neighborhood} · {a.durationMinutes} minutes</Text></View></View>)}<Text style={styles.smallMuted}>NYC ideas based on your interests. Your local can suggest something closer, too.</Text></View>;
}
function MatchScreen({snap,onText,onBack,busy,error}:{snap:Snapshot;onText:()=>void;onBack:()=>void;busy:boolean;error:string}){
  const m=snap.match!,peer=snap.partner!,chooser=m.participants.find(p=>p.id===m.chooserId)!;
  return <SafeAreaView style={styles.safe}><ScrollView contentContainerStyle={styles.matchContent}>
    <Eyebrow>A MUTUAL YES</Eyebrow><Text style={styles.matchTitle}>You both{"\n"}said yes.</Text>
    <View style={styles.matchPeople}><Photo uri={snap.user.profilePhoto} name={snap.user.name} style={[styles.avatar,styles.avatarYou]}/><View style={styles.matchConnector}><View style={styles.dash}/><View style={styles.matchMark}><Text style={styles.matchMarkText}>L</Text></View><View style={styles.dash}/></View><Photo uri={peer.profilePhoto} name={peer.name} style={styles.avatar}/></View>
    <Text style={styles.matchNames}>You + {peer.name}</Text><Text style={styles.matchLocation}>{peer.neighborhood} · {peer.residentType}</Text>
    <View style={[styles.wrapRow,{justifyContent:'center'}]}>{snap.user.interests.filter(i=>peer.interests.includes(i)).map(i=><Chip key={i} label={i}/>)}</View>
    <View style={styles.revealLabel}><View style={styles.revealLine}/><Text style={styles.revealText}>LET THE LOCAL LEAD</Text><View style={styles.revealLine}/></View>
    <Text style={styles.bodyCopy}>{chooser.id===snap.user.id?'You’ll pick or suggest an activity.':`${chooser.name} will pick or suggest an activity.`} Your match gets a say, then you both vote on a time.</Text>
    {m.activity?<ActivityCard activity={m.activity}/>:<ActivityIdeas activities={m.activities}/>}
    <ErrorNote message={error}/><AppButton busy={busy} onPress={onText} icon={<Ionicons name="chatbubble-ellipses" size={18} color="white"/>}>{m.startedAt?'View your polls':'Start polls in Messages'}</AppButton>
    <Text style={styles.finePrint}>Private iMessage polls for activity, approval, availability, time, and final confirmation.</Text><AppButton variant="quiet" onPress={onBack}>Back to discovery</AppButton>
  </ScrollView></SafeAreaView>;
}
function PollCard({poll,delivered,busy,onVote}:{poll:MeetupPoll;delivered:boolean;busy:boolean;onVote:(pollId:string,optionId:string)=>void}){
  const open=poll.status==='open';
  return <View style={s.pollCard}><View style={s.pollHeader}><Eyebrow>{poll.kind==='confirmation'?'FINAL CONFIRMATION':poll.kind.toUpperCase()+' POLL'}</Eyebrow><Text style={[styles.liveLabel,{backgroundColor:open?COLORS.yellow:COLORS.sage}]}>{open?'VOTE':'SAVED'}</Text></View><Text style={[styles.sectionTitle,{marginVertical:14}]}>{poll.question}</Text>
    {poll.options.map(o=><Pressable key={o.id} accessibilityRole="radio" accessibilityState={{checked:poll.selection===o.id,disabled:!open||!delivered||busy}} disabled={!open||!delivered||busy} onPress={()=>onVote(poll.id,o.id)} style={[s.pollOption,poll.selection===o.id&&s.pollSelected]}><Ionicons name={poll.selection===o.id?'checkmark-circle':'ellipse-outline'} size={22} color={poll.selection===o.id?COLORS.cobalt:COLORS.muted}/><Text style={[styles.smallBody,{flex:1}]}>{o.label}</Text></Pressable>)}
    <Text selectable style={[styles.smallMuted,{marginTop:12}]}>{!delivered?'Sending your poll…':open?`Tap here or in Messages. Text fallback: VOTE ${poll.id} 1`:'Your response is saved.'}</Text>
  </View>;
}
function SuggestActivity({busy,onSuggest}:{busy:boolean;onSuggest:(input:ActivitySuggestion)=>void}){
  const [expanded,setExpanded]=useState(false),[name,setName]=useState(''),[meetingPoint,setMeetingPoint]=useState(''),[duration,setDuration]=useState(60),[outdoor,setOutdoor]=useState(true);
  return <View style={styles.agentCard}><Eyebrow>YOU KNOW THE NEIGHBORHOOD</Eyebrow><Text style={[styles.sectionTitle,{marginVertical:12}]}>Have a better idea?</Text><Text style={styles.smallBody}>Suggest your favorite walk, hike, gallery, or hidden gem. Your match approves it before it becomes the plan.</Text>
    <AppButton variant="secondary" onPress={()=>setExpanded(!expanded)}>{expanded?'Close suggestion':'Suggest an activity'}</AppButton>
    {expanded&&<View style={{gap:12,marginTop:16}}><TextField label="ACTIVITY" value={name} onChangeText={setName} placeholder="Explore my favorite bookstores"/><TextField label="PUBLIC MEETING POINT" value={meetingPoint} onChangeText={setMeetingPoint} placeholder="Name or address of the meeting point"/><Text style={styles.detailLabel}>HOW LONG?</Text><View style={styles.wrapRow}>{[30,60,90,120,180].map(n=><Chip key={n} label={`${n} min`} selected={n===duration} onPress={()=>setDuration(n)}/>)}</View><View style={styles.wrapRow}><Chip label="Outdoors" selected={outdoor} onPress={()=>setOutdoor(true)}/><Chip label="Indoors" selected={!outdoor} onPress={()=>setOutdoor(false)}/></View><AppButton busy={busy} disabled={name.trim().length<3||meetingPoint.trim().length<5} onPress={()=>onSuggest({name,meetingPoint,durationMinutes:duration,outdoor})}>Send for their approval</AppButton></View>}
  </View>;
}
function Planning({snap,onBack,onRetry,onSettings,onVote,onSuggest,busy,error}:{snap:Snapshot;onBack:()=>void;onRetry:()=>void;onSettings:()=>void;onVote:(pollId:string,optionId:string)=>void;onSuggest:(input:ActivitySuggestion)=>void;busy:boolean;error:string}){
  const m=snap.match!,confirmed=m.status==='confirmed',cancelled=m.status==='cancelled';
  const failed=m.deliveries.some(d=>d.status==='failed'),pending=m.deliveries.some(d=>d.status==='pending');
  const chooser=m.participants.find(p=>p.id===m.chooserId)!;
  const titles={activity:'An adventure starts\nwith a vote.',approval:'A local’s idea.\nYour say.',availability:'Find your\nfree time.',time:'Pick a time,\ntogether.',confirmation:'Two yeses.\nThen it’s a plan.',done:'See you\naround the block.'};
  const copy={activity:`${chooser.name} leads the activity choice. Pick an idea or suggest something new.`,approval:'The activity needs your match’s approval before you choose a time.',availability:'Vote on a window or text your own. We only suggest times that fit both of you.',time:'Choose the same time in your polls. Different votes stay open until you agree.',confirmation:'Confirm the complete activity and time. Both people must agree to this exact plan.',done:'You both confirmed. Your plan is in Messages, and you can still change it together.'};
  const polls=m.polls.filter(p=>p.status==='open');
  const latest=m.polls.filter(p=>p.selection&&p.status!=='open').at(-1);
  return <SafeAreaView style={styles.safe}><Header onBack={onBack} label={confirmed?'ON THE CALENDAR':'YOUR MEETUP'}/><ScrollView contentContainerStyle={styles.screenBody} keyboardShouldPersistTaps="handled">
    <View style={styles.messageOrbit}><Photo uri={snap.user.profilePhoto} name={snap.user.name} style={[styles.orbitAvatar,{left:24,top:18}]}/><View style={styles.orbitCenter}><Ionicons name={confirmed?'checkmark':'stats-chart'} size={29} color="white"/></View><Photo uri={snap.partner!.profilePhoto} name={snap.partner!.name} style={[styles.orbitAvatar,{right:24,top:18}]}/></View>
    <Eyebrow>{cancelled?'ANOTHER TIME':'A LITTLE LESS BACK AND FORTH'}</Eyebrow><Text style={styles.pageTitle}>{cancelled?'Plans changed.':titles[m.stage]}</Text><Text style={styles.bodyCopy}>{cancelled?'This meetup was cancelled. Restart the demo when you’re ready.':copy[m.stage]}</Text>
    {snap.services.transport==='console'&&<ErrorNote message="Rehearsal mode: polls work here, and outbound messages appear in the backend terminal. No real texts are sent."/>}
    <ErrorNote message={error}/>{failed&&<ErrorNote message={m.deliveries.find(d=>d.status==='failed')?.error||'A message could not be sent. Retry below.'}/>}
    {!cancelled&&polls.map(p=><PollCard key={p.id} poll={p} delivered={m.deliveries.some(d=>d.pollId===p.id&&d.status==='sent')} busy={busy} onVote={onVote}/>)}
    {!cancelled&&!polls.length&&<View style={s.waiting}><Ionicons name="time-outline" size={23} color={COLORS.cobalt}/><Text style={[styles.smallBody,{flex:1}]}>{latest?`Your vote is saved: ${latest.options.find(o=>o.id===latest.selection)?.label}. Waiting for the next step.`:'Your next poll will appear here and in Messages.'}</Text></View>}
    {m.proposal&&<View style={s.plan}><Eyebrow>{confirmed?'CONFIRMED PLAN':`PLAN #${m.proposal.version}`}</Eyebrow><Text style={[styles.sectionTitle,{fontSize:23,marginTop:12,lineHeight:32}]}>{formatSlot(m.proposal)}</Text><Text style={styles.smallBody}>{m.activity?.name}</Text><Text style={styles.smallBody}>{confirmed?'No reservation or booking has been made.':`Confirm in the poll or text CONFIRM ${m.proposal.version}.`}</Text></View>}
    <View style={styles.agentCard}><View style={styles.agentHeader}><View style={styles.agentMark}><Text style={styles.agentMarkText}>L</Text></View><View style={{flex:1}}><Text style={styles.agentTitle}>Your plan, together</Text><Text style={styles.agentSub}>Activity → approval → time → confirm</Text></View><Text style={styles.liveLabel}>{cancelled?'CLOSED':confirmed?'CONFIRMED':pending?'SENDING':'LIVE'}</Text></View>{m.participants.map(p=>{const pref=m.preferences[p.id],yes=!!m.proposal&&pref.confirmedVersion===m.proposal.version;return <View key={p.id} style={s.personStatus}><Photo uri={p.profilePhoto} name={p.name} style={{width:36,height:36,borderRadius:18}}/><View style={{flex:1}}><Text style={styles.detailStrong}>{p.id===snap.user.id?'You':p.name}{p.id===m.chooserId?' · activity lead':''}</Text><Text style={styles.smallMuted}>{yes?'Plan confirmed':pref.timeVote?'Time vote received':pref.activityAnswer==='yes'&&pref.windows.length?'Activity approved · availability saved':pref.activityAnswer==='yes'?'Activity approved':m.activity?'Reviewing the activity':'Choosing an adventure'}</Text></View><Ionicons name={yes?'checkmark-circle':'time-outline'} color={COLORS.cobalt} size={22}/></View>;})}</View>
    {m.activity?<ActivityCard activity={m.activity}/>:<ActivityIdeas activities={m.activities}/>}
    {!cancelled&&m.chooserId===snap.user.id&&<SuggestActivity busy={busy} onSuggest={onSuggest}/>}
    {!cancelled&&<AppButton onPress={onRetry} busy={busy} variant={failed?'primary':'secondary'}>{failed?'Retry failed messages':'Check / retry delivery'}</AppButton>}<AppButton onPress={onBack} variant="quiet">Back to discovery</AppButton><AppButton onPress={onSettings} variant="quiet">Demo settings</AppButton>
  </ScrollView></SafeAreaView>;
}

function Settings({snap,onBack,onLogout,onRestart,busy,error}:{snap:Snapshot;onBack:()=>void;onLogout:()=>void;onRestart:()=>void;busy:boolean;error:string}){
  const [confirm,setConfirm]=useState(false);
  return <SafeAreaView style={styles.safe}><Header onBack={onBack} label="YOUR CORNER"/><ScrollView contentContainerStyle={styles.screenBody}><Wordmark compact/><Text style={styles.pageTitle}>Hey, {snap.user.name}.</Text><Text style={styles.bodyCopy}>{snap.user.phone}{'\n'}{snap.user.neighborhood}</Text><View style={styles.agentCard}><Eyebrow>DEMO CONNECTION</Eyebrow><Text style={styles.smallBody}>{snap.services.photon?'Photon connected':'Photon needs setup'} · {snap.services.gemini?'Gemini key configured':'Gemini key missing'}</Text><Text style={styles.smallMuted}>{snap.services.message}</Text><Text style={styles.smallMuted}>{snap.services.polls==='native'?'Native iMessage polls':'Numbered text polls'} · Gemini understands free-text replies</Text><Text selectable style={styles.smallMuted}>{API_BASE_URL}</Text></View><ErrorNote message={error}/><AppButton onPress={()=>setConfirm(!confirm)} variant="secondary">Restart demo for both people</AppButton>{confirm&&<View style={styles.agentCard}><Text style={styles.smallBody}>This clears both people’s swipes and current meetup. Profiles stay. Old texts remain on your phones; reply to the new introduction after matching again.</Text><AppButton busy={busy} onPress={onRestart}>Yes, restart both</AppButton><AppButton variant="quiet" onPress={()=>setConfirm(false)}>Keep current meetup</AppButton></View>}<AppButton onPress={onLogout} variant="quiet">Switch person on this device</AppButton><Text style={styles.finePrint}>Demo accounts use phone entry without verification. Sample portraits and profiles are illustrative.</Text></ScrollView></SafeAreaView>;
}

export default function App(){return <SafeAreaProvider><DemoApp/></SafeAreaProvider>;}
function DemoApp(){
  const [token,setToken]=useState<string|null>(null),[loaded,setLoaded]=useState(false),[snap,setSnap]=useState<Snapshot|null>(null),[tab,setTab]=useState<Tab>('discover'),[busy,setBusy]=useState(false),[error,setError]=useState(''),[connectionError,setConnectionError]=useState(''),[notice,setNotice]=useState('');
  const busyRef=useRef(false),mounted=useRef(true),generation=useRef(0),requestVersion=useRef(0);
  useEffect(()=>{mounted.current=true;AsyncStorage.getItem(SESSION).then(async value=>{if(value)return value;const legacy=await AsyncStorage.getItem('@blindspot/demo-v1');if(legacy){await AsyncStorage.setItem(SESSION,legacy);await AsyncStorage.removeItem('@blindspot/demo-v1');}return legacy;}).then(value=>{if(mounted.current)setToken(value);}).catch(()=>{}).finally(()=>{if(mounted.current)setLoaded(true);});return()=>{mounted.current=false;};},[]);
  const logout=useCallback(()=>{generation.current++;requestVersion.current++;setToken(null);setSnap(null);setError('');setConnectionError('');setTab('discover');void AsyncStorage.removeItem(SESSION);},[]);
  const accept=useCallback((next:Snapshot)=>{setSnap(previous=>{if(next.match&&!previous?.match)setTab(next.match.startedAt?'planning':'match');return next;});},[]);
  useEffect(()=>{
    if(!token)return;
    let active=true,inFlight=false;
    const poll=async()=>{if(!active||inFlight||AppState.currentState==='background')return;inFlight=true;const version=++requestVersion.current;
      try{const next=await api.state(token);if(active&&version===requestVersion.current){accept(next);setConnectionError('');}}
      catch(e){if(active&&version===requestVersion.current){if(e instanceof ApiError&&e.status===401)logout();else setConnectionError(e instanceof Error?e.message:'Connection interrupted.');}}
      finally{inFlight=false;}
    };
    void poll();const timer=setInterval(()=>void poll(),2500);const listener=AppState.addEventListener('change',state=>{if(state==='active')void poll();});
    return()=>{active=false;clearInterval(timer);listener.remove();};
  },[token,accept,logout]);
  useEffect(()=>{const sub=BackHandler.addEventListener('hardwareBackPress',()=>{if(tab!=='discover'){setTab('discover');return true;}return false;});return()=>sub.remove();},[tab]);
  const run=async(work:()=>Promise<void>)=>{if(busyRef.current)return;busyRef.current=true;setBusy(true);setError('');try{await work();}catch(e){setError(e instanceof Error?e.message:'Something went wrong. Please retry.');}finally{busyRef.current=false;setBusy(false);}};
  const mutate=async(fn:()=>Promise<Snapshot>)=>{const g=generation.current;const result=await fn();if(g!==generation.current)return;requestVersion.current++;accept(result);};
  const join=(name:string,phone:string,consent:boolean)=>void run(async()=>{const result=await api.register(name,phone,consent);await AsyncStorage.setItem(SESSION,result.token);setToken(result.token);setTab('discover');});
  const swipe=async(id:string,d:'like'|'pass')=>{let saved=false;await run(async()=>{await mutate(()=>api.swipe(token!,id,d));saved=true;setNotice(id.startsWith('sample-')?(d==='like'?'Like saved. Sample profiles won’t create a match.':'On to the next neighbor.'):'');});return saved;};
  const text=()=>{if(snap?.match?.startedAt){setError('');setTab('planning');return;}void run(async()=>{await mutate(()=>api.text(token!));setTab('planning');});};
  let content;
  if(!loaded||(token&&!snap))content=<SafeAreaView style={[styles.safe,{justifyContent:'center',padding:24,gap:20}]}><Wordmark/><ActivityIndicator color={COLORS.cobalt}/><Text style={styles.bodyCopy}>Finding your corner…</Text><ErrorNote message={error||connectionError}/>{(error||connectionError)?<AppButton onPress={logout} variant="secondary">Back to welcome</AppButton>:null}</SafeAreaView>;
  else if(!token||!snap)content=<Login onJoin={join} busy={busy} error={error||connectionError}/>;
  else if(!snap.user.ready)content=<Profile snapshot={snap} busy={busy} error={error||connectionError} onLogout={logout} onSave={p=>void run(()=>mutate(()=>api.profile(token,p)))}/>;
  else if(tab==='settings')content=<Settings snap={snap} onBack={()=>setTab('discover')} onLogout={logout} busy={busy} error={error||connectionError} onRestart={()=>void run(async()=>{await mutate(()=>api.restart(token));setNotice('');setTab('discover');})}/>;
  else if(tab==='match'&&snap.match)content=<MatchScreen snap={snap} onText={text} onBack={()=>setTab('discover')} busy={busy} error={error||connectionError}/>;
  else if(tab==='planning'&&snap.match)content=<Planning snap={snap} onVote={(pollId,optionId)=>void run(()=>mutate(()=>api.vote(token,pollId,optionId)))} onSuggest={input=>void run(()=>mutate(()=>api.suggest(token,input)))} onBack={()=>setTab('discover')} onRetry={()=>void run(()=>mutate(()=>api.text(token)))} onSettings={()=>setTab('settings')} busy={busy} error={error||connectionError}/>;
  else content=<Discover snap={snap} onSwipe={swipe} onSettings={()=>setTab('settings')} onMatch={()=>setTab(snap.match?.startedAt?'planning':'match')} onReview={()=>void run(()=>mutate(()=>api.review(token)))} busy={busy} error={error||connectionError} notice={notice}/>;
  return <View style={styles.app}><StatusBar barStyle="dark-content"/>{content}</View>;
}
const s=StyleSheet.create({idea:{flexDirection:'row',gap:12,alignItems:'center',paddingVertical:12},pollCard:{backgroundColor:COLORS.cream,borderWidth:2,borderColor:COLORS.ink,borderRadius:20,padding:20,marginVertical:12},pollHeader:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'},pollOption:{flexDirection:'row',alignItems:'center',gap:12,padding:14,borderWidth:1,borderColor:'#DACDBB',borderRadius:12,marginTop:8},pollSelected:{backgroundColor:COLORS.lavender,borderColor:COLORS.cobalt},waiting:{flexDirection:'row',gap:12,padding:16,backgroundColor:COLORS.lavender,borderRadius:14,marginVertical:12},consent:{flexDirection:'row',alignItems:'center',gap:10,marginBottom:10},consentText:{flex:1,fontSize:12,lineHeight:18,color:COLORS.muted},empty:{paddingVertical:36,gap:18},notice:{fontSize:12,color:COLORS.cobalt,marginTop:12,lineHeight:18},personStatus:{flexDirection:'row',alignItems:'center',gap:10,paddingVertical:7},plan:{backgroundColor:COLORS.sage,borderWidth:2,borderColor:COLORS.ink,borderRadius:16,padding:18,marginVertical:12}});
