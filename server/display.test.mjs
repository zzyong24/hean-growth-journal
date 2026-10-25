import test from 'node:test';import assert from 'node:assert/strict';import Fastify from 'fastify';
import {voiceStore} from './voice-store.mjs';import {displaySummary,registerDisplayRoutes} from './display.mjs';
const data={version:1,profile:{name:'宝宝',birthday:'2026-08-30'},settings:{language:'zh',theme:'peach',region:'CN'},records:[]};
const milk={id:'milk',kind:'bottle',at:'2026-10-25T07:00:00Z',value:80,details:{preparedMl:'90'},note:'私密笔记',sourceText:'原话',attachments:[]};
test('display uses China dates, unknowns stay null, and paired amounts do not invent totals',()=>{
 const updated='2026-10-25T08:00:00Z',now=new Date(updated);
 const empty=displaySummary({data,updated},now);assert.equal(empty.ageDays,57);assert.equal(empty.consumedMl,null);assert.equal(empty.sleepMinutes,null);
 const value=displaySummary({data:{...data,records:[milk,{...milk,id:'unpaired',value:100,details:{}},{...milk,id:'tomorrow',at:'2026-10-25T17:00:00Z'}]},updated},now);
 assert.equal(value.consumedMl,180);assert.equal(value.feedCount,2);assert.equal(value.preparedMl,90);assert.equal(value.leftoverMl,10);assert.equal(value.completeMilkCount,1);
 assert.ok(!JSON.stringify(value).includes('私密'));assert.equal(value.records,undefined);
});
test('display credential cannot access voice writes, is scoped to its baby, and cannot read another profile',async()=>{
 const s=voiceStore(':memory:');s.sync('owner','a',data);s.sync('other','b',{...data,profile:{...data.profile,name:'其他宝宝'}});
 const token=s.pairDisplay('owner','a');assert.equal(s.identify(token),undefined);assert.equal(s.identifyDisplay(s.pair('owner','a','voice')),undefined);
 const app=Fastify();app.addHook('onRequest',async req=>{req.displayLink=s.identifyDisplay(req.headers.authorization?.replace('Bearer ',''))});registerDisplayRoutes(app,s);
 try{
  assert.equal((await app.inject({url:'/api/display/summary'})).statusCode,401);
  const r=await app.inject({url:'/api/display/summary?profileKey=b',headers:{Authorization:'Bearer '+token}});assert.equal(r.statusCode,200);assert.equal(r.json().name,'宝宝');
 }finally{await app.close();s.close();}
});
test('summary cache sees cloud writes before phone sync, survives stale uploads and rolls over at China midnight',async()=>{
 const s=voiceStore(':memory:');s.sync('owner','a',data);let time=new Date('2026-10-25T08:00:00Z'),reads=0;
 const store={...s,state(...args){reads++;return s.state(...args)}};
 const app=Fastify();app.addHook('onRequest',async req=>{req.displayLink={owner:'owner',profile:'a'}});registerDisplayRoutes(app,store,{now:()=>time});
 const get=async version=>(await app.inject({url:'/api/display/summary'+(version?'?since='+version:'')})).json();
 try{
  const initial=await get();assert.equal(initial.consumedMl,null);assert.equal((await get(initial.version)).unchanged,true);assert.equal(reads,1);
  const {receipt}=s.create('owner','a','cloud','冲90喝80');s.save('owner','a',{...receipt,status:'saved',records:[milk],completedAt:'2099-01-01T00:00:00Z'});
  const cloud=await get(initial.version);assert.equal(cloud.consumedMl,80);assert.equal(cloud.pendingPhoneCount,1);assert.equal(cloud.cloudUpdatedAt,'2099-01-01T00:00:00Z');assert.equal(reads,2);
  s.sync('owner','a',data);assert.equal((await get()).consumedMl,80);
  const state=s.state('owner','a');state.data.records[0].value=999;assert.equal(s.state('owner','a').data.records[0].value,80);
  s.sync('owner','a',{...data,records:[milk]},[receipt.id+':saved']);const synced=await get();assert.equal(synced.consumedMl,80);assert.equal(synced.pendingPhoneCount,0);
  s.sync('owner','a',data);assert.equal((await get()).consumedMl,null);
  time=new Date('2026-10-25T16:00:01Z');const tomorrow=await get(synced.version);assert.equal(tomorrow.date,'2026-10-26');assert.equal(tomorrow.consumedMl,null);assert.notEqual(tomorrow.version,synced.version);
 }finally{await app.close();s.close();}
});
test('phone heartbeats keep cached totals and versions while real edits invalidate them',async()=>{
 const s=voiceStore(':memory:');assert.throws(()=>s.sync('o','p',undefined));s.sync('o','p',data);let reads=0;const revision=s.revision('o','p');
 const app=Fastify();app.addHook('onRequest',async req=>{req.displayLink={owner:'o',profile:'p'}});registerDisplayRoutes(app,{...s,state(...args){reads++;return s.state(...args)}});
 try{const first=(await app.inject('/api/display/summary')).json();await new Promise(r=>setTimeout(r,5));s.sync('o','p',undefined);s.sync('o','p',data);assert.equal(s.revision('o','p'),revision);const next=(await app.inject('/api/display/summary')).json();assert.equal(next.version,first.version);assert.notEqual(next.lastPhoneSync,first.lastPhoneSync);assert.equal(reads,1);
 s.sync('o','p',{...data,records:[milk]});await app.inject('/api/display/summary');assert.equal(reads,2);
 }finally{await app.close();s.close()}
});
