import {checkCancelled} from './cancellation';
// AbortSignal alone cannot settle an unresponsive native transport/body reader.
// Race the whole operation, including auth, reading the response and retries.
export async function requestDeadline<T>(operation:(signal:AbortSignal)=>Promise<T>,external?:AbortSignal,ms=85000):Promise<T>{
 checkCancelled(external);
 const controller=new AbortController();
 let rejectDeadline!:(error:Error)=>void;
 const cancelled=new Promise<never>((_,reject)=>{rejectDeadline=reject;});
 const stop=(timeout:boolean)=>{
  const error=new Error(timeout?'AI_REQUEST_TIMEOUT':'Request cancelled');
  error.name=timeout?'Error':'AbortError';
  rejectDeadline(error);controller.abort();
 };
 const abort=()=>stop(false);
 external?.addEventListener('abort',abort,{once:true});
 const timer=setTimeout(()=>stop(true),ms);
 try{return await Promise.race([operation(controller.signal),cancelled]);}
 finally{clearTimeout(timer);external?.removeEventListener('abort',abort);}
}
