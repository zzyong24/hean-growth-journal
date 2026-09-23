import {checkCancelled} from "./cancellation";
// Retry inference only, never a write. The caller captures its original clock/context/body.
export async function withTransientRetry<T>(operation:()=>Promise<T>,signal?:AbortSignal,delayMs=1200):Promise<T> {
 for(let attempt=0;;attempt++) {
  checkCancelled(signal);
  try{return await operation();}catch(error){
   const message=error instanceof Error?error.message:'';
   if(signal?.aborted||attempt>=1||!(error instanceof TypeError||(error instanceof Error&&error.name==='TimeoutError')||/PROVIDER_(?:429|5\d\d|STREAM_ERROR)|SERVICE_ERROR|PROVIDER_TIMEOUT|UPSTREAM_UNAVAILABLE|INCOMPLETE_RESPONSE|upstream_error|fetch failed|Network request failed/.test(message)))throw error;
   await new Promise<void>((resolve,reject)=>{
    const abort=()=>{clearTimeout(timer);reject(signal?.reason);};
    const timer=setTimeout(()=>{signal?.removeEventListener('abort',abort);resolve();},delayMs);
    signal?.addEventListener('abort',abort,{once:true});
   });
  }
 }
}
