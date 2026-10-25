import type {AppData} from './domain';
import {API_URL} from './serviceConfig';
import {serviceHeaders} from './serviceAuth';
import {validReceipt,type VoiceReceipt} from './voiceInbox';
const sent=new Map<string,string>();
// The app acknowledges only receipt IDs from its already-persisted AppData.
// A lost response or restart safely replays the same IDs.
export async function syncAssistant(data:AppData):Promise<VoiceReceipt[]> {
 if(!data.settings.assistantSync)return [];
 const profileKey=data.babyId||'legacy';
 const snapshot=JSON.stringify(data);
 const response=await fetch(API_URL+'/api/voice/sync',{method:'POST',headers:await serviceHeaders(),body:JSON.stringify({profileKey,...(sent.get(profileKey)===snapshot?{}:{data}),acknowledgements:data.voiceReceiptIds||[]}),signal:AbortSignal.timeout(8000)});
 if(!response.ok)throw Error('ASSISTANT_SYNC_FAILED');
 const body=await response.json();
 if(!Array.isArray(body.receipts)||!body.receipts.every(validReceipt))throw Error('INVALID_RECEIPTS');
 sent.set(profileKey,snapshot);
 return body.receipts.filter((r:VoiceReceipt)=>(r.profileKey||'legacy')===profileKey);
}
