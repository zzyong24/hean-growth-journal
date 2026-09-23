// Only exact, unambiguous facts. Anything conversational, corrective or medical stays with AI.
export function fastReply(body:{text:string;profile?:{name?:string;birthday?:string};language?:string;pending?:unknown[];images?:unknown[];media?:unknown[]}):{reply:string;drafts:never[];mode:'local'}|null{
 if(body.pending?.length||body.images?.length||body.media?.length)return null;
 const text=body.text.trim().replace(/[?？。！!]+$/,'').trim(),zh=body.language!=='en';
 let reply:string|undefined;
 if(/^(宝宝|孩子|小孩)(的)?(昵称|名字)(是什么|叫什么|是啥)$/.test(text)||/^(宝宝|孩子|小孩)(叫什么|叫什么名字)$/.test(text)||/^what(?:'s| is) (?:my |the )?baby(?:'s)? name$/i.test(text)){
  if(body.profile?.name)reply=zh?`宝宝叫${body.profile.name}。`:`Your baby's name is ${body.profile.name}.`;
 }else if(/^(宝宝|孩子|小孩)(的)?(生日|出生日期)(是什么|是哪天|是几号)$/.test(text)||/^(宝宝|孩子|小孩)什么时候出生的$/.test(text)){
  if(/^\d{4}-\d{2}-\d{2}$/.test(body.profile?.birthday||''))reply=zh?`宝宝的出生日期是 ${body.profile!.birthday}。`:`Your baby was born on ${body.profile!.birthday}.`;
 }
 return reply?{reply,drafts:[],mode:'local'}:null;
}
