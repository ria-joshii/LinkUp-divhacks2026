import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { createMatch } from './engine';
import type { Delivery, Match, Person } from '../shared/types';

export type StoredUser = Person & { phone: string; token: string; consent: boolean };
export type State = {
  version: 2; users: StoredUser[]; swipes: Record<string, Record<string, 'like' | 'pass'>>;
  match: Match | null; deliveries: Delivery[]; seenMessages: string[];
  history: Record<string, {role:'user'|'assistant'; text:string}[]>;
};
export const emptyState = (): State => ({ version:2, users:[], swipes:{}, match:null, deliveries:[], seenMessages:[], history:{} });
export class Store {
  state: State;
  constructor(readonly path?: string) {
    this.state = path && existsSync(path) ? JSON.parse(readFileSync(path,'utf8')) as State : emptyState();
    if ((this.state as {version:number}).version === 1 && Array.isArray(this.state.users)) {
      if(path)writeFileSync(path+'.v1-backup',readFileSync(path),{mode:0o600});
      // Preserve profiles and the mutual match, but restart the obsolete restaurant plan.
      if(this.state.match)this.state.match=createMatch(this.state.users);
      this.state.deliveries=[];this.state.history={};this.state.version=2;this.save();
    }
    if (this.state.version !== 2 || !Array.isArray(this.state.users)) throw new Error('Unrecognized demo data. Keep a backup and run npm run reset-demo.');
  }
  save() {
    if (!this.path) return;
    mkdirSync(dirname(this.path),{recursive:true});
    writeFileSync(`${this.path}.tmp`,JSON.stringify(this.state,null,2),{mode:0o600});
    renameSync(`${this.path}.tmp`,this.path);
  }
}
// Serialize both HTTP mutations and incoming texts for this two-person demo.
export class SerialQueue {
  private tail: Promise<unknown> = Promise.resolve();
  run<T>(job: () => Promise<T> | T): Promise<T> {
    const result=this.tail.then(job);
    this.tail=result.catch(()=>{});
    return result;
  }
}
