import {normalizeDrafts} from '../mobile/src/aiCore/normalize.mjs';

// Only an unambiguous, present-time intake statement takes this path. Corrections,
// dates, questions, ongoing feeds and multi-event utterances use the full parser.
export function quickMilk(text, at, data={}) {
 if(data.bottleSession)return null;
 const match=String(text).trim().match(/^(?:(?:宝宝|孩子|小孩|我)\s*)?(?:刚刚|刚才|刚)?\s*喝(?:了|下了|完了)\s*(\d{1,3}(?:\.\d{1,2})?)\s*(?:毫升|ml)(?:的?奶)?\s*([，,]?\s*(?:都喝完了|全部喝完了))?[。！!]?$/i);
 if(!match)return null;
 const amount=Number(match[1]);if(amount<=0||amount>500)return null;
 return normalizeDrafts({drafts:[{kind:'bottle',at,value:amount,note:'',...(match[2]?{details:{preparedMl:String(amount)}}:{})}],reply:''},text,[],data.records||[],{...data,now:at});
}
