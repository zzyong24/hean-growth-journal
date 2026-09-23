export type Reminder={id:string;title:string;start:string;end:string;time:string;mode:'days'|'hours';interval:number;enabled:boolean};
function dateValid(v:string){if(!/^\d{4}-\d{2}-\d{2}$/.test(v))return false;const d=new Date(v+'T12:00:00');return Number.isFinite(+d)&&d.getFullYear()===+v.slice(0,4)&&d.getMonth()+1===+v.slice(5,7)&&d.getDate()===+v.slice(8,10)}
export function validReminder(r:Reminder){return !!r&&typeof r.id==='string'&&/^[a-zA-Z0-9-]+$/.test(r.id)&&typeof r.title==='string'&&r.title.trim().length>0&&r.title.length<=80&&dateValid(r.start)&&dateValid(r.end)&&r.end>=r.start&&/^([01]\d|2[0-3]):[0-5]\d$/.test(r.time)&&['days','hours'].includes(r.mode)&&Number.isInteger(r.interval)&&r.interval>=1&&r.interval<=365&&typeof r.enabled==='boolean'}
export function occurrences(r:Reminder,now=new Date(),limit=61):Date[]{if(!validReminder(r)||!r.enabled)return [];const end=new Date(r.end+'T23:59:59'),first=new Date(r.start+'T'+r.time+':00');let cursor=new Date(first);const out:Date[]=[];
 if(r.mode==='hours'&&cursor<=now)cursor=new Date(+first+(Math.floor((+now-+first)/(r.interval*3600000))+1)*r.interval*3600000);
 if(r.mode==='days'&&cursor<now){const rough=Math.max(0,Math.floor((+now-+first)/(86400000*r.interval))-1);cursor.setDate(cursor.getDate()+rough*r.interval);}
 while(cursor<=end&&out.length<limit){if(cursor>now)out.push(new Date(cursor));if(r.mode==='days'){cursor.setDate(cursor.getDate()+r.interval);cursor.setHours(+r.time.slice(0,2),+r.time.slice(3),0,0);}else cursor=new Date(+cursor+r.interval*3600000);}return out;
}

// Calendar projection includes past dates; notification scheduling remains future-only.
export function remindersOnDate(plans:Reminder[],date:string):Reminder[]{
 if(!dateValid(date))return [];
 const start=new Date(date+'T00:00:00'),end=new Date(start);end.setDate(end.getDate()+1);
 return plans.filter(r=>validReminder(r)&&r.enabled&&date>=r.start&&date<=r.end&&occurrences(r,new Date(+start-1),1).some(d=>d<end));
}
