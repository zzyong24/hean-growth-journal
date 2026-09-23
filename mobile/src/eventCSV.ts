import {CareRecord} from './domain';
const names:Record<string,string>={bottle:'瓶喂',nursing:'亲喂',pumping:'吸奶',sleep:'睡眠',diaper:'尿布',note:'观察',food:'辅食',medicine:'用药',supplement:'补剂',height:'身长',head:'头围',weight:'体重',temperature:'体温'};
export function eventCSV(records:CareRecord[],baby:string,timezone:string){
 const time=(at:string)=>new Intl.DateTimeFormat('sv-SE',{timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).format(new Date(at));
 const cell=(v:unknown)=>{let s=v==null?'':String(v);if(/^[\s]*[=+@-]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"';};
 const rows:unknown[][]=[['宝宝','事件ID','事件类型','发生时间','时区','原始ISO时间','时间精度','开始时间','结束时间','数值','单位','侧别','备注','原始描述','属性JSON','附件数量']];
 for(const r of [...records].sort((a,b)=>Date.parse(a.at)-Date.parse(b.at))){const exact=r.timePrecision!=='day';const sleep=r.kind==='sleep'&&r.value!=null&&exact;rows.push([baby,r.id,names[r.kind]||r.kind,exact?time(r.at):time(r.at).slice(0,10),timezone,r.at,r.timePrecision||'exact',sleep?time(new Date(Date.parse(r.at)-r.value!*60000).toISOString()):'',sleep?time(r.at):'',r.value,r.unit,r.side,r.note,r.sourceText,JSON.stringify(r.details||{}),r.attachments?.length||0]);}
 return '\uFEFF'+rows.map(row=>row.map(cell).join(',')).join('\r\n')+'\r\n';
}
