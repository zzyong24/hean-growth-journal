import {spawnSync} from 'node:child_process';
import {existsSync,readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const api=process.env.EXPO_PUBLIC_API_URL,team=process.env.IOS_TEAM_ID;
let url;try{url=new URL(api);}catch{throw Error('Set EXPO_PUBLIC_API_URL to your production HTTPS origin');}
if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash||url.pathname!=='/'||url.hostname==='localhost'||url.hostname.endsWith('.example.com'))throw Error('A real HTTPS origin is required');
if(!/^[A-Z0-9]{10}$/.test(team||''))throw Error('Set IOS_TEAM_ID to your Apple development team ID');
if(process.env.EXPO_PUBLIC_GUEST_AUTH!=='true'&&!process.env.EXPO_PUBLIC_APP_TOKEN)throw Error('Configure guest authentication or an application access token');
const native=path.join(root,'mobile/ios');
if(!existsSync(path.join(native,'app.xcworkspace')))throw Error('First run: cd mobile && npx expo prebuild --platform ios');
const output=path.resolve(root,process.env.IOS_BUILD_DIR||'.codex/ios-release');
const args=['-workspace','app.xcworkspace','-scheme','app','-configuration','Release','-destination','generic/platform=iOS','-derivedDataPath',output,'DEVELOPMENT_TEAM='+team,'CODE_SIGN_STYLE=Automatic','-allowProvisioningUpdates','build'];
if(process.argv.includes('--dry-run')){console.log('Production API:',url.origin);console.log('xcodebuild',args.join(' '));process.exit(0);}
const result=spawnSync('xcodebuild',args,{cwd:native,env:{...process.env,NODE_ENV:'production'},stdio:'inherit'});
if(result.status!==0)process.exit(result.status||1);
const bundle=readFileSync(path.join(output,'Build/Products/Release-iphoneos/app.app/main.jsbundle'));
if(!bundle.includes(Buffer.from(url.origin))||bundle.includes(Buffer.from('http://localhost:8787')))throw Error('Bundle API verification failed; do not install this build');
console.log('Release bundle contains the intended API origin:',url.origin);
