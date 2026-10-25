import test from 'node:test';import assert from 'node:assert/strict';import Fastify from 'fastify';
import {voiceStore} from './voice-store.mjs';import {registerVoiceRoutes} from './voice-routes.mjs';
const data={version:1,profile:{name:'test',birthday:'2026-08-30'},settings:{language:'zh',theme:'peach',region:'CN'},records:[]};
const record={id:'r1',kind:'bottle',at:'2026-10-25T07:00:00Z',value:80,details:{preparedMl:'90'},note:'',sourceText:'冲90喝80'};
test('pairing is scoped, receipts are idempotent and ack is scoped and status-specific',()=>{
 const s=voiceStore(':memory:');try{
  assert.throws(()=>s.pair('a','baby','test'));
  s.sync('a','baby',data);const token=s.pair('a','baby','test');assert.equal(s.identify(token).owner,'a');assert.equal(s.identify('wrong'),undefined);
  const {receipt:r}=s.create('a','baby','event-1','冲90喝80');assert.equal(s.create('a','baby','event-1','冲90喝80').created,false);assert.throws(()=>s.create('a','baby','event-1','别的'));
  s.save('a','baby',{...r,status:'saved',records:[record]});assert.equal(s.state('a','baby').data.records[0].value,80);
  assert.equal(s.sync('b','baby',data,[r.id+':saved']).length,0);assert.equal(s.list('a','baby')[0].acknowledgedAt,null);
  assert.equal(s.sync('a','baby',data,[r.id+':processing']).length,1);
  assert.equal(s.sync('a','baby',{...data,records:[record]},[r.id+':saved']).length,0);
  assert.ok(s.list('a','baby')[0].acknowledgedAt);
 }finally{s.close();}
});
test('invalid sync never replaces an existing profile',()=>{const s=voiceStore(':memory:');s.sync('a','b',data);assert.throws(()=>s.sync('a','b',{...data,records:[{...record,value:100}]}));assert.equal(s.profile('a','b').data.records.length,0);s.close();});
test('MCP discovery, notifications, query and unsupported transport are valid',async()=>{
 const s=voiceStore(':memory:');s.sync('a','b',{...data,records:[record]});const app=Fastify();app.addHook('onRequest',async req=>{req.user='a';req.voiceLink={owner:'a',profile:'b'};});registerVoiceRoutes(app,{store:s,upstream:'http://127.0.0.1:1',internalToken:'test',quota:()=>true});
 try{
  const call=(method,params)=>app.inject({method:'POST',url:'/mcp/hean',payload:{jsonrpc:'2.0',id:1,method,params}});
  assert.equal((await call('initialize',{protocolVersion:'2025-03-26'})).json().result.protocolVersion,'2025-03-26');
  assert.equal((await call('tools/list')).json().result.tools.length,3);
  assert.equal((await app.inject({method:'POST',url:'/mcp/hean',payload:{jsonrpc:'2.0',method:'notifications/initialized'}})).statusCode,202);
  assert.equal((await app.inject({url:'/mcp/hean'})).statusCode,405);
  const q=(await call('tools/call',{name:'hean_query',arguments:{date:'2026-10-25'}})).json();const v=JSON.parse(q.result.content[0].text);assert.equal(v.consumedMl,80);assert.equal(v.leftoverMl,10);
  const failed=(await call('tools/call',{name:'hean_record',arguments:{text:'冲90喝80',request_id:'test'}})).json();assert.equal(JSON.parse(failed.result.content[0].text).status,'failed');assert.equal(s.list('a','b')[0].text,'冲90喝80');assert.equal(s.state('a','b').data.records.length,1);
 }finally{await app.close();s.close();}
});

test('voice query distinguishes intake from partial prepared amounts and elimination counts',async()=>{
 const s=voiceStore(':memory:');s.sync('a','b',{...data,records:[record,{...record,id:'r2',value:90,details:{}},{id:'d',kind:'diaper',at:record.at,note:'',sourceText:'',details:{diaperType:'wet',urinationCount:'3',diaperChangeCount:'1'}}]});
 const app=Fastify();app.addHook('onRequest',async req=>{req.voiceLink={owner:'a',profile:'b'};});registerVoiceRoutes(app,{store:s});
 try{const q=await app.inject({method:'POST',url:'/mcp/hean',payload:{jsonrpc:'2.0',id:1,method:'tools/call',params:{name:'hean_query',arguments:{date:'2026-10-25'}}}});const v=JSON.parse(q.json().result.content[0].text);
 assert.equal(v.consumedMl,170);assert.equal(v.preparedMl,90);assert.equal(v.completeMilkCount,1);assert.equal(v.elimination.urinations.total,3);assert.equal(v.elimination.changes.total,1);assert.equal(v.stoolRecords,0);assert.match(v.spokenSummary,/其余1次冲泡量未记录/);
 }finally{await app.close();s.close();}
});
test('slow parsing returns a durable processing receipt and completes without repeating the input',async()=>{
 const upstream=Fastify();upstream.post('/api/interpret',async()=>{await new Promise(resolve=>setTimeout(resolve,2100));return {drafts:[record],reply:'已记录'};});await upstream.listen({port:0,host:'127.0.0.1'});
 const s=voiceStore(':memory:');s.sync('a','b',data);const app=Fastify();app.addHook('onRequest',async req=>{req.voiceLink={owner:'a',profile:'b'};});registerVoiceRoutes(app,{store:s,upstream:upstream.listeningOrigin,internalToken:'test',quota:()=>true});
 const call=(name,args)=>app.inject({method:'POST',url:'/mcp/hean',payload:{jsonrpc:'2.0',id:1,method:'tools/call',params:{name,arguments:args}}});
 try{const first=JSON.parse((await call('hean_record',{text:'冲90喝80',request_id:'slow'})).json().result.content[0].text);assert.equal(first.status,'processing');assert.equal(s.list('a','b')[0].text,'冲90喝80');
 const done=JSON.parse((await call('hean_receipt',{receipt_id:first.id})).json().result.content[0].text);assert.equal(done.status,'saved');assert.equal(done.delivery,'cloud_saved_awaiting_phone');
 const replay=JSON.parse((await call('hean_record',{text:'冲90喝80',request_id:'slow'})).json().result.content[0].text);assert.equal(replay.id,first.id);assert.equal(s.state('a','b').data.records.length,1);
 }finally{await app.close();await upstream.close();s.close();}
});

test('cloud overlay carries a bottle across unacknowledged voice turns and phone acknowledgement',async()=>{
 const {applyBottleAction,normalizeBottleAction}=await import('../mobile/src/care/bottleFlow.ts');
 const s=voiceStore(':memory:');s.sync('owner','baby',data);
 try{
  const save=(key,bottleAction)=>{const {receipt}=s.create('owner','baby',key,key);const done={...receipt,status:'saved',bottleAction};s.save('owner','baby',done);return done;};
  const start={type:'start',session:{id:'feed-1',at:record.at,preparedMl:90,sourceText:'冲90'}};
  const r1=save('start',start);const pending=s.state('owner','baby').data;assert.equal(pending.bottleSession.preparedMl,90);assert.equal(pending.records.length,0);
  const end=normalizeBottleAction({type:'finish',sessionId:'feed-1',leftoverMl:20},pending,'剩20',record.at);const r2=save('finish',end);const done=s.state('owner','baby').data;assert.equal(done.records[0].value,70);
  s.sync('owner','baby',done,[r1.id+':saved',r2.id+':saved']);assert.equal(s.state('owner','baby').data.records.length,1);
  const undo=normalizeBottleAction({type:'undo',recordId:done.records[0].id},done,'撤销',record.at);save('undo',undo);const restored=s.state('owner','baby').data;assert.equal(restored.records.length,0);assert.equal(restored.bottleSession.preparedMl,90);
 }finally{s.close();}
});
