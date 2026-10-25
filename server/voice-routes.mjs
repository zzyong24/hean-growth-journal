import {quickMilk} from './quick-milk.mjs';
import {validateRecord} from '../mobile/src/domain/index.ts';
import {eliminationSummary} from '../mobile/src/care/details.ts';
import {applyVoiceResult} from './voice-store.mjs';
const toolResult=(value,isError=false)=>({content:[{type:'text',text:JSON.stringify(value)}],isError});
export const voiceTools=[
 {name:'hean_record',description:'将用户刚刚说的宝宝护理事实或纠正保存到禾安：奶量（冲泡/实际喝下）、亲喂、尿布、睡眠、体温、体重、身长、头围、吸奶、辅食、用药、补剂、观察。原话先持久保存。必须按回执状态播报；手机未回执不能说已进入APP。不得把咨询、建议、假设当记录。',inputSchema:{type:'object',properties:{text:{type:'string',description:'用户本次原话，保持时间、数值、否定、纠正及单位，不自行补充事实。'},request_id:{type:'string',description:'本次事件唯一编号（例如当前时间+随机串）；同一次调用重试必须复用，新的事件必须换新编号。'}},required:['text','request_id'],additionalProperties:false}},
 {name:'hean_receipt',description:'查询记录的真实保存和手机同步状态。无编号时返回最近回执。',inputSchema:{type:'object',properties:{receipt_id:{type:'string'}},additionalProperties:false},annotations:{readOnlyHint:true}},
 {name:'hean_query',description:'查询禾安某一天已知的护理记录及实际奶量、冲泡与剩余。数据带手机最近同步时间；缺少记录不等于没发生。',inputSchema:{type:'object',properties:{date:{type:'string',description:'中国时区日期YYYY-MM-DD，省略为今天'}},additionalProperties:false},annotations:{readOnlyHint:true}}
];
export function registerVoiceRoutes(app,{store,upstream,internalToken,quota}){
 const queues=new Map();
 app.addHook('onClose',async()=>{await Promise.allSettled([...queues.values()]);});
 async function briefly(job,fallback,ms){let timer;try{return await Promise.race([job,new Promise(resolve=>{timer=setTimeout(()=>resolve(fallback),ms);})]);}finally{clearTimeout(timer);}}

 async function process(link,r){
  try{
   const state=store.state(link.owner,link.profile);if(!state)throw Error('PROFILE_NOT_SYNCED');
   const d=state.data,records=[...d.records].sort((a,b)=>Date.parse(b.at)-Date.parse(a.at)).slice(0,80);
   let result=quickMilk(r.text,r.capturedAt,d);
   if(!result){
   const response=await fetch(upstream+'/api/interpret',{method:'POST',headers:{Authorization:`Bearer ${internalToken}`,'Content-Type':'application/json'},body:JSON.stringify({text:r.text,now:r.capturedAt,timezone:r.timezone,language:'zh',profile:d.profile,records,babyContext:{profile:d.profile,bottleSession:d.bottleSession,lastBottleFeed:d.lastBottleFeed,sleepStart:d.sleepStart,nursingSession:d.nursingSession,historyScope:'最近80条及尚未同步的语音记录；缺失不等于未发生'},history:store.list(link.owner,link.profile).filter(x=>x.id!==r.id).slice(-4).flatMap(x=>[{role:'user',text:x.text,at:x.capturedAt},{role:'assistant',text:x.reply||'',acceptedRecords:x.status==='saved'?x.records:[]}])}),signal:AbortSignal.timeout(120000)});
   if(!response.ok)throw Error('INTERPRET_FAILED');result=await response.json();
   }
   if(!Array.isArray(result.drafts)||!result.drafts.every(validateRecord))throw Error('INVALID_RESULT');
   const action=result.bottleAction;
   const actionReply=action?.type==='start'?`已开始这顿奶，准备${action.session.preparedMl}毫升，尚未计入摄入量。`:action?.type==='finish'?`这顿实际喝下${action.record.value}毫升，剩余${Number(action.record.details.preparedMl)-action.record.value}毫升。`:action?.type==='undo'?'已撤销上一顿奶的完成记录，恢复为进行中。':action?.type==='cancel'?'已取消这顿奶，未计入摄入量。':'';
   const hasAction=result.drafts.length||result.sleepStart||result.nursingStart||result.bottleAction;
   r={...r,records:result.drafts,...(result.bottleAction?{bottleAction:result.bottleAction}:{}),reviewReasons:result.reviewReasons||[],...(result.sleepStart?{sleepStart:result.sleepStart}:{}),...(result.nursingStart?{nursingStart:result.nursingStart}:{}),status:hasAction?'saved':'review',reply:hasAction?'已保存到禾安语音收件箱；打开手机禾安后自动同步。'+actionReply+(result.reply||''):(result.reply||'原话已保留，信息不足，尚未记入日常。')};
   if(hasAction)applyVoiceResult(d,r);
  }catch{const {bottleAction,nursingStart,sleepStart,...failed}=r;r={...failed,records:[],status:'failed',reply:'原话已保留，但解析未完成，尚未记入日常。打开禾安查看原话并重试。'};}
  r.completedAt=new Date().toISOString();store.save(link.owner,link.profile,r);return r;
 }
 const status=r=>({...r,delivery:r.acknowledgedAt?(r.status==='saved'?'phone_persisted':'phone_needs_review'):r.status==='saved'?'cloud_saved_awaiting_phone':r.status,appLink:`babyai://record?babyId=${encodeURIComponent(r.profileKey)}`});
 app.post('/api/voice/sync',{bodyLimit:18000000},async(req,res)=>{try{return {receipts:store.sync(req.user,req.body?.profileKey,req.body?.data,req.body?.acknowledgements||[])}}catch{return res.code(400).send({error:'INVALID_SYNC'})}});
 app.post('/api/voice/pair',{bodyLimit:1024},async(req,res)=>{try{return {token:store.pair(req.user,req.body?.profileKey,req.body?.label||'语音助手')}}catch{return res.code(400).send({error:'PROFILE_NOT_SYNCED'})}});
 app.get('/mcp/hean',async(req,res)=>res.code(405).header('Allow','POST').send());
 app.post('/mcp/hean',{bodyLimit:20000},async(req,res)=>{
  const m=req.body;if(!m||m.jsonrpc!=='2.0'||typeof m.method!=='string')return res.code(400).send({error:'INVALID_RPC'});
  if(m.id===undefined)return res.code(202).send();
  const rpc=result=>({jsonrpc:'2.0',id:m.id,result});const error=(code,message)=>({jsonrpc:'2.0',id:m.id,error:{code,message}});
  const link=req.voiceLink;
  if(m.method==='initialize')return rpc({protocolVersion:['2025-11-25','2025-06-18','2025-03-26','2024-11-05'].includes(m.params?.protocolVersion)?m.params.protocolVersion:'2025-03-26',capabilities:{tools:{}},serverInfo:{name:'hean-care',version:'1.0.0'},instructions:'宝宝记录必须使用hean_record并根据回执播报，不能口头承诺代替保存。phone_persisted表示手机已落盘，cloud_saved_awaiting_phone表示待手机打开同步。'});
  if(m.method==='ping')return rpc({});
  if(m.method==='tools/list')return rpc({tools:voiceTools});
  if(m.method!=='tools/call')return error(-32601,'Method not found');
  const a=m.params?.arguments||{},name=m.params?.name;
  if(name==='hean_receipt'){
   let rows=store.list(link.owner,link.profile),r=a.receipt_id?rows.find(x=>x.id===a.receipt_id):rows.at(-1);
   const job=queues.get(link.owner+':'+link.profile);
   if(r?.status==='processing'&&job){await briefly(job,null,6000);rows=store.list(link.owner,link.profile);r=rows.find(x=>x.id===r.id);}
   return rpc(toolResult(r?status(r):{status:'no_receipt'}));
  }
  if(name==='hean_query'){
   const date=a.date||new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Shanghai'}).format(new Date());
   if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date)))return rpc(toolResult({error:'INVALID_DATE'},true));
   const state=store.state(link.owner,link.profile);if(!state)return rpc(toolResult({error:'PROFILE_NOT_SYNCED'},true));
   const rows=state.data.records.filter(r=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Shanghai'}).format(new Date(r.at))===date);
   const feeds=rows.filter(r=>r.kind==='bottle'),paired=feeds.filter(r=>r.details?.preparedMl!==undefined);
   const elimination=eliminationSummary(rows),stoolRecords=rows.filter(r=>r.kind==='diaper'&&['dirty','mixed'].includes(r.details?.diaperType)).length;
   const consumed=feeds.reduce((n,r)=>n+r.value,0),prepared=paired.reduce((n,r)=>n+Number(r.details.preparedMl),0),leftover=paired.reduce((n,r)=>n+Number(r.details.preparedMl)-r.value,0);
   const synced=new Intl.DateTimeFormat('zh-CN',{timeZone:'Asia/Shanghai',month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(state.updated));
   const spokenSummary=`${date}，${feeds.length?`已记录${feeds.length}次瓶喂，实际喝下合计${consumed}毫升。`:'还没有已同步的瓶喂记录。'}${paired.length?`其中仅${paired.length}次同时记录了冲泡量，已知冲泡量合计${prepared}毫升、剩余合计${leftover}毫升；其余${feeds.length-paired.length}次冲泡量未记录，不能推算剩余。`:'冲泡量未记录，剩余量未知。'}已明确记录的小便次数${elimination.urinations.total??'未知'}，换尿布次数${elimination.changes.total??'未知'}。其中${stoolRecords}条记录包含大便。${state.data.bottleSession?`另有一顿奶进行中，准备了${state.data.bottleSession.preparedMl}毫升，尚未计入实际奶量。`:''}手机最近同步时间为北京时间${synced}。未记录不等于没有发生。`;
   return rpc(toolResult({date,spokenSummary,bottleSession:state.data.bottleSession||null,stoolRecords,lastPhoneSync:state.updated,counts:Object.fromEntries([...new Set(rows.map(r=>r.kind))].map(k=>[k,rows.filter(r=>r.kind===k).length])),consumedMl:feeds.length?feeds.reduce((n,r)=>n+r.value,0):null,preparedMl:paired.length?paired.reduce((n,r)=>n+Number(r.details.preparedMl),0):null,leftoverMl:paired.length?paired.reduce((n,r)=>n+Number(r.details.preparedMl)-r.value,0):null,completeMilkCount:paired.length,elimination:eliminationSummary(rows),records:rows.slice(0,150).map(({attachments,sourceText,...r})=>r),caution:'未记录不等于没发生；手机关闭后的手动修改需下次同步才可见。'}));
  }
  if(name!=='hean_record')return error(-32602,'Unknown tool');
  if(typeof a.text!=='string'||!a.text.trim()||a.text.length>8000||typeof a.request_id!=='string'||!a.request_id.trim()||a.request_id.length>160)return rpc(toolResult({error:'INVALID_INPUT'},true));
  let created;try{created=store.create(link.owner,link.profile,a.request_id,a.text);}catch{return rpc(toolResult({error:'IDEMPOTENCY_CONFLICT'},true));}
  if(!created.created)return rpc(toolResult(status(store.list(link.owner,link.profile).find(r=>r.id===created.receipt.id))));
  if(!quota(link.owner)){const r={...created.receipt,status:'failed',reply:'本日处理额度已用完，原话已保留，请在禾安中重试。'};store.save(link.owner,link.profile,r);return rpc(toolResult(status(r)));}
  const key=link.owner+':'+link.profile,previous=queues.get(key)||Promise.resolve();
  const job=previous.catch(()=>{}).then(()=>process(link,created.receipt));queues.set(key,job);job.finally(()=>{if(queues.get(key)===job)queues.delete(key)});
  // No client-disconnect signal: an accepted utterance must finish durably.
  return rpc(toolResult(status(await briefly(job,created.receipt,200))));
 });
}
