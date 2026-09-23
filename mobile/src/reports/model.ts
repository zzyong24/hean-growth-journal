import {CareRecord} from '../domain';
import {dayAnalytics,sleepMinutes} from '../analytics';
export type Period='day'|'week'|'month';
export const localDate=(d:Date)=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
export function reportRange(period:Period,date:string){
 const start=new Date(date+'T00:00:00');
 if(!Number.isFinite(+start)||localDate(start)!==date)throw new Error('INVALID_DATE');
 if(period==='week')start.setDate(start.getDate()-(start.getDay()+6)%7);
 if(period==='month')start.setDate(1);
 const end=new Date(start);if(period==='month')end.setMonth(end.getMonth()+1);else end.setDate(end.getDate()+(period==='week'?7:1));
 const days=Math.round((Date.UTC(end.getFullYear(),end.getMonth(),end.getDate())-Date.UTC(start.getFullYear(),start.getMonth(),start.getDate()))/86400000);
 return {start,end,days};
}
export function buildReport(records:CareRecord[],period:Period,date:string,now=new Date()){
 const range=reportRange(period,date),end=Math.min(+range.end,+now);
 const eligible=records.filter(r=>Date.parse(r.at)<=+now);
 const rows=eligible.filter(r=>Date.parse(r.at)>=+range.start&&Date.parse(r.at)<+range.end);
 const daily=Array.from({length:range.days},(_,i)=>{const d=new Date(range.start);d.setDate(d.getDate()+i);return dayAnalytics(eligible,d)});
 const sum=(kind:CareRecord['kind'])=>{const rs=rows.filter(r=>r.kind===kind&&r.value!==undefined);return rs.length?rs.reduce((s,r)=>s+r.value!,0):null};
 const diapers=rows.filter(r=>r.kind==='diaper');
 const count=(values:string[])=>diapers.some(r=>r.details?.diaperType)?diapers.filter(r=>values.includes(r.details?.diaperType||'')).length:null;
 const seenMedia=new Set<string>();
 const moments=rows.filter(r=>r.kind==='note'||r.attachments?.some(a=>a.type!=='audio')).sort((a,b)=>a.at.localeCompare(b.at)).filter(r=>{const id=r.attachments?.find(a=>a.type!=='audio')?.id;if(!id)return true;if(seenMedia.has(id))return false;seenMedia.add(id);return true;});
 const sleep=sleepMinutes(eligible,+range.start,end);
 return {...range,generatedAt:now,rows,daily,milk:sum('bottle'),nursing:sum('nursing'),sleep:sleep||null,diapers:diapers.length||null,stools:count(['dirty','mixed']),wet:count(['wet','mixed']),unclassified:diapers.filter(r=>!r.details?.diaperType).length,feeds:rows.filter(r=>r.kind==='bottle'||r.kind==='nursing').length,coveredDays:daily.filter(d=>d.rows.length).length,elapsedDays:daily.filter(d=>+d.date<=+now).length,moments};
}
export type Report=ReturnType<typeof buildReport>;
