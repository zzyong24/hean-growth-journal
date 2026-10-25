import {validBottleAction,type BottleAction} from './care/bottleFlow';
import {enqueueReview} from './review/queue';
import {commitAutomaticRecords} from './automaticRecord';
import { AppData, CareRecord, mergeRecords, validateRecord, recordVersion } from './domain';
export type VoiceReceipt = { bottleAction?:BottleAction;reviewReasons?:string[]; sleepStart?:string; nursingStart?:AppData["nursingSession"]; profileKey?:string; id:string; text:string; capturedAt:string; timezone:string; status:'saved'|'review'|'failed'|'processing'|'undone'; records:CareRecord[]; previousRecords?:CareRecord[]; reply?:string };
export function validReceipt(r: any): r is VoiceReceipt {
 return !!r && (!r.reviewReasons||Array.isArray(r.reviewReasons)&&r.reviewReasons.every((x:unknown)=>typeof x==='string')) && (!r.bottleAction||validBottleAction(r.bottleAction)) && typeof r.id==='string' && /^[A-Za-z0-9-]+$/.test(r.id) && typeof r.text==='string' && Number.isFinite(Date.parse(r.capturedAt)) && ['saved','review','failed','processing','undone'].includes(r.status) && (!r.sleepStart || Number.isFinite(Date.parse(r.sleepStart))) && (!r.nursingStart || (['left','right'].includes(r.nursingStart.side)&&Number.isFinite(Date.parse(r.nursingStart.at)))) && Array.isArray(r.records) && r.records.every(validateRecord);
}
export function applyReceipts(data:AppData, receipts:VoiceReceipt[]) {
 const processed = new Set(data.voiceReceiptIds || []);
 let records = data.records;
 let state=data;
 const incoming:VoiceReceipt[]=[];
 for(const r of [...receipts].sort((a,b)=>Date.parse(a.capturedAt)-Date.parse(b.capturedAt))) {
  if((data.babyId && (r.profileKey||'legacy')!==data.babyId) || !validReceipt(r) || r.status==='processing' || processed.has(`${r.id}:${r.status}`)) continue;
  let delivered=r;
  if(r.status==='saved') {
   try {state=commitAutomaticRecords({...state,records},r.records,r.nursingStart,r.sleepStart,r.bottleAction);records=state.records;}
   catch {state={...state,voiceReceiptConflicts:[...new Set([...(state.voiceReceiptConflicts||[]),r.id])]};delivered={...r,status:'review',reply:'手机中的原记录已改动，这笔语音记录尚未覆盖；请核对原话后重新告诉我如何修改。'};}
  }
  if(r.status==='undone') {
   // Never delete a corrected event, or overwrite an edit made after Siri saved it.
   const previous=r.previousRecords||[];
   for(const saved of r.records){
    const current=records.find(x=>x.id===saved.id);
    if(!current||recordVersion(current)!==recordVersion({...saved,unit:current.unit}))continue;
    const original=previous.find(x=>x.id===saved.id);
    if(original&&validateRecord(original)) records=records.map(x=>x.id===original.id?original:x);
    else if(!saved.targetRecordId) records=records.filter(x=>x.id!==saved.id);
   }
  }
  if(delivered.status==='review'||delivered.status==='failed'||r.reviewReasons?.length){state=enqueueReview({...state,records},{id:'voice-review-'+r.id,origin:'voice',at:r.capturedAt,title:delivered.status==='failed'?'语音解析未完成':'语音记录待核对',reason:r.reviewReasons?.join('；')||delivered.reply||'请核对原话。',sourceText:r.text,proposedRecords:r.records,...(delivered.status!=='saved'?{bottleAction:r.bottleAction,sleepStart:r.sleepStart,nursingStart:r.nursingStart}:{}),recordIds:r.records.filter(x=>records.some(y=>y.id===x.id)).map(x=>x.id)});}
  processed.add(`${r.id}:${r.status}`); incoming.push(delivered);
 }
 return { data:{...state,records,voiceReceiptIds:[...processed]},incoming };
}
