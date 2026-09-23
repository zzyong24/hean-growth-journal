// Remove only a redundant summary copy; retain the authoritative event and all
// conversation timestamps. Never choose which events the model should understand.
export function compactContext(context) {
 const known=new Map((context.records||[]).map(r=>[r.id,r]));
 const babyContext={...context.babyContext};
 if(Array.isArray(babyContext.history))babyContext.history=babyContext.history.filter(summary=>{
  const full=known.get(summary.id);
  if(!full)return true;
  return Object.entries(summary).some(([key,value])=>{
   if(key==='attachmentCount')return value!==(full.attachments?.length||0);
   if(key==='note'&&typeof value==='string'&&typeof full.note==='string')return !full.note.startsWith(value);
   if(key==='attachments'&&Array.isArray(value))return value.length!==(full.attachments?.length||0)||value.some((a,i)=>Object.entries(a).some(([k,v])=>full.attachments[i][k]!==v));
   return JSON.stringify(full[key])!==JSON.stringify(value);
  });
 });
 return {...context,babyContext};
}
