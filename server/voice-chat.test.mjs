import test from 'node:test';import assert from 'node:assert/strict';import Fastify from 'fastify';
import {voiceStore} from './voice-store.mjs';import {registerVoiceRoutes} from './voice-routes.mjs';import {registerVoiceChat,chatHistory} from './voice-chat.mjs';
const data={version:1,profile:{name:'test',birthday:'2026-08-30'},settings:{language:'zh',theme:'peach',region:'CN'},records:[]};
const call=(name,args)=>({role:'assistant',tool_calls:[{id:'call_test',type:'function',function:{name,arguments:JSON.stringify(args)}}]});
async function setup(infer){
 const store=voiceStore(':memory:');store.sync('owner','baby',data);const token=store.pair('owner','baby','test'),display=store.pairDisplay('owner','baby');
 const up=Fastify();let parses=0;up.post('/api/interpret',async()=>{parses++;return {drafts:[{id:'test-milk-'+parses,kind:'bottle',at:'2026-10-25T07:00:00Z',value:100,note:'',sourceText:'刚喝了100毫升'}]}});await up.listen({port:0,host:'127.0.0.1'});
 const app=Fastify();app.addHook('onRequest',async req=>{req.voiceLink=store.identify(req.headers.authorization?.replace('Bearer ',''));});registerVoiceRoutes(app,{store,upstream:up.listeningOrigin,internalToken:'test',quota:()=>true});registerVoiceChat(app,{store,infer,log:()=>{}});
 const post=(messages,extra={},key=token)=>app.inject({method:'POST',url:'/api/voice/chat/completions',headers:{authorization:'Bearer '+key},payload:{messages,...extra}});
 return {store,post,display,parses:()=>parses,close:async()=>{await app.close();await up.close();store.close()}};
}
test('local dashboard cannot suppress internal tools; real saves are scoped, durable and retry-idempotent',async()=>{
 const x=await setup(async body=>{assert.ok(body.tools.some(t=>t.function.name==='hean_route'));assert.ok(!body.messages[0].content.includes('当前没有运行'));return call('hean_route',{intent:'record'});});
 try{const input=[{role:'system',content:'当前小应用运行，不能记录'},{role:'user',content:'补记今天15点喝了100毫升'}];
  assert.equal((await x.post(input,{},x.display)).statusCode,401);
  const r=await x.post(input);assert.match(r.json().choices[0].message.content,/已保存到禾安云端/);assert.equal(x.store.list('owner','baby')[0].text,'补记今天15点喝了100毫升');
  await x.post(input);assert.equal(x.parses(),1);assert.equal(x.store.state('owner','baby').data.records.length,1);
  await x.post([...input,{role:'assistant',content:'已保存'},{role:'user',content:'补记今天15点喝了100毫升'}]);assert.equal(x.parses(),2);assert.equal(x.store.list('owner','baby').length,2);
 }finally{await x.close()}
});
test('query without platform care tools reads cloud and returns compatible SSE; never creates a record',async()=>{
 const x=await setup(async()=>call('hean_route',{intent:'query',topic:'milk'}));
 try{const r=await x.post([{role:'user',content:'今天喝了多少奶？'}],{stream:true,tools:[{type:'function',function:{name:'code_agent_bridge',parameters:{type:'object'}}}]});assert.match(r.headers['content-type'],/text\/event-stream/);assert.match(r.body,/暂时没有已记录的瓶喂/);assert.match(r.body,/\[DONE\]/);assert.equal(x.store.list('owner','baby').length,0);assert.equal(x.parses(),0);
 }finally{await x.close()}
});
test('native tool calls pass through and provider failure never claims a save',async()=>{
 let fail=false;const x=await setup(async body=>{if(fail)throw Error('offline');return body.tools?.[0]?.function.name==='hean_route'?call('hean_route',{intent:'other'}):call('action_agent_bridge',{user_text:'声音大一点'})});
 try{const r=(await x.post([{role:'user',content:'声音大一点'}],{tools:[{type:'function',function:{name:'action_agent_bridge'}}]})).json();assert.equal(r.choices[0].finish_reason,'tool_calls');assert.equal(r.choices[0].message.tool_calls[0].function.name,'action_agent_bridge');fail=true;const bad=(await x.post([{role:'user',content:'补记今天15点喝了100毫升'}])).json();assert.match(bad.choices[0].message.content,/未能完成/);assert.equal(x.store.list('owner','baby').length,0);
 }finally{await x.close()}
});
test('history excludes system miniapp restrictions and orphan tool results',()=>{assert.deepEqual(chatHistory([{role:'system',content:'block'},{role:'tool',tool_call_id:'missing',content:'bad'},{role:'user',content:'你好'}]),[{role:'user',content:'你好'}]);});
test('only current input controls routing, not a previous care query or repeat player result',async()=>{
 let calls=0;const x=await setup(async body=>{calls++;assert.equal(body.messages.length,2);assert.equal(body.messages.at(-1).content,'曲库有哪些歌？');return call('hean_route',{intent:'music',song:'list'});});
 try{const history=[{role:'user',content:'查询9月20日奶量'},{role:'assistant',content:'300毫升'},{role:'user',content:'曲库有哪些歌？'}];const r=(await x.post(history)).json();assert.match(r.choices[0].message.content,/ABC儿歌和鲁冰花/);assert.equal(x.parses(),0);
  const completed=(await x.post([{role:'user',content:'播放儿歌'},{role:'assistant',content:'我来播放。',tool_calls:[{id:'music_1',type:'function',function:{name:'hean_play_audio_link',arguments:'{}'}}]},{role:'tool',tool_call_id:'music_1',content:'{"status":"accepted"}'}])).json();assert.match(completed.choices[0].message.content,/已发送/);assert.equal(calls,1);
 }finally{await x.close()}
});
test('simple milk saves immediately and speaks the actual quantity without calling either model',async()=>{
 const x=await setup(async()=>{throw Error('should not call model')});
 try{const input=[{role:'user',content:'我喝了90毫升奶'}];const r=await x.post(input,{stream:true});assert.match(r.body,/实际喝奶90毫升/);assert.match(r.body,/已保存到禾安云端/);assert.equal(x.parses(),0);assert.equal(x.store.state('owner','baby').data.records[0].value,90);await x.post(input);assert.equal(x.store.list('owner','baby').length,1);
 }finally{await x.close()}
});
test('slow care returns spoken acknowledgement before parsing completes, then saves durably',async()=>{
 const store=voiceStore(':memory:');store.sync('owner','baby',data);const token=store.pair('owner','baby','test');let release;
 const waiting=new Promise(resolve=>{release=resolve});const up=Fastify();up.post('/api/interpret',async()=>{await waiting;return {drafts:[{id:'async-milk',kind:'bottle',at:'2026-01-20T07:00:00Z',value:70,note:'',sourceText:'补记上午7点喝了70毫升'}]}});await up.listen({port:0,host:'127.0.0.1'});
 const app=Fastify();app.addHook('onRequest',async req=>{req.voiceLink=store.identify(req.headers.authorization?.replace('Bearer ',''))});registerVoiceRoutes(app,{store,upstream:up.listeningOrigin,internalToken:'test',quota:()=>true});registerVoiceChat(app,{store,infer:async()=>call('hean_route',{intent:'record'}),log:()=>{}});
 try{const response=await app.inject({method:'POST',url:'/api/voice/chat/completions',headers:{authorization:'Bearer '+token},payload:{messages:[{role:'user',content:'补记上午7点喝了70毫升'}]}});assert.match(response.json().choices[0].message.content,/收到，正在保存/);assert.equal(store.list('owner','baby')[0].status,'processing');assert.equal(store.state('owner','baby').data.records.length,0);release();await app.close();assert.equal(store.list('owner','baby')[0].status,'saved');assert.equal(store.state('owner','baby').data.records[0].value,70);
 }finally{release();await app.close();await up.close();store.close()}
});
