// Only explicit present-tense sleep transitions bypass the model.
export function sleepIntent(text:string, now=new Date()):{type:'start'|'end';at:string}|null {
 if(/[?？]|是不是|没有|没睡|还没|昨天|明天|如果|打算|要不要/.test(text))return null;
 if(/(?:现在|刚刚?|已经)?.{0,8}(?:醒了|睡醒了)[。！!\s]*$/.test(text)&&!/[，,]|喝|尿布|洗澡/.test(text))return {type:'end',at:now.toISOString()};
 if(!/睡着了|睡着有|已经睡了/.test(text)||/醒|喝|尿布|洗澡/.test(text))return null;
 const m=text.match(/(?:已经)?睡(?:着)?(?:了|有)?\s*(\d+)\s*(分钟|min|小时)/i);
 if(/\d/.test(text)&&!m)return null;
 const minutes=m?Number(m[1])*(m[2]==='小时'?60:1):0;
 if(minutes>1440)return null;
 return {type:'start',at:new Date(now.getTime()-minutes*60000).toISOString()};
}
