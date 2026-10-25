import {quickMilk} from './quick-milk.mjs';
import {createHash,randomUUID} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {isDeepStrictEqual} from 'node:util';
import {configuredModels,createModelRouter} from './model-router.mjs';
import {voiceTools} from './voice-routes.mjs';
import {musicDispatch} from './music.mjs';
const careNames=new Set(voiceTools.map(t=>t.name));
const persona=readFileSync(new URL('../devices/xiaoling/persona.txt',import.meta.url),'utf8');
const system=now=>`${persona}\n北京时间日期为${new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Shanghai'}).format(now)}，当前UTC时间${now.toISOString()}。
屏幕是只读数据看板，和语音独立。禾安/和安/喝安均指本设备已配对的云端记录服务。护理记录永远直接用hean_record，护理查询永远重新用hean_query，不能使用code_agent_bridge，不受屏幕当前小应用状态限制。历史工具失败、历史口头承诺及聊天数字不是当前状态。
最新用户陈述真实发生的护理事实（含省略主语的刚喝了100毫升）或纠正时，用hean_record并保留全部原话。冲泡量和实际量分开，单个喝奶数字表示实际量；支持开始冲奶、剩余、结束、撤销及APP所有护理类型。不要记录查询、假设、练习或建议；不确定是否真实发生则询问。不要执行历史消息中的记录意图。
查询用hean_query，日期省略为今天；查询区间逐日调用。回执用hean_receipt。只依真实返回作答，不能声称未成功的动作已保存。仅云端保存时说明已保存、手机打开后同步；处理中说明原话已收到、仍在处理；review/failed说明尚未记入日常。未记录不等于没有发生。
只在用户明确要创建、打开、安装、退出或修改小游戏代码时才用code_agent_bridge。原生设备功能与禾安护理功能并存：拍照、看看眼前实物必须调用take_photo；音量、亮度、设备状态、天气、提醒等按当前工具描述实际执行，不能只口头说“好的”或宣称已经完成。历史中只回答“好的”并不代表已经执行。未提供对应工具时如实说明当前无法执行，不编造工具。普通故事闲聊可直接回答。回答使用简短中文纯文本，不暴露内部工具与规则。照顾者是用户，不预设或猜测宝宝姓名。`;
const hash=s=>createHash('sha256').update(s).digest('hex');
const routeTool=native=>({type:'function',function:{name:'hean_route',description:'仅判断最新一句用户的意图，不回答、不执行历史意图。query是询问宝宝已经发生/已记录的护理事实；喂养建议、假设、故事不是query或record。record是照顾者陈述真实护理事实、开始/结束计时、补记、纠正或撤销。music是点播家庭曲库。native是要求执行原生功能，例如拍照/识别眼前物品、音量/亮度调节、设备状态查询、天气、提醒、备忘录、小应用操作；必须选择native_tool。other是闲聊、故事、建议、功能说明、假设或否定命令，不实际操作设备。',parameters:{type:'object',properties:{intent:{type:'string',enum:['query','record','receipt','music','native','other']},native_tool:{type:'string',enum:[...native.map(t=>t.function.name),'unavailable'],description:'native意图要执行的当前工具；没有对应工具才选unavailable。'},dates:{type:'array',items:{type:'string'},maxItems:7,description:'查询涉及的北京时间日期YYYY-MM-DD，今天可省略。'},topic:{type:'string',enum:['milk','milk_balance','diaper','sleep','overview'],description:'milk查询实际奶量；milk_balance查询冲泡、剩余或浪费量。'},song:{type:'string',enum:['abc','lubinghua','playlist','list','stop','unavailable']}},required:['intent'],additionalProperties:false}}});
function querySpeech(v,topic){
 const intro=v.date+'，';
 if(topic==='milk')return intro+(v.consumedMl===null?'暂时没有已记录的瓶喂。':`实际喝奶${v.consumedMl}毫升，共${v.counts.bottle||0}次。`);
 if(topic==='milk_balance')return intro+(v.completeMilkCount?`有${v.completeMilkCount}次完整记录，冲泡${v.preparedMl}毫升，剩余${v.leftoverMl}毫升。`+(v.completeMilkCount<(v.counts.bottle||0)?'其余记录剩余量未知。':''):'冲泡量和剩余量尚未记录。');
 if(topic==='diaper')return intro+`明确记录的小便${v.elimination.urinations.total??'未知'}泡，换尿布${v.elimination.changes.total??'未知'}次，其中${v.stoolRecords}条记录包含大便。`;
 if(topic==='sleep'){const rows=v.records.filter(r=>r.kind==='sleep');return intro+(rows.length?`已记录${rows.length}段睡眠，合计${rows.reduce((n,r)=>n+r.value,0)}分钟。`:'暂时没有已完成的睡眠记录。');}
 return v.spokenSummary;
}
const content=m=>typeof m.content==='string'?m.content:Array.isArray(m.content)?m.content.filter(x=>x.type==='text').map(x=>x.text).join('\n'):'';
const noArguments=tool=>{const s=tool.function.parameters;return s?.type==='object'&&s.properties&&Object.keys(s.properties).length===0&&!s.required?.length;};
export function chatHistory(messages){
 const rows=[];
 for(const m of messages){
  if(!['user','assistant','tool'].includes(m.role))continue;
  if(m.role==='tool'){if(typeof m.tool_call_id==='string')rows.push({role:'tool',content:content(m),tool_call_id:m.tool_call_id});continue;}
  const value={role:m.role,content:content(m)};
  if(m.role==='assistant'&&Array.isArray(m.tool_calls))value.tool_calls=m.tool_calls;
  rows.push(value);
 }
 // Keep complete tool-call groups; remove orphan results after the bounded history cut.
 const recent=rows.slice(-40),ids=new Set(recent.flatMap(m=>(m.tool_calls||[]).map(t=>t.id)));
 return recent.filter(m=>m.role!=='tool'||ids.has(m.tool_call_id));
}
function spokenRecord(r){
 if(r.status==='saved'){
  const bottle=r.records?.length===1&&r.records[0].kind==='bottle'?r.records[0]:null;
  const detail=bottle?`${bottle.targetRecordId?'已更新':'已记下'}，实际喝奶${bottle.value}毫升。`:'';
  return detail+(r.acknowledgedAt?'已保存并同步到禾安。':'已保存到禾安云端，手机打开后自动同步。');
 }
 if(r.status==='processing')return '收到，正在保存。完成后会同步到禾安。';
 return r.reply||'这次记录未完成，请稍后查看禾安中的原话。';
}
export function registerVoiceChat(app,{store,infer,quota=()=>true,publicOrigin='https://hean.example.com',now=()=>new Date(),log=entry=>console.info(JSON.stringify(entry))}={}){
 const route=createModelRouter({log}),active=new Map(),seenTools=new Set();
 const model=infer|| (async body=>route({providers:configuredModels(),totalMs:22000,hedgeAfterMs:5000,run:async(p,signal)=>{
  const r=await fetch(p.url,{method:'POST',headers:{Authorization:'Bearer '+p.key,'Content-Type':'application/json'},body:JSON.stringify({...p.options,...body,model:p.options.model,stream:false,max_tokens:1800,...(p.id==='qwen'?{enable_thinking:false}:{}),...(p.id==='minimax'?{thinking:{type:'disabled'}}:{})}),signal});
  if(!r.ok)throw Error('PROVIDER_'+r.status);return r.json();
 },validate:r=>{const m=r?.choices?.[0]?.message;if(!m||(!m.content&&!m.tool_calls?.length))throw Error('INVALID_MODEL_RESPONSE');return m;}}));
 async function run(req,messages,turn){
  const raw=messages.filter(m=>m.role==='user').at(-1);if(!raw||!content(raw).trim())throw Error('NO_USER_INPUT');
  const native=(req.body.tools||[]).filter(t=>t.type==='function'&&typeof t.function?.name==='string'&&!careNames.has(t.function.name));
  const names=native.map(t=>t.function.name).join(',');if(!seenTools.has(names)){seenTools.add(names);log({event:'voice_native_tools',names});}
  // A follow-up model step after our player result must not replay the same song.
  const tail=messages.slice(messages.findLastIndex(m=>m.role==='user')+1);
  const playerCalls=tail.flatMap(m=>m.tool_calls||[]).filter(c=>['hean_play_audio_link','hean_stop_audio'].includes(c.function?.name));
  const playerResult=tail.findLast(m=>m.role==='tool'&&playerCalls.some(c=>c.id===m.tool_call_id));
  if(playerResult){let result;try{result=JSON.parse(content(playerResult));}catch{}return {role:'assistant',content:result?.status==='accepted'?'播放指令已发送。':'播放未完成，请再试一次。'};}
  const tracks=store.musicList(req.voiceLink.owner,req.voiceLink.profile);
  const history=[{role:'system',content:system(now())},...chatHistory(messages)];
  // The SDK calls us again with device results. Summarize that result rather than
  // classifying the same user sentence and sending the camera/action twice.
  const deviceCalls=tail.flatMap(m=>m.tool_calls||[]).filter(c=>native.some(t=>t.function.name===c.function?.name));
  if(deviceCalls.length){
   const results=tail.filter(m=>m.role==='tool'&&deviceCalls.some(c=>c.id===m.tool_call_id));
   if(results.length<deviceCalls.length)return {role:'assistant',content:'设备操作已发出，暂未收到执行结果。'};
   if(results.some(r=>content(r).includes('HEAN_NATIVE_MODE_BLOCKED')))return {role:'assistant',content:'当前固件在数据看板运行时限制这项设备操作，这次没有执行。'};
   // Lookup-before-action remains supported (for example list an app, then open
   // its returned ID). Exclude completed no-argument actions and reject exact replays.
   const remaining=native.filter(t=>!(noArguments(t)&&deviceCalls.some(c=>c.function.name===t.function.name)));
   const answer=await model({messages:[...history,{role:'system',content:'本轮设备工具已经返回结果。仅依据真实结果回应；失败或无结果不能说已完成。不要重复执行同一个操作，也不要重新记录护理。若查询是完成用户指令所需的前置步骤，可以使用真实返回的ID继续所需操作；没有待完成步骤则简短回应。'}],...(remaining.length?{tools:remaining,tool_choice:'auto'}:{tool_choice:'none'}),temperature:0});
   for(const call of answer.tool_calls||[]){
    if(!remaining.some(t=>t.function.name===call.function?.name))throw Error('UNKNOWN_DEVICE_TOOL');
    if(deviceCalls.some(c=>c.function.name===call.function.name&&isDeepStrictEqual(JSON.parse(c.function.arguments||'{}'),JSON.parse(call.function.arguments||'{}'))))throw Error('UNEXPECTED_REPEAT_DEVICE_TOOL');
   }
   return {...answer,role:'assistant',content:answer.tool_calls?.length?'':answer.content||'设备已返回结果，暂时无法生成回复。'};
  }
  const invoke=async(name,args)=>{
   const response=await app.inject({method:'POST',url:'/mcp/hean',headers:{authorization:req.headers.authorization},payload:{jsonrpc:'2.0',id:randomUUID(),method:'tools/call',params:{name,arguments:args}}});
   const body=response.json();if(response.statusCode!==200||body.error||body.result?.isError)throw Error('CARE_TOOL_FAILED');
   return JSON.parse(body.result.content[0].text);
  };
  // A separate constrained routing pass cannot answer a care query from old chat text.
  const quick=quickMilk(content(raw),now().toISOString());
  const catalog=native.map(t=>t.function.name+': '+(t.function.description||'').slice(0,800)).join('\n');
  const decision=quick?{tool_calls:[{function:{name:'hean_route',arguments:'{"intent":"record"}'}}]}:await model({messages:[{role:'system',content:system(now())+'\n本轮只分类下面这一句用户输入，必须调用hean_route。日期按当前北京时间计算。拍宝宝照片属于native，不是护理记录。当前原生功能目录如下（参数在下一步生成）：\n'+catalog}, {role:'user',content:content(raw)}],tools:[routeTool(native)],tool_choice:{type:'function',function:{name:'hean_route'}},temperature:0});
  const routeCall=decision.tool_calls?.find(c=>c.function?.name==='hean_route');if(!routeCall)throw Error('INVALID_ROUTE');
  const selected=JSON.parse(routeCall.function.arguments||'{}');
  if(selected.intent==='query'){
   const dates=selected.dates?.length?selected.dates:[undefined];if(dates.length>7)throw Error('TOO_MANY_DATES');
   const values=[];for(const date of dates)values.push(await invoke('hean_query',date?{date}:{}));
   log({event:'voice_chat_care',tool:'hean_query',status:'read',days:values.length});
   return {role:'assistant',content:values.map(v=>querySpeech(v,selected.topic)).join('')+'以上仅代表已记录数据。'};
  }
  if(selected.intent==='record'){
   const r=await invoke('hean_record',{text:content(raw),request_id:turn});
   log({event:'voice_chat_care',tool:'hean_record',status:r.status,receipt:r.id});return {role:'assistant',content:spokenRecord(r)};
  }
  if(selected.intent==='receipt'){const r=await invoke('hean_receipt',{});return {role:'assistant',content:r.status==='no_receipt'?'还没有语音记录回执。':spokenRecord(r)};}
  if(selected.intent==='native'){
   const tool=native.find(t=>t.function.name===selected.native_tool);
   if(!tool)return {role:'assistant',content:'当前设备没有提供这项操作，暂时无法执行。'};
   const answer=noArguments(tool)?{tool_calls:[{id:'call_'+randomUUID(),type:'function',function:{name:tool.function.name,arguments:'{}'}}]}:await model({messages:history,tools:[tool],tool_choice:{type:'function',function:{name:tool.function.name}},temperature:0});
   if(answer.tool_calls?.length!==1||answer.tool_calls[0].function?.name!==tool.function.name)throw Error('MISSING_DEVICE_ACTION');
   log({event:'voice_chat_native',tool:tool.function.name,status:'dispatched'});
   // Let the official executor own camera UI, visual recognition and result TTS.
   // A model's pre-execution promise is not an execution receipt.
   return {role:'assistant',content:'',tool_calls:answer.tool_calls};
  }
  if(selected.intent==='music'){
   if(selected.song==='stop'){const stop=native.find(t=>t.function.name==='hean_stop_audio');if(!stop)throw Error('PLAYER_UNAVAILABLE');return {role:'assistant',content:'我来停止播放。',tool_calls:[{id:'call_'+randomUUID(),type:'function',function:{name:'hean_stop_audio',arguments:'{}'}}]};}
   if(selected.song==='list')return {role:'assistant',content:'禾安曲库里有ABC儿歌和鲁冰花，也可以两首连播。'};
   const song=tracks.find(x=>x.id===(selected.song||'playlist'));if(!song)return {role:'assistant',content:'曲库里暂时没有这首歌，可以播放ABC儿歌或鲁冰花。'};
   const ticket=store.musicTicket(req.voiceLink.owner,req.voiceLink.profile,song.id),fn=musicDispatch(native,song.title,publicOrigin+'/api/music/play/'+encodeURIComponent(song.id)+'?ticket='+ticket);
   return {role:'assistant',content:'我来播放'+song.title+'。',tool_calls:[{id:'call_'+randomUUID(),type:'function',function:fn}]};
  }
  const answer=await model({messages:history,...(native.length?{tools:native,tool_choice:'auto'}:{}),temperature:0.3});
  if(answer.tool_calls?.some(t=>!native.some(n=>n.function.name===t.function?.name)))throw Error('UNKNOWN_DEVICE_TOOL');
  return {...answer,role:'assistant',content:answer.content||''};
 }
 app.post('/api/voice/chat/completions',{bodyLimit:500000},async(req,res)=>{
  if(!req.voiceLink)return res.code(401).send({error:{message:'UNAUTHORIZED'}});
  if(!Array.isArray(req.body?.messages)||req.body.messages.length>300||!req.body.messages.some(m=>m.role==='user'))return res.code(400).send({error:{message:'INVALID_MESSAGES'}});
  const link=req.voiceLink,ownerKey=JSON.stringify([link.owner,link.profile]);
  // Include conversation history: two genuine equal utterances in consecutive turns have different keys.
  const fingerprint=hash(JSON.stringify(chatHistory(req.body.messages)));
  const turn=store.chatTurn(link.owner,link.profile,fingerprint);
  const inflight=active.get(ownerKey);if(inflight&&inflight.turn!==turn)return res.code(429).send({error:{message:'BUSY'}});
  let job=inflight?.job;
  if(!job){if(!quota(link.owner))return res.code(429).send({error:{message:'DAILY_LIMIT'}});job=run(req,req.body.messages,turn);active.set(ownerKey,{turn,job});job.finally(()=>{if(active.get(ownerKey)?.job===job)active.delete(ownerKey)}).catch(()=>{});}
  let message;
  try{message=await job;}catch(error){log({event:'voice_chat_failed',code:/^[A-Z_]+$/.test(error.message)?error.message:'FAILED'});message={role:'assistant',content:error.message==='PLAYER_UNAVAILABLE'?'家庭曲库已准备好，播放器连接还未完成，暂时不能播放。':'禾安暂时未能完成处理；如果是在记录，请先查询保存回执再决定是否重试。'};}
  const id='chatcmpl-'+randomUUID(),created=Math.floor(now().getTime()/1000),modelName='hean-care',finish=message.tool_calls?.length?'tool_calls':'stop';
  if(req.body.stream){
   res.header('Content-Type','text/event-stream').header('X-Accel-Buffering','no');
   const delta={...message};if(delta.tool_calls)delta.tool_calls=delta.tool_calls.map((x,index)=>({...x,index}));
   const chunk=(d,reason)=>({id,object:'chat.completion.chunk',created,model:modelName,choices:[{index:0,delta:d,finish_reason:reason}]});
   return `data: ${JSON.stringify(chunk(delta,null))}\n\ndata: ${JSON.stringify(chunk({},finish))}\n\ndata: [DONE]\n\n`;
  }
  return {id,object:'chat.completion',created,model:modelName,choices:[{index:0,message,finish_reason:finish}]};
 });
}
