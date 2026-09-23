import test from 'node:test';import assert from 'node:assert/strict';import {normalizeDrafts} from './index.mjs';
test('image route converts paper localAt before record validation and never trusts conflicting model at',async()=>{
 const oldClock=process.env.IMAGE_LOCAL_TIME_ENABLED;process.env.IMAGE_LOCAL_TIME_ENABLED='true';
 const {createServer}=await import('./index.mjs');const original=globalThis.fetch,oldKey=process.env.DUDU_API_KEY;process.env.DUDU_API_KEY='test';
 globalThis.fetch=async(url,options)=>{
  if(!String(url).includes('/chat/completions'))return original(url,options);
  const sent=JSON.parse(options.body);assert.match(sent.messages[0].content,/localAt/);assert.equal(JSON.parse(sent.messages[1].content[0].text).timezone,'Asia/Shanghai');assert.equal(sent.reasoning_effort,'low');assert.equal(sent.messages[1].content[1].image_url.detail,'high');
  return new Response(JSON.stringify({choices:[{message:{content:JSON.stringify({reply:'',drafts:[{kind:'bottle',localAt:'2026-09-10T03:20:00',at:'2026-09-09T11:20:00Z',value:60,note:''}]})}}]}));
 };
 const server=createServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));
 try{
  const response=await original(`http://127.0.0.1:${server.address().port}/api/interpret`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text:'补录图片',now:'2026-09-10T03:20:00Z',timezone:'Asia/Shanghai',images:[{data:'data:image/png;base64,AAAA'}]})});
  assert.equal(response.status,200);const result=await response.json();assert.equal(result.drafts[0].at,'2026-09-09T19:20:00.000Z');assert.equal(result.drafts[0].localAt,undefined);
 }finally{globalThis.fetch=original;if(oldClock===undefined)delete process.env.IMAGE_LOCAL_TIME_ENABLED;else process.env.IMAGE_LOCAL_TIME_ENABLED=oldClock;if(oldKey===undefined)delete process.env.DUDU_API_KEY;else process.env.DUDU_API_KEY=oldKey;await new Promise(r=>server.close(r));}
});
test('multi-turn pending updates preserve event identity and attachments',()=>{const p={id:'pending-1',kind:'note',at:new Date().toISOString(),note:'photo',sourceText:'original',attachments:[{id:'image-1',type:'image',mime:'image/png',name:'baby.png'}]};const out=normalizeDrafts({reply:'updated',drafts:[{...p,note:'smiling'}]},'clarification',[p]);assert.equal(out.drafts[0].id,p.id);assert.deepEqual(out.drafts[0].attachments,p.attachments);assert.equal(out.drafts[0].sourceText,'original');assert.equal(out.drafts[0].note,'smiling')});
test('model cannot choose an id belonging to a saved event',()=>{const out=normalizeDrafts({reply:'ok',drafts:[{id:'saved-id',kind:'diaper',at:new Date().toISOString(),note:''}]},'diaper',[]);assert.notEqual(out.drafts[0].id,'saved-id')});

test('automatic baby context and device timezone reach the provider without being user-visible prompt text', async()=>{
 const {createServer}=await import('./index.mjs');
 const originalFetch=globalThis.fetch, oldKey=process.env.DUDU_API_KEY;
 process.env.DUDU_API_KEY='test-only';
 let sent;
 globalThis.fetch=async(url,options)=>{
  if(String(url).includes('/chat/completions')){sent=JSON.parse(options.body);return new Response(JSON.stringify({choices:[{message:{content:JSON.stringify({reply:'ok',drafts:[]})}}]}),{status:200});}
  return originalFetch(url,options);
 };
 const server=createServer(); await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try{
  const response=await originalFetch(`http://127.0.0.1:${server.address().port}/api/interpret`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text:'最近奶量如何？',now:'2026-09-07T20:30:00Z',timezone:'Asia/Shanghai',babyContext:{history:[{id:'old',kind:'weight',value:3.2}],localDate:'2026-09-08'},history:[{role:'assistant',text:'',at:'2026-09-07T20:29:00Z',acceptedRecords:[{id:'wake',kind:'note',at:'2026-09-07T20:29:00Z',note:'醒了',sourceText:'醒了'}]}],pending:[]})});
  assert.equal(response.status,200);
  const context=JSON.parse(sent.messages[1].content);
  assert.equal(context.timezone,'Asia/Shanghai');assert.equal(context.babyContext.history[0].id,'old');assert.equal(context.text,'最近奶量如何？');assert.equal(context.history[0].acceptedRecords[0].id,'wake');assert.equal(context.history[0].at,'2026-09-07T20:29:00Z');
 }finally{globalThis.fetch=originalFetch;if(oldKey===undefined)delete process.env.DUDU_API_KEY;else process.env.DUDU_API_KEY=oldKey;await new Promise(resolve=>server.close(resolve));}
});

test('explicit saved correction keeps original identity and attachments',()=>{
 const old={id:'milk',kind:'bottle',at:'2026-09-08T02:23:00+08:00',value:50,note:'50ml',sourceText:'original',attachments:[]};
 const result=normalizeDrafts({reply:'待确认修改',drafts:[{...old,targetRecordId:'milk',value:35,note:'实际35ml'}]},'上一顿改为35毫升',[],[old]);
 assert.equal(result.drafts[0].id,'milk');assert.equal(result.drafts[0].value,35);assert.equal(result.drafts[0].targetRecordId,'milk');
});
test('sleep completion links same start instead of creating another event',()=>{
 const old={id:'sleep',kind:'sleep',at:'2026-09-08T01:20:00+08:00',value:40,note:'',sourceText:''};
 const result=normalizeDrafts({reply:'待确认',drafts:[{kind:'sleep',at:'2026-09-08T02:23:00+08:00',value:103,note:''}]},'睡到了喝奶时',[],[old]);
 assert.equal(result.drafts[0].id,'sleep');
});
test('unknown update target is rejected instead of silently creating a record',()=>{
 assert.throws(()=>normalizeDrafts({reply:'修改',drafts:[{targetRecordId:'missing',kind:'bottle',at:new Date().toISOString(),value:35,note:''}]},'修改',[],[]));
});
test('replayed exact event is an update, not a second saved event',()=>{
 const old={id:'existing',kind:'bottle',at:'2026-09-08T02:23:00+08:00',value:50,note:'',sourceText:''};
 const result=normalizeDrafts({reply:'核对',drafts:[{...old,id:'model-new'}]},'同一顿',[],[old]);
 assert.equal(result.drafts[0].id,'existing');assert.equal(result.drafts[0].targetRecordId,'existing');
});
test('compound sleep completion preserves the separate nursing start action',()=>{
 const result=normalizeDrafts({reply:'睡眠结束，右侧开始亲喂',drafts:[{kind:'sleep',at:'2026-09-08T22:11:00Z',value:221,note:''}],nursingStart:{at:'2026-09-08T22:11:00Z',side:'right'}},'睡醒了，现在右侧刚开始吃奶');
 assert.equal(result.drafts.length,1);assert.equal(result.nursingStart.side,'right');
 assert.throws(()=>normalizeDrafts({reply:'',drafts:[],nursingStart:{at:'bad',side:'right'}},'开始'),/INVALID_MODEL_RESPONSE/);
});
test('a redundant unfinished nursing draft cannot invalidate a valid compound batch',()=>{
 const result=normalizeDrafts({reply:'',drafts:[{kind:'sleep',at:'2026-09-08T22:11:00+08:00',value:221,note:''},{kind:'nursing',at:'2026-09-08T22:11:00+08:00',side:'right',note:'尚未结束'}],nursingStart:{at:'2026-09-08T22:11:00+08:00',side:'right'}},'右侧刚开始吃奶');
 assert.equal(result.drafts.length,1);assert.equal(result.nursingStart.side,'right');
});

test('compound feed and sleep start survive normalization without a fake completed sleep',()=>{
 const start='2026-09-08T23:00:00+08:00';
 const result=normalizeDrafts({reply:'',drafts:[{kind:'bottle',at:start,value:60,note:''}],sleepStart:start},'喝完60ml，现在睡着了');
 assert.equal(result.sleepStart,start);assert.equal(result.drafts.length,1);
 assert.throws(()=>normalizeDrafts({reply:'',drafts:[],sleepStart:'bad'},'睡着了'),/INVALID_MODEL_RESPONSE/);
});

test('completed nursing needs duration but does not require a side; sleep correction updates same record',()=>{
 const old={id:'sleep',kind:'sleep',at:'2026-09-09T04:02:00+08:00',value:180,note:'',sourceText:''};
 const result=normalizeDrafts({reply:'',drafts:[{...old,targetRecordId:'sleep',value:122},{kind:'nursing',at:old.at,value:20,note:'亲喂20分钟'}]},'20分钟母乳，以及两点睡着',[],[old]);
 assert.equal(result.drafts.length,2);assert.equal(result.drafts[0].targetRecordId,'sleep');assert.equal(result.drafts[0].value,122);assert.equal(result.drafts[1].side,undefined);
});

test('simple messages and contextual bare numbers always reach the model',async()=>{
 const {createServer}=await import('./index.mjs');const original=globalThis.fetch,oldKey=process.env.DUDU_API_KEY;process.env.DUDU_API_KEY='test';let calls=0;
 globalThis.fetch=async(url,options)=>{if(String(url).includes('/chat/completions')){calls++;return new Response(JSON.stringify({choices:[{message:{content:JSON.stringify({reply:'model reply',drafts:[]})}}]}));}return original(url,options);};
 const server=createServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));
 try{for(const text of ['宝宝叫什么名字','刚喝了60ml','睡着了','35']){const r=await original(`http://127.0.0.1:${server.address().port}/api/interpret`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text,now:new Date().toISOString(),profile:{name:'测试宝宝'},pending:[]})});assert.equal(r.status,200);assert.equal((await r.json()).reply,'model reply');}assert.equal(calls,4);}finally{globalThis.fetch=original;if(oldKey===undefined)delete process.env.DUDU_API_KEY;else process.env.DUDU_API_KEY=oldKey;await new Promise(r=>server.close(r));}
 const result=normalizeDrafts({reply:'',drafts:[{kind:'bottle',at:new Date().toISOString(),value:35,note:''}]},'35');assert.equal(result.drafts.length,1);
});
