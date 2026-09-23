import test from 'node:test';
import assert from 'node:assert/strict';
import {commitAutomaticRecords} from './automaticRecord';
import {initialData,recordVersion,type CareRecord} from './domain';
import {withTransientRetry} from './transientRetry';
const milk:CareRecord={id:'milk',kind:'bottle',at:'2026-09-08T09:00:00Z',value:50,note:'',sourceText:'喝了50毫升'};
test('automatic correction replaces original; replay cannot duplicate or overwrite a newer edit',()=>{
 const d={...initialData,records:[milk]};const fix={...milk,value:35,targetRecordId:milk.id,baseVersion:recordVersion(milk)};
 const saved=commitAutomaticRecords(d,[fix]);assert.equal(saved.records.length,1);assert.equal(saved.records[0].value,35);
 assert.throws(()=>commitAutomaticRecords(saved,[fix]),/STALE/);
});
test('automatic save commits a whole batch and closes the matching sleep timer',()=>{
 const sleep:CareRecord={id:'sleep',kind:'sleep',at:'2026-09-08T09:00:00Z',value:40,note:'',sourceText:'醒了'};
 const d={...initialData,sleepStart:'2026-09-08T08:20:00Z'};
 const saved=commitAutomaticRecords(d,[milk,sleep]);assert.equal(saved.records.length,2);assert.equal(saved.sleepStart,undefined);
 assert.equal(commitAutomaticRecords(saved,[milk,sleep]).records.length,2);
 assert.throws(()=>commitAutomaticRecords(d,[milk,{...sleep,value:-1}]),/INVALID/);assert.equal(d.records.length,0);
});
test('transient retry is bounded and reuses the same operation; cancellation never retries',async()=>{
 let calls=0;const value=await withTransientRetry(async()=>{calls++;if(calls===1)throw new TypeError('Network request failed');return 35;},undefined,0);
 assert.equal(value,35);assert.equal(calls,2);
 calls=0;await assert.rejects(withTransientRetry(async()=>{calls++;throw new Error('INVALID_MODEL_RESPONSE');},undefined,0));assert.equal(calls,1);
 const c=new AbortController();c.abort();calls=0;await assert.rejects(withTransientRetry(async()=>{calls++;return 1;},c.signal,0));assert.equal(calls,0);
});

test('React Native abort signal without throwIfAborted still permits inference',async()=>{
 const {createRequire}=await import('node:module');const require=createRequire(import.meta.url);
 const {AbortController:NativeController}=require('abort-controller');const c=new NativeController();
 assert.equal(c.signal.throwIfAborted,undefined);
 assert.equal(await withTransientRetry(async()=>35,c.signal,0),35);
 c.abort();await assert.rejects(withTransientRetry(async()=>50,c.signal,0));
});
test('completed sleep and newly started nursing commit together without a fake completed feed',()=>{
 const nursing={at:'2026-09-08T22:11:00Z',side:'right' as const};
 const sleep:CareRecord={id:'sleep',kind:'sleep',at:nursing.at,value:221,note:'',sourceText:''};
 const saved=commitAutomaticRecords({...initialData},[sleep],nursing);
 assert.deepEqual(saved.nursingSession,nursing);assert.equal(saved.records.length,1);
 assert.deepEqual(commitAutomaticRecords(saved,[],nursing).nursingSession,nursing);
 assert.throws(()=>commitAutomaticRecords(saved,[],{...nursing,side:'left'}),/NURSING_ALREADY_RUNNING/);
});

test('compound sleep start persists across turns and wake closes exactly that session across midnight',()=>{
 const start='2026-09-08T23:00:00+08:00';
 const began=commitAutomaticRecords(initialData,[milk],undefined,start);
 assert.equal(began.sleepStart,start);assert.equal(began.records.length,1);
 assert.throws(()=>commitAutomaticRecords(began,[],undefined,'2026-09-09T00:00:00+08:00'),/SLEEP_ALREADY_RUNNING/);
 const sleep:CareRecord={id:'episode',kind:'sleep',at:'2026-09-09T01:00:00+08:00',value:120,note:'',sourceText:'醒了'};
 const ended=commitAutomaticRecords(began,[sleep]);assert.equal(ended.sleepStart,undefined);assert.equal(ended.records.length,2);
 assert.equal(commitAutomaticRecords(ended,[sleep]).records.length,2);
});

test('request timeout retries inference once but never turns cancellation into retry',async()=>{
 let calls=0;const value=await withTransientRetry(async()=>{calls++;if(calls===1){const e=new Error('timed out');e.name='TimeoutError';throw e;}return 20;},undefined,0);
 assert.equal(value,20);assert.equal(calls,2);
});
