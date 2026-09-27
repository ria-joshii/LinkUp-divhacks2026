import { copyFileSync, constants, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url));
const [major,minor]=process.versions.node.split('.').map(Number);
if(!((major===22&&minor>=13)||(major===24&&minor>=3)||major>24)){
  console.error(`Your Node version is ${process.version}. Use Node 22.13+ or Node 24.3+ for this Expo SDK.`);process.exit(1);
}
const destination=resolve(root,'.env');
if(!existsSync(destination)){copyFileSync(resolve(root,'.env.example'),destination,constants.COPYFILE_EXCL);console.log('Created .env in this project.');}
else console.log('Your existing .env was kept.');
console.log('Open .env and fill in PROJECT_ID, PROJECT_SECRET, and GEMINI_API_KEY.');
console.log('Then run npm run server here. In a second terminal in THIS SAME folder, run npm start.');
console.log('The app detects your laptop address automatically. Scan the QR code on both phones.');
