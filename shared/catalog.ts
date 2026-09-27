import type { Activity, Person } from './types';

export const PHOTOS = [
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?crop=faces&fit=crop&w=650&h=780&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?crop=faces&fit=crop&w=650&h=780&q=80',
  'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?crop=faces&fit=crop&w=650&h=780&q=80',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?crop=faces&fit=crop&w=650&h=780&q=80',
];
export const DUMMIES: Person[] = [
  {id:'sample-maya',name:'Maya',neighborhood:'Jackson Heights',residentType:'Local',interests:['Jazz','Dumplings','Bookstores'],cuisines:['Nepali','Thai'],availability:['Weeknights'],profilePhoto:PHOTOS[0],isDemo:true,ready:true},
  {id:'sample-theo',name:'Theo',neighborhood:'Crown Heights',residentType:'New to the neighborhood',interests:['Running','Coffee','Art galleries'],cuisines:['Japanese'],availability:['Saturday'],profilePhoto:PHOTOS[1],isDemo:true,ready:true},
  {id:'sample-jules',name:'Jules',neighborhood:'East Village',residentType:'Local',interests:['Film','Coffee','Thrifting'],cuisines:['Italian'],availability:['Sunday'],profilePhoto:PHOTOS[2],isDemo:true,ready:true},
];
// Curated NYC starting points. These are ideas, not live bookings or checked hours.
export const ACTIVITIES: Activity[] = [
  {id:'village-explore',name:'Explore Greenwich Village',meetingPoint:'Washington Square Arch, Fifth Avenue at Washington Square North, NYC',neighborhood:'Greenwich Village',category:'Exploring',note:'Let the local lead a relaxed walk through favorite blocks and hidden corners.',url:'https://nycgovparks.org/parks/washington-square-park',durationMinutes:60,tags:['Exploring','Walking','Photography'],outdoor:true},
  {id:'ramble-hike',name:'Easy hike in the Ramble',meetingPoint:'Outside Belvedere Castle, Central Park, NYC',neighborhood:'Central Park',category:'Hiking',note:'A 90-minute woodland walk. Check weather and trail conditions; agree on a comfortable pace.',url:'https://www.centralparknyc.org/locations/the-ramble',durationMinutes:90,tags:['Hiking','Nature','Walking','Running'],outdoor:true},
  {id:'river-walk',name:'Hudson River photo walk',meetingPoint:'Entrance to Pier 45 at Christopher Street, Hudson River Park, NYC',neighborhood:'Greenwich Village',category:'Exploring',note:'River views, photos, and a relaxed conversation along the waterfront.',url:'https://hudsonriverpark.org/locations/pier-45/',durationMinutes:60,tags:['Photography','Exploring','Walking'],outdoor:true},
  {id:'park-games',name:'Board games in the park',meetingPoint:'Washington Square Arch, Fifth Avenue at Washington Square North, NYC',neighborhood:'Greenwich Village',category:'Games',note:'Bring a small game and find an available spot together. Check the forecast first.',url:'https://nycgovparks.org/parks/washington-square-park',durationMinutes:60,tags:['Board games','Picnics','Jazz'],outdoor:true},
  {id:'coffee-chat',name:'Coffee and neighborhood stories',meetingPoint:'Outside Caffe Reggio, 119 MacDougal Street, NYC',neighborhood:'Greenwich Village',category:'Coffee',note:'A seated option for an easy first hello. Check the current menu and hours before going.',url:'https://www.caffereggio.com/',durationMinutes:60,tags:['Coffee','Bookstores','Film'],outdoor:false},
];
export function suggestActivities(people: Person[]): Activity[] {
  const shared=people[0]?.interests.filter(tag=>people[1]?.interests.includes(tag))||[];
  const interests=people.flatMap(p=>p.interests);
  const score=(a:Activity)=>a.tags.reduce((n,t)=>n+(shared.includes(t)?4:interests.includes(t)?1:0),0)+(people.some(p=>p.neighborhood.toLowerCase()===a.neighborhood.toLowerCase())?2:0);
  return [...ACTIVITIES].sort((a,b)=>score(b)-score(a));
}
