import { AppData } from './domain';
import { VoiceReceipt } from './voiceInbox';
export async function configureVoice(_data:AppData) {}
export async function readVoiceReceipts(_babyId:string):Promise<VoiceReceipt[]> { return []; }
export async function clearVoiceStorage(_babyId:string) {}
