// Time metadata informs the model; it never decides the user's intent or writes events.
export function withTimeContext(context) {
 const now=Date.parse(context.now);
 let formatter;
 try {formatter=new Intl.DateTimeFormat('sv-SE',{timeZone:context.timezone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});} catch {throw new Error('INVALID_TIMEZONE');}
 const local=at=>Number.isFinite(Date.parse(at))?formatter.format(new Date(at)):null;
 return {...context,localNow:local(context.now),history:(context.history||[]).map(m=>({...m,localSentAt:local(m.at),elapsedMinutes:Number.isFinite(Date.parse(m.at))?Math.round((now-Date.parse(m.at))/60000):null,timeKnown:Number.isFinite(Date.parse(m.at))})),records:(context.records||[]).map(r=>({...r,localEventAt:local(r.at),...(r.kind==='sleep'&&Number.isFinite(r.value)?{localSleepStart:local(new Date(Date.parse(r.at)-r.value*60000).toISOString())}:{})}))};
}
