import {requestDeadline} from '../requestDeadline';
import {checkCancelled} from '../cancellation';
export class ProviderError extends Error {constructor(public status:number){super('MODEL_HTTP_'+status);}}
export async function retryProvider<T>(run:(signal:AbortSignal)=>Promise<T>,config:{timeoutSeconds:number;retries:number},signal?:AbortSignal):Promise<T>{
 for(let attempt=0;;attempt++){
  checkCancelled(signal);
  try{return await requestDeadline(run,signal,config.timeoutSeconds*1000);}
  catch(e){checkCancelled(signal);const retry=e instanceof TypeError||e instanceof ProviderError&&(e.status===429||e.status>=500)||e instanceof Error&&['AI_REQUEST_TIMEOUT','INVALID_MODEL_RESPONSE'].includes(e.message);if(!retry||attempt>=config.retries)throw e;}
  await new Promise<void>((resolve,reject)=>{const stop=()=>{clearTimeout(timer);signal?.removeEventListener('abort',stop);const e=new Error('Cancelled');e.name='AbortError';reject(e);};const timer=setTimeout(()=>{signal?.removeEventListener('abort',stop);resolve();},Math.min(1000*2**attempt,10000));signal?.addEventListener('abort',stop,{once:true});});
 }
}
