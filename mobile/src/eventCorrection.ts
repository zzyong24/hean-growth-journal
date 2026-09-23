import {CareRecord,recordVersion} from './domain';
// Only an explicit, single correction gets a deterministic fast path.
export function correctLatestBottle(text:string,records:CareRecord[],now=new Date()):CareRecord|null {
 const match=/^(?:(?:上一顿|上顿|刚才那顿|刚才)(?:的)?(?:奶|奶量)?)(?:实际)?(?:改成|改为|改到|是|只喝了)\s*(\d+(?:\.\d+)?)\s*(?:毫升|ml)(?:奶)?[。！!]?$/i.exec(text.trim());
 if(!match||+match[1]<=0||+match[1]>2000)return null;
 const candidates=records.filter(r=>r.kind==='bottle'&&Date.parse(r.at)<=now.getTime()).sort((a,b)=>Date.parse(b.at)-Date.parse(a.at));
 const r=candidates[0];
 if(!r||now.getTime()-Date.parse(r.at)>86400000||candidates[1]?.at===r.at)return null;
 return {...r,targetRecordId:r.id,baseVersion:recordVersion(r),value:+match[1],note:""};
}
