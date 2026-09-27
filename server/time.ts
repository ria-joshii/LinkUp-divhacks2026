import type { Window } from '../shared/types';
export function nyNow(now=new Date()): {date:string; time:string} {
  const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(now);
  const get=(key:string)=>parts.find(p=>p.type===key)!.value;
  return {date:`${get('year')}-${get('month')}-${get('day')}`,time:`${get('hour')}:${get('minute')}`};
}
export function minutes(time:string) { const [h,m]=time.split(':').map(Number); return h*60+m; }
export function clock(min:number) { return `${String(Math.floor(min/60)).padStart(2,'0')}:${String(min%60).padStart(2,'0')}`; }
export function validWindow(w:Window, now=new Date()) {
  if (!w || typeof w.date!=='string' || !/^\d{4}-\d{2}-\d{2}$/.test(w.date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(w.start) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(w.end)) return false;
  const timestamp=Date.parse(w.date+'T12:00:00Z');
  if (!Number.isFinite(timestamp) || new Date(timestamp).toISOString().slice(0,10)!==w.date) return false;
  return (w.date!==nyNow(now).date || minutes(w.end)>minutes(nyNow(now).time)+15) && w.date>=nyNow(now).date && w.date<=nyNow(new Date(now.getTime()+31*86400000)).date && minutes(w.end)>minutes(w.start);
}
export function overlapOptions(a:Window[],b:Window[],duration:number,now=new Date(),outdoor=false):Window[] {
  const current=nyNow(now),options:Window[]=[];
  for(const x of a)for(const y of b){
    if(x.date!==y.date||!validWindow(x,now)||!validWindow(y,now))continue;
    let start=Math.max(minutes(x.start),minutes(y.start),outdoor?9*60:0);
    if(x.date===current.date)start=Math.max(start,minutes(current.time)+15);
    start=Math.ceil(start/30)*30;
    const end=Math.min(minutes(x.end),minutes(y.end),outdoor?18*60:24*60);
    for(;start+duration<=end;start+=30)options.push({date:x.date,start:clock(start),end:clock(start+duration)});
  }
  const unique=[...new Map(options.map(w=>[JSON.stringify(w),w])).values()].sort((x,y)=>(x.date+x.start).localeCompare(y.date+y.start));
  // Spread choices across available days before offering a second time on one day.
  const firstByDay=[...new Map(unique.map(w=>w.date).map(date=>[date,unique.find(w=>w.date===date)!])).values()];
  return [...firstByDay,...unique.filter(w=>!firstByDay.includes(w))].slice(0,3);
}
export function suggestedWindows(now=new Date(),outdoor=false):Window[]{
  const date=nyNow(now).date;
  return [1,2].flatMap(offset=>{
    const d=new Date(date+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+offset);
    return (outdoor?[['10:00','13:00'],['14:00','17:00']]:[['14:00','17:00'],['17:00','20:00']]).map(([start,end])=>({date:d.toISOString().slice(0,10),start,end}));
  });
}
export function formatWindow(w:Window) {
  const day=new Intl.DateTimeFormat('en-US',{weekday:'long',month:'short',day:'numeric',timeZone:'UTC'}).format(new Date(w.date+'T12:00:00Z'));
  const human=(t:string)=>{const [h,m]=t.split(':').map(Number);return `${h%12||12}${m?':'+String(m).padStart(2,'0'):''} ${h>=12?'PM':'AM'}`;};
  return `${day}, ${human(w.start)}–${human(w.end)} (New York time)`;
}
