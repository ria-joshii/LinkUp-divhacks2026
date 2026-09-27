import { existsSync, rmSync } from 'node:fs';
import { createInterface } from 'node:readline/promises';
import { fileURLToPath } from 'node:url';
const rl=createInterface({input:process.stdin,output:process.stdout});
const answer=await rl.question('Stop the backend first. Clear BOTH demo profiles and the meetup? Type RESET: ');rl.close();
if(answer!=='RESET'){console.log('Kept demo data.');process.exit(0);}
const data=fileURLToPath(new URL('../server/data/demo.json',import.meta.url));
if(existsSync(data))rmSync(data);
console.log('Cleared demo data. Start npm run server again. Both phones will return to welcome on their next refresh. Your .env is untouched.');
