export function messageTime(at:string|undefined,timezone:string,now=new Date()):string {
 if(!at||!Number.isFinite(Date.parse(at)))return '';
 const date=new Date(at);
 const day=(value:Date)=>new Intl.DateTimeFormat('en-CA',{timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit'}).format(value);
 const time=new Intl.DateTimeFormat('en-GB',{timeZone:timezone,hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(date);
 return day(date)===day(now)?time:`${day(date)} ${time}`;
}
