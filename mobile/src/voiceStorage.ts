import {loadProviders} from './providers/config';
import {serviceToken} from "./serviceAuth";
import { Directory, File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';
import { AppData } from './domain';
import { babyContext } from './babyContext';
import { API_URL } from './api';
import { validReceipt, VoiceReceipt } from './voiceInbox';
const dir=()=>new Directory(Paths.document,'baby-voice');
export async function configureVoice(data:AppData) {
 if(Platform.OS!=='ios')return;
 const folder=dir();folder.create({intermediates:true,idempotent:true});
 const config=new File(folder,'config.json');
 const temporary=new File(folder,'config.tmp');
 const direct=(await loadProviders()).mode==='direct';
 temporary.write(JSON.stringify({enabled:!direct&&!!data.settings.voiceQuickRecord,processedReceipts:data.voiceReceiptIds || [],profileKey:data.babyId || "legacy",apiURL:API_URL,token:direct?'':await serviceToken(),profile:data.profile,language:data.settings.language,babyContext:babyContext(data)}));
 // The native reader treats an unavailable config as disabled; no partial JSON is read.
 if(config.exists)config.delete();
 temporary.moveSync(config);
}
export async function readVoiceReceipts(babyId:string):Promise<VoiceReceipt[]> {
 if(Platform.OS!=='ios'||!dir().exists)return [];
 const result:VoiceReceipt[]=[];
 for(const item of dir().list()) {
  if(!(item instanceof File)||!item.name.endsWith('.json')||item.name==='config.json')continue;
  const raw=JSON.parse(await item.text());
  if(validReceipt(raw) && (raw.profileKey || "legacy") === babyId) {
   if(raw.status==='processing' && Date.now()-Date.parse(raw.capturedAt)>90000) {
    raw.status='failed';raw.reply='这笔处理被中断，原话已保留，尚未记入日常。';
   }
   result.push(raw);
  }
 }
 return result;
}
export async function clearVoiceStorage(babyId:string) { if(Platform.OS!=='ios'||!dir().exists)return;for(const item of dir().list()){if(item instanceof File && item.name.endsWith('.json') && item.name!=='config.json'){const raw=JSON.parse(await item.text());if((raw.profileKey||"legacy")===babyId)item.delete();}} }
