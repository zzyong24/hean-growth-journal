import {CareRecord,Attachment} from '../domain';
export function albumGroups(records:CareRecord[],birthday:string,filter:'all'|'image'|'video'='all'){
 const seen=new Set<string>();const grouped=new Map<string,{month:string;ageMonths:number;items:{attachment:Attachment;at:string;note:string}[]}>();
 const birth=new Date(birthday+'T12:00:00');
 for(const record of [...records].sort((a,b)=>Date.parse(b.at)-Date.parse(a.at))){for(const attachment of record.attachments||[]){
  if(attachment.type==='audio'||filter!=='all'&&attachment.type!==filter||seen.has(attachment.id))continue;seen.add(attachment.id);
  const at=attachment.capturedAt||record.at,date=new Date(at);if(!Number.isFinite(+date))continue;
  const month=`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}`;
  const ageMonths=Math.max(0,(date.getFullYear()-birth.getFullYear())*12+date.getMonth()-birth.getMonth()-(date.getDate()<birth.getDate()?1:0));
  const group=grouped.get(month)||{month,ageMonths,items:[]};group.items.push({attachment,at,note:record.note});grouped.set(month,group);
 }}
 return [...grouped.values()].sort((a,b)=>b.month.localeCompare(a.month));
}
