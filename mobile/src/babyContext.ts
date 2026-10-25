import { AppData, kinds } from './domain';
import { weekAnalytics } from './analytics';
export function deviceClock(now = new Date(),timezone=Intl.DateTimeFormat().resolvedOptions().timeZone) {
 const parts=new Intl.DateTimeFormat('en-CA',{timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(now);
 const v=(type:string)=>parts.find(p=>p.type===type)!.value;
 return {now:now.toISOString(),timezone,localDate:`${v('year')}-${v('month')}-${v('day')}`,utcOffsetMinutes:Math.round((Date.UTC(+v('year'),+v('month')-1,+v('day'),+v('hour'),+v('minute'),+v('second'))-now.getTime())/60000)};
}

export function relevantRecords(data: AppData, query = '') {
  const sorted=[...data.records].sort((a,b)=>Date.parse(b.at)-Date.parse(a.at));
  const tokens=query.toLowerCase().match(/[a-z0-9]+|[\u4e00-\u9fff]{2}/g)||[];
  const ranked=sorted.map(r=>({r,score:tokens.reduce((n,t)=>n+((r.note+' '+r.sourceText+' '+r.at+' '+r.kind).toLowerCase().includes(t)?1:0),0)})).filter(x=>x.score>0).sort((a,b)=>b.score-a.score).slice(0,20).map(x=>x.r);
  const latest=kinds.map(k=>sorted.find(r=>r.kind===k)).filter((r):r is AppData['records'][number]=>!!r);
  return [...new Map([...ranked,...latest,...sorted.slice(0,80)].map(r=>[r.id,r])).values()].slice(0,80);
}
export function babyContext(data: AppData, now = new Date(), query = '') {
  const sorted = [...data.records].sort((a,b) => Date.parse(b.at)-Date.parse(a.at));
  const compact = (r: AppData['records'][number]) => ({ id:r.id,details:r.details,kind:r.kind,at:r.at,value:r.value,unit:r.unit,side:r.side,note:r.note.slice(0,1000),timePrecision:r.timePrecision,attachments:r.attachments?.map(a=>({id:a.id,type:a.type,capturedAt:a.capturedAt})),attachmentCount:r.attachments?.length || 0 });
  return {
    ...deviceClock(now,data.settings.region==='CN'?'Asia/Shanghai':undefined), profile:data.profile, bottleSession:data.bottleSession,lastBottleFeed:data.lastBottleFeed, sleepStart:data.sleepStart || null, nursingSession:data.nursingSession || null,
    coverage:{ totalRecords:sorted.length, earliest:sorted.at(-1)?.at || null, latest:sorted[0]?.at || null },
    counts:Object.fromEntries(kinds.map(k=>[k,sorted.filter(r=>r.kind===k).length])),
    latestByKind:Object.fromEntries(kinds.map(k=>[k,sorted.find(r=>r.kind===k) ? compact(sorted.find(r=>r.kind===k)!) : null])),
    week:weekAnalytics(sorted,now).map(d=>({ date:deviceClock(d.date).localDate,milk:d.milk,nursing:d.nursing,sleep:d.sleep,diapers:d.diapers })),
    // Recent events plus query matches and latest measurements have a fixed prompt budget.
    history:relevantRecords(data,query).map(compact),
    historyScope:"Selected relevant records, not the entire archive. Absence here does not prove no event exists.",
    interpretation:'Missing records are unknown, not zero. Attachment metadata does not describe media content. Never invent observations.'
  };
}
