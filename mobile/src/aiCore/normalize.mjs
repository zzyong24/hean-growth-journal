import {normalizeBottleAction} from '../care/bottleFlow.ts';
import {validateRecord,units,recordVersion,uid} from '../domain/index.ts';
export function normalizeDrafts(result,sourceText,pending=[],saved=[],context={}){
 if(!result||!Array.isArray(result.drafts)||result.drafts.length>100||typeof result.reply!=='string')throw new Error('INVALID_MODEL_RESPONSE');
 // Some providers duplicate a running session as a duration-less completed draft.
 // The typed start action owns it; never invent a completed duration.
 const bottleAction=normalizeBottleAction(result.bottleAction,context,sourceText,context.now);
 const drafts=result.drafts.filter(d=>!(result.nursingStart&&d.kind==='nursing'&&d.value==null&&d.side===result.nursingStart.side)).map(d=>{
   const prior=pending.find(p=>p.id===d.id);
   let target=saved.find(r=>r.id===(d.targetRecordId||d.id));
   if((d.targetRecordId&&!target)||(target&&target.kind!==d.kind))throw new Error('INVALID_UPDATE_TARGET');
   // A sleep with the same observed start is one episode, even if the model omitted the update operation.
   if(!prior&&!target&&d.kind==='sleep'&&Number.isFinite(d.value)){
     const start=Date.parse(d.at)-d.value*60000;
     const matches=saved.filter(r=>r.kind==='sleep'&&r.timePrecision!=='day'&&Math.abs(Date.parse(r.at)-(r.value||0)*60000-start)<1000);
     if(matches.length===1)target=matches[0];
   }
   if(!prior&&!target){
     const exact=saved.filter(r=>r.kind===d.kind&&Date.parse(r.at)===Date.parse(d.at)&&r.value===d.value&&r.side===d.side&&r.note===(d.note||''));
     if(exact.length===1)target=exact[0];
   }
   const base=prior||target;
   return {id:base?.id||uid(),...(base?.attachments?{attachments:base.attachments}:{}),
     ...(target?{targetRecordId:target.id,baseVersion:recordVersion(target)}:prior?.targetRecordId?{targetRecordId:prior.targetRecordId,baseVersion:prior.baseVersion}:{}),
     kind:d.kind,at:d.at,...(d.details?{details:d.details}:base?.details?{details:base.details}:{}),...(d.timePrecision==='day'||(base?.timePrecision==='day'&&d.timePrecision!=='exact')?{timePrecision:'day'}:{}),
     ...(d.value!=null?{value:d.value}:{}),...(d.side?{side:d.side}:{}),unit:units[d.kind],note:typeof d.note==='string'?d.note:'',sourceText:base?.sourceText||sourceText};
 });
 if(!drafts.every(validateRecord)||new Set(drafts.map(d=>d.id)).size!==drafts.length)throw new Error('INVALID_MODEL_RESPONSE');
 if(result.nursingStart&&(!['left','right'].includes(result.nursingStart.side)||!Number.isFinite(Date.parse(result.nursingStart.at))))throw new Error('INVALID_MODEL_RESPONSE');
 if(result.sleepStart&&!Number.isFinite(Date.parse(result.sleepStart)))throw new Error('INVALID_MODEL_RESPONSE');
 if(bottleAction&&drafts.some(d=>d.kind==='bottle'&&(bottleAction.type==='start'?d.at===bottleAction.session.at:bottleAction.type==='finish'?d.id===bottleAction.record.id||d.at===bottleAction.record.at:false)))throw Error('DUPLICATE_BOTTLE_ACTION');
 const reviewReasons=Array.isArray(result.reviewReasons)?result.reviewReasons.filter(x=>typeof x==='string'&&x.trim()).slice(0,20).map(x=>x.slice(0,1000)):[];
 return {...(bottleAction?{bottleAction}:{}),reviewReasons,...(result.sleepStart?{sleepStart:result.sleepStart}:{}),...(result.nursingStart?{nursingStart:result.nursingStart}:{}),drafts,reply:result.reply.slice(0,12000),mode:'ai'};
}
