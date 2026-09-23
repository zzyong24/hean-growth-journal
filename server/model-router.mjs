// Routes inference only. Persistence stays in the caller's atomic record transaction.
export function createModelRouter({cooldownMs=60000,clock=Date.now,log=entry=>console.info(JSON.stringify(entry))}={}) {
 const circuits=new Map();
 return async function route({providers,run,validate,signal,totalMs=80000,hedgeAfterMs}) {
  signal?.throwIfAborted();
  const deadline=clock()+totalMs;
  if(hedgeAfterMs!=null&&providers.length>1){
   const group=new AbortController();const cancel=()=>group.abort(signal.reason);
   signal?.addEventListener('abort',cancel,{once:true});
   const attempts=[];
   try{
    for(const provider of providers){
     const previous=attempts.at(-1);
     attempts.push((async()=>{
      if(previous)await new Promise((resolve,reject)=>{
       const finish=()=>{clearTimeout(timer);group.signal.removeEventListener('abort',stop);resolve();};
       const stop=()=>{clearTimeout(timer);group.signal.removeEventListener('abort',stop);reject(group.signal.reason);};
       const timer=setTimeout(finish,hedgeAfterMs);group.signal.addEventListener('abort',stop,{once:true});
       previous.catch(finish);
      });
      group.signal.throwIfAborted();
      return route({providers:[provider],run,validate,signal:group.signal,totalMs:Math.max(0,deadline-clock())});
     })());
    }
    return await Promise.any(attempts);
   }catch(error){signal?.throwIfAborted();throw new Error('AI_PROVIDERS_UNAVAILABLE');}
   finally{group.abort(new DOMException('Request settled','AbortError'));signal?.removeEventListener('abort',cancel);}
  }
  for(const provider of providers){
   signal?.throwIfAborted();
   const state=circuits.get(provider.id)||{until:0,probe:false};
   if(state.until>clock()||state.probe)continue;
   const remaining=deadline-clock();if(remaining<=0)break;
   const recovering=state.until>0;if(recovering)state.probe=true;
   circuits.set(provider.id,state);
   const controller=new AbortController(),started=clock();
   const abort=()=>controller.abort(signal.reason);
   signal?.addEventListener('abort',abort,{once:true});
   const timer=setTimeout(()=>controller.abort(new DOMException('Provider deadline exceeded','TimeoutError')),Math.min(provider.timeoutMs,remaining));
   let rejectAbort;
   try {
    const cancelled=new Promise((_,reject)=>{rejectAbort=()=>reject(controller.signal.reason);controller.signal.addEventListener('abort',rejectAbort,{once:true});});
    const raw=await Promise.race([run(provider,controller.signal),cancelled]);
    signal?.throwIfAborted();
    const result=validate(raw);
    circuits.delete(provider.id);
    log({event:'model_attempt',provider:provider.id,outcome:'success',ms:clock()-started});
    return result;
   }catch(error){
    if(signal?.aborted)throw signal.reason;
    const code=error.name==='TimeoutError'?'TIMEOUT':error.name==='SyntaxError'?'INVALID_JSON':/^(PROVIDER_\d+|INVALID_UPDATE_TARGET|INVALID_MODEL_RESPONSE|MODEL_OUTPUT_LIMIT|PROVIDER_STREAM_ERROR)$/.test(error.message)?error.message:'INVALID_OR_FAILED_RESPONSE';
    state.until=clock()+cooldownMs;
    log({event:'model_attempt',provider:provider.id,outcome:code,ms:clock()-started});
   }finally{
    clearTimeout(timer);signal?.removeEventListener('abort',abort);
    controller.signal.removeEventListener('abort',rejectAbort);state.probe=false;
   }
  }
  throw new Error('AI_PROVIDERS_UNAVAILABLE');
 };
}
export const routeModel=createModelRouter();
export function configuredModels(env=process.env){
 const qwen=env.QWEN_TEXT_MODEL&&env.DASHSCOPE_API_KEY;
 const models=[qwen?{id:'qwen',key:env.DASHSCOPE_API_KEY,url:(env.DASHSCOPE_COMPATIBLE_URL||'https://dashscope.aliyuncs.com/compatible-mode/v1').replace(/\/$/,'')+'/chat/completions',timeoutMs:60000,options:{model:env.QWEN_TEXT_MODEL,enable_thinking:true,thinking_budget:2048,max_tokens:8000}}:env.DUDU_API_KEY&&{id:'primary',key:env.DUDU_API_KEY,url:(env.DUDU_BASE_URL||'https://dudu.mom/v1').replace(/\/$/,'')+'/chat/completions',timeoutMs:env.MINIMAX_API_KEY?60000:80000,options:{model:env.DUDU_MODEL||'gpt-5.6-sol',reasoning_effort:'low'}},
 env.MINIMAX_API_KEY&&{id:'minimax',key:env.MINIMAX_API_KEY,url:(env.MINIMAX_BASE_URL||'https://api.minimax.cn/v1').replace(/\/$/,'')+'/chat/completions',timeoutMs:60000,options:{model:env.MINIMAX_MODEL||'MiniMax-M3',reasoning_split:true,thinking:{type:'adaptive'},max_tokens:10000}}].filter(Boolean);
 return models.sort((a,b)=>Number(b.id===env.AI_PRIMARY_PROVIDER)-Number(a.id===env.AI_PRIMARY_PROVIDER));
}
