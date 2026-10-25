import {eliminationSummary} from '../mobile/src/care/details.ts';
import {ageDays} from '../mobile/src/domain/index.ts';
import {createHash} from 'node:crypto';
const chinaDate=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Shanghai'});
const day=at=>chinaDate.format(new Date(at));
function totals(rows){
 const feeds=rows.filter(r=>r.kind==='bottle'),sleep=rows.filter(r=>r.kind==='sleep');
 return {milkMl:feeds.length?feeds.reduce((n,r)=>n+r.value,0):null,
  sleepMinutes:sleep.length?sleep.reduce((n,r)=>n+r.value,0):null,
  diaperChanges:eliminationSummary(rows).changes.total??null};
}
export function displaySummary(state,now=new Date()){
 const d=state.data,date=day(now),midnight=new Date(date+'T00:00:00+08:00').getTime();
 const dates=Array.from({length:7},(_,i)=>day(midnight+(i-6)*86400000)),days=new Map(dates.map(d=>[d,[]]));
 for(const row of d.records)days.get(day(row.at))?.push(row);
 const rows=days.get(date),week=dates.map(d=>totals(days.get(d)));
 const feeds=rows.filter(r=>r.kind==='bottle'),paired=feeds.filter(r=>r.details?.preparedMl!==undefined),sleep=rows.filter(r=>r.kind==='sleep');
 const elimination=eliminationSummary(rows);
 return {date,name:[...d.profile.name].slice(0,8).join(''),ageDays:d.profile.birthday?ageDays(d.profile,now,'Asia/Shanghai'):null,
  trend:{startDate:dates[0],endDate:date,milkMl:week.map(v=>v.milkMl),sleepMinutes:week.map(v=>v.sleepMinutes),diaperChanges:week.map(v=>v.diaperChanges)},
  consumedMl:feeds.length?feeds.reduce((n,r)=>n+r.value,0):null,feedCount:feeds.length,
  preparedMl:paired.length?paired.reduce((n,r)=>n+Number(r.details.preparedMl),0):null,
  leftoverMl:paired.length?paired.reduce((n,r)=>n+Number(r.details.preparedMl)-r.value,0):null,completeMilkCount:paired.length,
  urinations:elimination.urinations.total??null,diaperChanges:elimination.changes.total??null,
  sleepMinutes:sleep.length?sleep.reduce((n,r)=>n+r.value,0):null,
  bottlePreparedMl:d.bottleSession?.preparedMl??null,lastPhoneSync:state.updated,cloudUpdatedAt:state.cloudUpdated||state.updated,pendingPhoneCount:state.pending||0,serverTime:now.toISOString(),
  cloudSyncLabel:new Intl.DateTimeFormat('zh-CN',{timeZone:'Asia/Shanghai',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(state.cloudUpdated||state.updated)),
  phoneSyncLabel:new Intl.DateTimeFormat('zh-CN',{timeZone:'Asia/Shanghai',month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(state.updated)),
  caution:'仅显示已记录数据；未记录不等于未发生。冲泡与剩余仅统计成对记录。'};
}
export function registerDisplayRoutes(app,store,{now=()=>new Date()}={}){
 const summaries=new Map();
 app.post('/api/voice/display-pair',{bodyLimit:1024},async(req,res)=>{try{return {token:store.pairDisplay(req.user,req.body?.profileKey)}}catch{return res.code(400).send({error:'PROFILE_NOT_SYNCED'})}});
 app.get('/api/display/summary',async(req,res)=>{
  if(!req.displayLink)return res.code(401).send({error:'UNAUTHORIZED'});
  const {owner,profile}=req.displayLink,time=now(),key=JSON.stringify([owner,profile]),revision=store.revision(owner,profile),date=day(time);
  let cached=summaries.get(key);
  if(!cached||cached.revision!==revision||cached.date!==date){
   const state=store.state(owner,profile);if(!state)return res.code(404).send({error:'PROFILE_NOT_SYNCED'});
   const {serverTime,...value}=displaySummary(state,time);
   const {lastPhoneSync,phoneSyncLabel,cloudUpdatedAt,cloudSyncLabel,...facts}=value;
   const version=createHash('sha256').update(JSON.stringify(facts)).digest('hex').slice(0,20);
   cached={revision,date,value:{...value,version}};
   if(summaries.size>=100)summaries.delete(summaries.keys().next().value);summaries.set(key,cached);
  }
  // Heartbeat timestamps can advance while the data revision and cached totals stay fixed.
  const phoneUpdated=store.lastPhoneSync(owner,profile);
  if(phoneUpdated&&phoneUpdated!==cached.value.lastPhoneSync){
   cached.value.lastPhoneSync=phoneUpdated;
   cached.value.phoneSyncLabel=new Intl.DateTimeFormat('zh-CN',{timeZone:'Asia/Shanghai',month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(phoneUpdated));
   if(phoneUpdated>cached.value.cloudUpdatedAt){cached.value.cloudUpdatedAt=phoneUpdated;cached.value.cloudSyncLabel=new Intl.DateTimeFormat('zh-CN',{timeZone:'Asia/Shanghai',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(phoneUpdated));}
  }
  // The embedded HTTP API cannot read response headers; use a small conditional JSON reply.
  return req.query?.since===cached.value.version?{unchanged:true,version:cached.value.version,cloudSyncLabel:cached.value.cloudSyncLabel,phoneSyncLabel:cached.value.phoneSyncLabel,serverTime:time.toISOString()}:{...cached.value,serverTime:time.toISOString()};
 });
}
