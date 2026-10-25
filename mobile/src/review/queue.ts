import {validBottleAction,type BottleAction} from '../care/bottleFlow.ts';
import {validateRecord} from '../domain/index.ts';
import type {AppData,CareRecord,Attachment} from '../domain/index.ts';
export type ReviewEntry={id:string;at:string;origin:'notebook'|'voice'|'request'|'audio';title:string;sourceText:string;reason:string;attachments?:Attachment[];recordIds?:string[];proposedRecords?:CareRecord[];bottleAction?:BottleAction;sleepStart?:string;nursingStart?:AppData["nursingSession"];resolvedAt?:string;resolution?:string};
export function validReview(r:any):r is ReviewEntry{return !!r&&typeof r.id==='string'&&typeof r.title==='string'&&typeof r.reason==='string'&&typeof r.sourceText==='string'&&Number.isFinite(Date.parse(r.at))&&['notebook','voice','request','audio'].includes(r.origin)
 &&(r.recordIds===undefined||Array.isArray(r.recordIds)&&r.recordIds.every((id:unknown)=>typeof id==='string'))
 &&(r.proposedRecords===undefined||Array.isArray(r.proposedRecords)&&r.proposedRecords.every(validateRecord))
 &&(r.attachments===undefined||validateRecord({id:'review-source',kind:'note',at:r.at,note:'source',sourceText:'',attachments:r.attachments}))
 &&(r.bottleAction===undefined||validBottleAction(r.bottleAction))
 &&(r.sleepStart===undefined||Number.isFinite(Date.parse(r.sleepStart)))
 &&(r.nursingStart===undefined||['left','right'].includes(r.nursingStart.side)&&Number.isFinite(Date.parse(r.nursingStart.at)))
 &&(r.resolvedAt===undefined||Number.isFinite(Date.parse(r.resolvedAt)));}
export function enqueueReview(data:AppData,item:ReviewEntry):AppData {
 if(!validReview(item))throw Error('INVALID_REVIEW');
 const old=(data.reviewQueue||[]).find(x=>x.id===item.id);
 if(old)return data;
 return {...data,reviewQueue:[...(data.reviewQueue||[]),item]};
}
export function resolveReview(data:AppData,id:string,resolution='已核对',at=new Date().toISOString()):AppData{return {...data,reviewQueue:(data.reviewQueue||[]).map(x=>x.id===id?{...x,resolvedAt:at,resolution}:x)};}
/** One card per notebook source, including existing imports without review metadata. */
export function seedNotebookReviews(data:AppData):AppData {
 let result=data;const groups=new Map<string,CareRecord[]>();
 for(const r of data.records){const a=r.attachments?.find(a=>a.role==='source');if(!a)continue;const rows=groups.get(a.id)||[];rows.push(r);groups.set(a.id,rows);}
 for(const [source,rows] of groups){
  const affected=rows.filter(r=>/待核对|字迹不清|时段待|实际量待/.test(r.note+' '+r.sourceText));if(!affected.length)continue;
  const page=rows.find(r=>r.kind==='note')||affected[0];
  result=enqueueReview(result,{id:'notebook-review-'+source,origin:'notebook',at:page.at,title:'本子记录待核对',reason:page.note.includes('待核对')?page.note:'部分时刻或数值不清，请对照原图补充。',sourceText:page.sourceText,attachments:page.attachments,recordIds:affected.filter(r=>r.kind!=='note').map(r=>r.id)});
 }
 return result;
}
export function pendingReviews(data:AppData){return (data.reviewQueue||[]).filter(r=>!r.resolvedAt).sort((a,b)=>Date.parse(b.at)-Date.parse(a.at));}
