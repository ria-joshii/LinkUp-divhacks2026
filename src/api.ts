import Constants from 'expo-constants';
import { Platform } from 'react-native';
import type { ActivitySuggestion, ProfileInput, Snapshot } from '../shared/types';

const expoHost=Constants.expoConfig?.hostUri?.split(':')[0];
const webHost=Platform.OS==='web' && typeof window!=='undefined'?window.location.hostname:undefined;
export const API_BASE_URL=process.env.EXPO_PUBLIC_API_BASE_URL?.trim().replace(/\/$/,'') || `http://${webHost||expoHost||'localhost'}:8787`;
export class ApiError extends Error {constructor(message:string,readonly status=0){super(message);}}
async function request<T>(path:string,token?:string,payload?:unknown):Promise<T>{
  const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),30000);
  try{
    const response=await fetch(API_BASE_URL+path,{method:payload===undefined?'GET':'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},body:payload===undefined?undefined:JSON.stringify(payload),signal:controller.signal});
    const data=await response.json();
    if(!response.ok)throw new ApiError(data.error||'That request did not work.',response.status);
    return data as T;
  }catch(error){
    if(error instanceof ApiError)throw error;
    throw new ApiError(`Cannot reach the backend at ${API_BASE_URL}. Keep “npm run server” running and connect both phones to your laptop’s Wi-Fi.`,0);
  }finally{clearTimeout(timeout);}
}
export const api={
  register:(name:string,phone:string,consent:boolean)=>request<{token:string}>('/session',undefined,{name,phone,consent}),
  state:(token:string)=>request<Snapshot>('/state',token),
  profile:(token:string,input:ProfileInput)=>request<Snapshot>('/me',token,input),
  swipe:(token:string,candidateId:string,decision:'like'|'pass')=>request<Snapshot>('/swipes',token,{candidateId,decision}),
  review:(token:string)=>request<Snapshot>('/review',token,{}),
  text:(token:string)=>request<Snapshot>('/match/text',token,{}),
  vote:(token:string,pollId:string,optionId:string)=>request<Snapshot>('/poll/vote',token,{pollId,optionId}),
  suggest:(token:string,suggestion:ActivitySuggestion)=>request<Snapshot>('/match/suggest',token,suggestion),
  restart:(token:string)=>request<Snapshot>('/demo/restart',token,{}),
};
