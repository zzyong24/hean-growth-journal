import type {Profile} from './domain';
function dateKey(d:Date){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
export function birthDayNumber(text:string){const m=text.match(/(?:出生(?:后)?\s*)?第\s*([一二三四五六七八九十百\d]+)\s*天/);if(!m)return null;const raw=m[1];if(/^\d+$/.test(raw))return Number(raw);const numbers:Record<string,number>={一:1,二:2,三:3,四:4,五:5,六:6,七:7,八:8,九:9};if(raw==='十')return 10;if(raw.includes('十')){const [a,b]=raw.split('十');return (numbers[a]||1)*10+(numbers[b]||0);}return numbers[raw]||null;}
export function eventTime(text:string,profile:Profile,capturedAt?:string,now=new Date()){
 const capture=capturedAt&&Number.isFinite(Date.parse(capturedAt))?new Date(capturedAt):null;
 const day=birthDayNumber(text);
 if(day&&day>0&&day<=1096&&profile.birthday){const date=new Date(profile.birthday+'T12:00:00');date.setDate(date.getDate()+day-1);if(capture&&dateKey(capture)===dateKey(date))return {at:capture.toISOString(),timePrecision:'exact' as const};return {at:date.toISOString(),timePrecision:'day' as const};}
 return {at:(capture||now).toISOString(),timePrecision:'exact' as const};
}
