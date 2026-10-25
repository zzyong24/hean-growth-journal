import {type AppData,type CareRecord,recordVersion,uid,validateRecord,mergeRecords} from '../domain/index.ts';
export type BottleSession={id:string;at:string;preparedMl:number;milkType?:'formula'|'breastMilk';sourceText:string};
export type BottleFinish={session:BottleSession;record:CareRecord};
export type BottleAction=
 | {type:'start';session:BottleSession}
 | {type:'finish';sessionId:string;record:CareRecord}
 | {type:'cancel';sessionId:string;at:string}
 | {type:'undo';recordId:string;baseVersion:string;at:string};
const finite=(v:unknown):v is number=>typeof v==='number'&&Number.isFinite(v)&&v>=0;
const instant=(v:unknown):v is string=>typeof v==='string'&&Number.isFinite(Date.parse(v));
export function validBottleSession(s:any):s is BottleSession{return !!s&&typeof s.id==='string'&&/^[\w-]{1,100}$/.test(s.id)&&instant(s.at)&&finite(s.preparedMl)&&s.preparedMl>0&&(!s.milkType||['formula','breastMilk'].includes(s.milkType))&&typeof s.sourceText==='string'&&s.sourceText.length<=8000;}
export function validBottleAction(a:any):a is BottleAction {
 if(!a)return false;
 if(a.type==='start')return validBottleSession(a.session);
 if(a.type==='finish')return typeof a.sessionId==='string'&&a.record?.id===`bottle-${a.sessionId}`&&a.record?.kind==='bottle'&&validateRecord(a.record)&&a.record.details?.preparedMl!==undefined;
 if(a.type==='cancel')return typeof a.sessionId==='string'&&instant(a.at);
 return a.type==='undo'&&typeof a.recordId==='string'&&typeof a.baseVersion==='string'&&instant(a.at);
}
/** Only explicit quantities enter the completed record. Prepared milk is not intake. */
export function normalizeBottleAction(raw:any,context:Pick<AppData,'bottleSession'|'lastBottleFeed'>,sourceText:string,now:string):BottleAction|undefined {
 if(raw===undefined)return undefined;
 if(!raw||!instant(now))throw Error('INVALID_BOTTLE_ACTION');
 if(raw.type==='start'){
  const session:BottleSession={id:uid(),at:raw.at||now,preparedMl:raw.preparedMl,sourceText,...(raw.milkType?{milkType:raw.milkType}:{})};
  if(!validBottleSession(session)||context.bottleSession)throw Error('BOTTLE_ALREADY_RUNNING_OR_INVALID');
  return {type:'start',session};
 }
 if(raw.type==='undo'){
  const last=context.lastBottleFeed;if(!last||raw.recordId!==last.record.id||context.bottleSession)throw Error('BOTTLE_UNDO_TARGET_REQUIRED');
  return {type:'undo',recordId:last.record.id,baseVersion:recordVersion(last.record),at:now};
 }
 const s=context.bottleSession;if(!validBottleSession(s)||raw.sessionId!==s.id)throw Error('BOTTLE_SESSION_REQUIRED');
 if(raw.type==='cancel')return {type:'cancel',sessionId:s.id,at:now};
 if(raw.type!=='finish')throw Error('INVALID_BOTTLE_ACTION');
 const consumed=raw.consumedMl,leftover=raw.leftoverMl;
 if(consumed===undefined&&leftover===undefined)throw Error('BOTTLE_AMOUNT_REQUIRED');
 if(consumed!==undefined&&(!finite(consumed)||consumed>s.preparedMl)||leftover!==undefined&&(!finite(leftover)||leftover>s.preparedMl))throw Error('INVALID_BOTTLE_AMOUNT');
 if(consumed!==undefined&&leftover!==undefined&&Math.abs(consumed+leftover-s.preparedMl)>0.001)throw Error('BOTTLE_AMOUNTS_CONFLICT');
 const value=Math.round((consumed??s.preparedMl-leftover)*100)/100;
 const record:CareRecord={id:`bottle-${s.id}`,kind:'bottle',at:s.at,value,unit:'ml',details:{preparedMl:String(s.preparedMl),...(s.milkType?{milkType:s.milkType}:{})},note:`冲泡 ${s.preparedMl} ml，实际喝下 ${value} ml，剩余 ${Math.round((s.preparedMl-value)*100)/100} ml`,sourceText:(s.sourceText+'\n'+sourceText).slice(0,8000)};
 return {type:'finish',sessionId:s.id,record};
}
export function canUndoBottle(data:AppData){const last=data.lastBottleFeed;return !!last&&!data.bottleSession&&data.records.some(r=>r.id===last.record.id&&recordVersion(r)===recordVersion(last.record));}
export function applyBottleAction(data:AppData,a?:BottleAction):AppData {
 if(!a)return data;if(!validBottleAction(a))throw Error('INVALID_BOTTLE_ACTION');
 const history=data.bottleHistory||[];
 if(a.type==='start'){
  if(data.bottleSession?.id===a.session.id){if(JSON.stringify(data.bottleSession)!==JSON.stringify(a.session))throw Error('STALE_BOTTLE_SESSION');return data;}
  if(data.records.some(r=>r.id===`bottle-${a.session.id}`)||history.some(h=>h.session.id===a.session.id))return data;
  if(data.bottleSession)throw Error('BOTTLE_ALREADY_RUNNING');
  return {...data,bottleSession:a.session};
 }
 if(a.type==='undo'){
  const last=data.lastBottleFeed;
  if(!last&&data.bottleSession&&a.recordId===`bottle-${data.bottleSession.id}`&&!data.records.some(r=>r.id===a.recordId))return data;
  if(!canUndoBottle(data)||!last||last.record.id!==a.recordId||recordVersion(last.record)!==a.baseVersion)throw Error('STALE_BOTTLE_UNDO');
  return {...data,records:data.records.filter(r=>r.id!==a.recordId),bottleSession:last.session,lastBottleFeed:undefined,bottleHistory:[...history,{session:last.session,record:last.record,status:'undone',at:a.at}].slice(-200)};
 }
 if(a.type==='cancel'){
  if(!data.bottleSession&&history.some(h=>h.session.id===a.sessionId&&h.status==='cancelled'))return data;
  if(data.bottleSession?.id!==a.sessionId)throw Error('STALE_BOTTLE_SESSION');
  return {...data,bottleSession:undefined,bottleHistory:[...history,{session:data.bottleSession,status:'cancelled',at:a.at}].slice(-200)};
 }
 const existing=data.records.find(r=>r.id===a.record.id);
 if(existing){if(recordVersion(existing)===recordVersion(a.record)&&!data.bottleSession)return data;throw Error('STALE_BOTTLE_FINISH');}
 const session=data.bottleSession;
 if(!session||session.id!==a.sessionId||a.record.at!==session.at||Number(a.record.details?.preparedMl)!==session.preparedMl||a.record.details?.milkType!==session.milkType)throw Error('STALE_BOTTLE_SESSION');
 return {...data,records:mergeRecords(data.records,[a.record]),bottleSession:undefined,lastBottleFeed:{session,record:a.record}};
}
