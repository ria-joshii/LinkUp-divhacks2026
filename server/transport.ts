import { poll, type Content, type ContentInput } from 'spectrum-ts';
import { optionTitle, pollTitle, type Send } from './engine';
import type { MeetupPoll } from '../shared/types';

type Chat = { send(content:ContentInput):Promise<{id:string}|undefined> };
export async function deliver(chat:Chat,text:string,ballot?:MeetupPoll,textOnly=false):ReturnType<Send> {
  if(ballot&&!textOnly){
    try{
      const sent=await chat.send(poll(pollTitle(ballot),ballot.options.map(o=>optionTitle(ballot,o))));
      if(!sent)throw new Error('Photon returned no poll receipt. Retry delivery.');
      return {mode:'native',messageId:sent.id};
    }catch(error){
      // Do not retry as text after a timeout or an uncertain send: it may duplicate a poll.
      if(!/unsupported|not supported|unimplemented/i.test(error instanceof Error?error.message:''))throw error;
    }
  }
  const sent=await chat.send(text);
  if(!sent)throw new Error('Photon returned no message receipt. Retry delivery.');
  return {mode:'text',messageId:sent.id};
}
export function unwrapContent(content:Content):Content {
  return content.type==='reply'?unwrapContent(content.content):content;
}
