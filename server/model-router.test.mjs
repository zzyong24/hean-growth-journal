import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createModelRouter,configuredModels} from './model-router.mjs';
const providers=[{id:'primary',timeoutMs:10},{id:'backup',timeoutMs:100}];
test('explicit direct Qwen configuration keeps MiniMax fallback and disables failing legacy relay',()=>{
 const models=configuredModels({QWEN_TEXT_MODEL:'qwen3.8-flash',DASHSCOPE_API_KEY:'q',DUDU_API_KEY:'d',MINIMAX_API_KEY:'m',AI_PRIMARY_PROVIDER:'qwen'});
 assert.deepEqual(models.map(p=>p.id),['qwen','minimax']);
 assert.equal(models[0].options.enable_thinking,true);assert.equal(models[0].options.thinking_budget,2048);
});
test('operators can make the working provider first without dropping fallback',()=>{
 const env={DUDU_API_KEY:'a',MINIMAX_API_KEY:'b',AI_PRIMARY_PROVIDER:'minimax'};
 assert.deepEqual(configuredModels(env).map(x=>x.id),['minimax','primary']);
});
test('timeout falls back; cooling primary is skipped; only validated result returns',async()=>{
 const seen=[];const router=createModelRouter({cooldownMs:1000,log:()=>{}});
 const run=(p,s)=>{seen.push(p.id);return p.id==='backup'?Promise.resolve('good'):new Promise((_,reject)=>s.addEventListener('abort',()=>reject(s.reason),{once:true}));};
 assert.equal(await router({providers,run,validate:x=>x,totalMs:200}),'good');
 assert.equal(await router({providers,run,validate:x=>x,totalMs:200}),'good');
 assert.deepEqual(seen,['primary','backup','backup']);
});
test('invalid primary output falls back, cancellation never starts backup',async()=>{
 const router=createModelRouter({log:()=>{}}),seen=[];
 assert.equal(await router({providers,run:async p=>p.id,validate:x=>{if(x==='primary')throw Error('INVALID_MODEL_RESPONSE');return x;}}),'backup');
 const c=new AbortController();c.abort();
 await assert.rejects(router({providers,signal:c.signal,run:async p=>{seen.push(p.id);return p.id;},validate:x=>x}));
 assert.deepEqual(seen,[]);
});
test('exhaustion has stable non-retryable error and no payload leakage',async()=>{
 const logs=[];const router=createModelRouter({log:x=>logs.push(x)});
 await assert.rejects(router({providers,run:async()=>{throw Error('secret user payload')},validate:x=>x}),/AI_PROVIDERS_UNAVAILABLE/);
 assert.equal(JSON.stringify(logs).includes('secret'),false);
});
test('cooldown permits a single recovery probe after expiry',async()=>{
 let now=0;const router=createModelRouter({clock:()=>now,cooldownMs:10,log:()=>{}});let calls=0;
 const request={providers,validate:x=>x,run:async p=>{if(p.id==='primary'&&calls++===0)throw Error('PROVIDER_503');return p.id;}};
 assert.equal(await router(request),'backup');now=11;
 assert.equal(await router(request),'primary');
});
test('slow working primary overlaps fallback; only winner is returned and loser is aborted',async()=>{
 const seen=[];let loserAborted=false;
 const route=createModelRouter({log:()=>{}});
 const started=Date.now();const result=await route({providers:[{id:'slow',timeoutMs:100},{id:'backup',timeoutMs:100}],totalMs:200,hedgeAfterMs:5,validate:x=>x,
 run:(p,signal)=>{seen.push(p.id);if(p.id==='backup')return Promise.resolve('complete');return new Promise((_,reject)=>signal.addEventListener('abort',()=>{loserAborted=true;reject(signal.reason);},{once:true}));}});
 assert.equal(result,'complete');assert.deepEqual(seen,['slow','backup']);assert.equal(loserAborted,true);assert.ok(Date.now()-started<90);
});
test('cancelling during hedge delay does not launch the backup',async()=>{
 const controller=new AbortController(),seen=[];const route=createModelRouter({log:()=>{}});
 const work=route({providers:[{id:'first',timeoutMs:100},{id:'second',timeoutMs:100}],hedgeAfterMs:50,signal:controller.signal,validate:x=>x,run:async p=>{seen.push(p.id);await new Promise(()=>{});}});
 controller.abort(new DOMException('Cancelled','AbortError'));
 await assert.rejects(work,{name:'AbortError'});assert.deepEqual(seen,['first']);
});
