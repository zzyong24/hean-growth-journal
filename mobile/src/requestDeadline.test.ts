import {test} from 'node:test';
import assert from 'node:assert/strict';
import {requestDeadline} from './requestDeadline';
test('a transport ignoring abort still settles at the overall deadline',async()=>{
 let aborted=false;
 await assert.rejects(requestDeadline(signal=>{signal.addEventListener('abort',()=>{aborted=true});return new Promise(()=>{});},undefined,10),/AI_REQUEST_TIMEOUT/);
 assert.equal(aborted,true);
});
test('user cancellation settles immediately even when transport ignores it',async()=>{
 const c=new AbortController();
 const promise=requestDeadline(()=>new Promise(()=>{}),c.signal,1000);c.abort();
 await assert.rejects(promise,e=>(e as Error).name==='AbortError');
});
test('late replies cannot become a successful result after deadline',async()=>{
 let finish!:(x:string)=>void;
 const pending=requestDeadline(()=>new Promise<string>(resolve=>{finish=resolve}),undefined,10);
 await assert.rejects(pending,/AI_REQUEST_TIMEOUT/);finish('late');
 assert.equal(await requestDeadline(async()=>42,undefined,30),42);
});
