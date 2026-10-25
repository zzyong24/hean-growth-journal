import {dashboardDelivery} from './dashboard.mjs';
import test from 'node:test';import assert from 'node:assert/strict';import Fastify from 'fastify';
import {voiceStore} from './voice-store.mjs';import {registerVoiceRoutes} from './voice-routes.mjs';import {registerVoiceChat,chatHistory} from './voice-chat.mjs';
const data={version:1,profile:{name:'test',birthday:'2026-08-30'},settings:{language:'zh',theme:'peach',region:'CN'},records:[]};
const call=(name,args)=>({role:'assistant',tool_calls:[{id:'call_test',type:'function',function:{name,arguments:JSON.stringify(args)}}]});
async function setup(infer){
 const store=voiceStore(':memory:');store.sync('owner','baby',data);const token=store.pair('owner','baby','test'),display=store.pairDisplay('owner','baby');
 const up=Fastify();let parses=0;up.post('/api/interpret',async()=>{parses++;return {drafts:[{id:'test-milk-'+parses,kind:'bottle',at:'2026-10-25T07:00:00Z',value:100,note:'',sourceText:'刚喝了100毫升'}]}});await up.listen({port:0,host:'127.0.0.1'});
 const app=Fastify();app.addHook('onRequest',async req=>{req.voiceLink=store.identify(req.headers.authorization?.replace('Bearer ',''));});registerVoiceRoutes(app,{store,upstream:up.listeningOrigin,internalToken:'test',quota:()=>true});registerVoiceChat(app,{store,infer,dashboard:dashboardDelivery(store),log:()=>{}});
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
const nativeTool=(name,parameters={type:'object',properties:{}})=>({type:'function',function:{name,description:name,parameters}});
test('native camera command dispatches the actual provided tool despite previous empty promises',async()=>{
 let calls=0;const x=await setup(async body=>{calls++;assert.equal(body.tools[0].function.name,'hean_route');assert.ok(body.tools[0].function.parameters.properties.native_tool.enum.includes('take_photo'));assert.equal(body.messages.at(-1).content,'帮宝宝拍张照片');return call('hean_route',{intent:'native',native_tool:'take_photo'})});
 try{const r=(await x.post([{role:'user',content:'拍照'},{role:'assistant',content:'好的'},{role:'user',content:'帮宝宝拍张照片'}],{tools:[nativeTool('take_photo')]})).json();assert.equal(r.choices[0].finish_reason,'tool_calls');assert.equal(r.choices[0].message.content,'');assert.equal(r.choices[0].message.tool_calls[0].function.name,'take_photo');assert.equal(r.choices[0].message.tool_calls[0].function.arguments,'{}');assert.equal(calls,1);assert.equal(x.parses(),0);assert.equal(x.store.list('owner','baby').length,0);
 }finally{await x.close()}
});
test('native parameters use the supplied schema with forced execution, not a spoken promise',async()=>{
 const tool=nativeTool('set_volume',{type:'object',properties:{intent:{type:'string',enum:['adjustDown']}},required:['intent']});
 const x=await setup(async body=>{if(body.tools[0].function.name==='hean_route')return call('hean_route',{intent:'native',native_tool:'set_volume'});assert.deepEqual(body.tools,[tool]);assert.deepEqual(body.tool_choice,{type:'function',function:{name:'set_volume'}});return {...call('set_volume',{intent:'adjustDown'}),content:'已经调小了'};});
 try{const r=(await x.post([{role:'user',content:'声音小一点'}],{tools:[tool]})).json().choices[0].message;assert.equal(r.content,'');assert.deepEqual(JSON.parse(r.tool_calls[0].function.arguments),{intent:'adjustDown'});
 }finally{await x.close()}
});
test('missing native capability or ignored forced call cannot claim success',async()=>{
 let mode='missing';const x=await setup(async body=>body.tools[0].function.name==='hean_route'?call('hean_route',{intent:'native',native_tool:mode==='missing'?'take_photo':'set_volume'}):{role:'assistant',content:'好的，已经完成'});
 try{const missing=(await x.post([{role:'user',content:'帮我拍张照片'}])).json().choices[0].message;assert.match(missing.content,/没有提供/);assert.equal(missing.tool_calls,undefined);
  mode='promise';const r=(await x.post([{role:'user',content:'音量调小'}],{tools:[nativeTool('set_volume',{type:'object',properties:{intent:{type:'string'}}})]})).json().choices[0].message;assert.match(r.content,/未能完成/);assert.equal(r.tool_calls,undefined);assert.equal(x.parses(),0);
 }finally{await x.close()}
});
test('native result followup reports failure without replaying camera or invoking care',async()=>{
 let calls=0;const x=await setup(async body=>{calls++;assert.equal(body.tool_choice,'none');assert.match(body.messages.at(-1).content,/不要重复执行/);assert.ok(body.messages.some(m=>m.role==='tool'&&m.content.includes('CAMERA_BUSY')));return {role:'assistant',content:'摄像头正忙，这次没有拍到。'};});
 try{const history=[{role:'user',content:'帮宝宝拍张照片'},call('take_photo',{})];const tools=[nativeTool('take_photo')];const pending=(await x.post(history,{tools})).json().choices[0].message;assert.match(pending.content,/暂未收到/);assert.equal(calls,0);
  const r=(await x.post([...history,{role:'tool',tool_call_id:'call_test',content:'{"error":"CAMERA_BUSY"}'}],{tools})).json().choices[0].message;assert.match(r.content,/没有拍到/);assert.equal(r.tool_calls,undefined);assert.equal(calls,1);assert.equal(x.parses(),0);assert.equal(x.store.list('owner','baby').length,0);
 }finally{await x.close()}
});
test('firmware mode rejection is spoken without a model retry or closing the dashboard',async()=>{
 const x=await setup(async()=>{throw Error('must not retry a firmware gate')});
 try{const input=[{role:'user',content:'帮我拍张照片'},call('take_photo',{}),{role:'tool',tool_call_id:'call_test',content:'HEAN_NATIVE_MODE_BLOCKED: firmware rejected'}];const r=(await x.post(input,{tools:[nativeTool('take_photo')]})).json().choices[0].message;assert.match(r.content,/数据看板运行时限制/);assert.match(r.content,/没有执行/);assert.equal(r.tool_calls,undefined);assert.equal(x.parses(),0);
 }finally{await x.close()}
});
test('native lookup can continue to an authorized action using returned IDs without replaying it',async()=>{
 const list=nativeTool('miniapp_list_apps'),open=nativeTool('miniapp_open_app',{type:'object',properties:{app_id:{type:'integer'}},required:['app_id']});
 const x=await setup(async body=>{assert.equal(body.tool_choice,'auto');assert.deepEqual(body.tools,[open]);return call('miniapp_open_app',{app_id:42});});
 try{const history=[{role:'user',content:'打开计时器'},call('miniapp_list_apps',{}),{role:'tool',tool_call_id:'call_test',content:'{"apps":[{"app_id":42,"name":"计时器"}]}'}];const r=(await x.post(history,{tools:[list,open]})).json().choices[0].message;assert.equal(r.tool_calls[0].function.name,'miniapp_open_app');
  const done=[...history,{...call('miniapp_open_app',{app_id:42}),tool_calls:[{...call('miniapp_open_app',{app_id:42}).tool_calls[0],id:'open_1'}]},{role:'tool',tool_call_id:'open_1',content:'{"status":"opened"}'}];const noReplay=(await x.post(done,{tools:[list,open]})).json().choices[0].message;assert.equal(noReplay.tool_calls,undefined);assert.match(noReplay.content,/未能完成/);
 }finally{await x.close()}
});
test('slow care returns spoken acknowledgement before parsing completes, then saves durably',async()=>{
 const store=voiceStore(':memory:');store.sync('owner','baby',data);const token=store.pair('owner','baby','test');let release;
 const waiting=new Promise(resolve=>{release=resolve});const up=Fastify();up.post('/api/interpret',async()=>{await waiting;return {drafts:[{id:'async-milk',kind:'bottle',at:'2026-01-20T07:00:00Z',value:70,note:'',sourceText:'补记上午7点喝了70毫升'}]}});await up.listen({port:0,host:'127.0.0.1'});
 const app=Fastify();app.addHook('onRequest',async req=>{req.voiceLink=store.identify(req.headers.authorization?.replace('Bearer ',''))});registerVoiceRoutes(app,{store,upstream:up.listeningOrigin,internalToken:'test',quota:()=>true});registerVoiceChat(app,{store,infer:async()=>call('hean_route',{intent:'record'}),log:()=>{}});
 try{const response=await app.inject({method:'POST',url:'/api/voice/chat/completions',headers:{authorization:'Bearer '+token},payload:{messages:[{role:'user',content:'补记上午7点喝了70毫升'}]}});assert.match(response.json().choices[0].message.content,/收到，正在保存/);assert.equal(store.list('owner','baby')[0].status,'processing');assert.equal(store.state('owner','baby').data.records.length,0);release();await app.close();assert.equal(store.list('owner','baby')[0].status,'saved');assert.equal(store.state('owner','baby').data.records[0].value,70);
 }finally{release();await app.close();await up.close();store.close()}
});

test('reopening a screen issues scoped install parameters without AI or care writes and never replays a receipt',async()=>{
 const x=await setup(async()=>{throw Error('must not invoke model')});
 try{
  const tools=[nativeTool('hean_open_dashboard')],input=[{role:'user',content:'重新打开禾安看板'}];
  const response=(await x.post(input,{tools})).json().choices[0].message;const c=response.tool_calls[0],args=JSON.parse(c.function.arguments);
  assert.equal(c.function.name,'hean_open_dashboard');assert.match(args.id,/^hean-/);assert.match(args.url,/https:\/\/hean.example.com\/api\/display\/app.lua\?ticket=/);assert.equal(args.hash,args.version);assert.ok(args.size>1000);assert.equal(x.parses(),0);assert.equal(x.store.list('owner','baby').length,0);
  const pending=(await x.post([...input,response],{tools})).json().choices[0].message;assert.match(pending.content,/暂未收到设备确认/);assert.equal(pending.tool_calls,undefined);
  for(const [text,pattern] of [['HEAN_DASHBOARD_STARTED',/禾安看板已打开/],['HEAN_DASHBOARD_UNCONFIRMED',/未能确认/]]){
   const r=(await x.post([...input,response,{role:'tool',tool_call_id:c.id,content:text}],{tools})).json().choices[0].message;assert.match(r.content,pattern);assert.equal(r.tool_calls,undefined);
  }
  assert.match((await x.post(input)).json().choices[0].message.content,/还没有接好/);
 }finally{await x.close()}
});
