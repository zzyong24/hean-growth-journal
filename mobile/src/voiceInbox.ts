import { AppData, CareRecord, mergeRecords, validateRecord, recordVersion } from './domain';
export type VoiceReceipt = { profileKey?:string; id:string; text:string; capturedAt:string; timezone:string; status:'saved'|'review'|'failed'|'processing'|'undone'; records:CareRecord[]; previousRecords?:CareRecord[]; reply?:string };
export function validReceipt(r: any): r is VoiceReceipt {
 return !!r && typeof r.id==='string' && /^[A-Za-z0-9-]+$/.test(r.id) && typeof r.text==='string' && Number.isFinite(Date.parse(r.capturedAt)) && ['saved','review','failed','processing','undone'].includes(r.status) && Array.isArray(r.records) && r.records.every(validateRecord);
}
export function applyReceipts(data:AppData, receipts:VoiceReceipt[]) {
 const processed = new Set(data.voiceReceiptIds || []);
 let records = data.records;
 const incoming:VoiceReceipt[]=[];
 for(const r of [...receipts].sort((a,b)=>Date.parse(a.capturedAt)-Date.parse(b.capturedAt))) {
  if((data.babyId && (r.profileKey||'legacy')!==data.babyId) || !validReceipt(r) || r.status==='processing' || processed.has(`${r.id}:${r.status}`)) continue;
  if(r.status==='saved') records=mergeRecords(records,r.records);
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
  processed.add(`${r.id}:${r.status}`); incoming.push(r);
 }
 return { data:{...data,records,voiceReceiptIds:[...processed]},incoming };
}
