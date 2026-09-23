// The model reads the paper's wall clock. Code alone converts it to an instant.
export const imageTimePrompt = `
【图片记录的时间协议（补充输出字段）】
每个draft必须额外返回localAt，格式YYYY-MM-DDTHH:mm:ss，不带Z或时区偏移。
localAt填写图片中事件所属日期和该行原始钟点，采用请求timezone；不要减去或加上时差。程序负责转换为存储时间at。
先按表格分别核对日期、每行时间、事件和值；不同表格区块的行时间不能串用。月份日期缺年份时结合localNow补齐，不能拿上传时刻替换表内明确时刻。钟点确实无法辨认就询问该项，不猜数字；其他清晰行正常返回。
仅日期明确时标timePrecision:day并用12:00:00作存储锚点，不能把明确钟点降为日期精度。普通照片没有文字时按明确描述或capturedAt的当地时间；均无事件时间则使用localNow。
更新原记录而未修改时间时，localAt沿用对应localEventAt。localAt是当地钟点原文的结构化值，at由程序统一生成，禁止在备注里另写矛盾时间。`;

function localInstant(value, timezone) {
 const invalid=()=>{throw new Error('INVALID_MODEL_RESPONSE');};
 if(typeof timezone!=='string'||!timezone||typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(value))return invalid();
 const wall=Date.parse(value+'Z');
 if(!Number.isFinite(wall)||new Date(wall).toISOString().slice(0,19)!==value)return invalid();
 let fmt;
 try {fmt=new Intl.DateTimeFormat('en-CA',{timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});}catch{return invalid();}
 const partsAt=ms=>{
  const p=Object.fromEntries(fmt.formatToParts(new Date(ms)).map(x=>[x.type,x.value]));
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}`;
 };
 // Sample both sides of a possible DST transition; never choose an ambiguous clock.
 const offsets=new Set([-36,-12,0,12,36].map(h=>{
  const ms=wall+h*3600000;return Date.parse(partsAt(ms)+'Z')-ms;
 }));
 const candidates=[...offsets].map(offset=>wall-offset).filter(ms=>partsAt(ms)===value);
 if(candidates.length!==1)return invalid();
 return new Date(candidates[0]).toISOString();
}
export function normalizeImageTimes(result, timezone){
 if(!result||!Array.isArray(result.drafts))throw new Error('INVALID_MODEL_RESPONSE');
 return {...result,drafts:result.drafts.map(({localAt,...draft})=>({...draft,at:localInstant(localAt,timezone)}))};
}
