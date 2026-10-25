export const detailOptions = {
 milkType: ['breastMilk','formula'],
 diaperType: ['wet','dirty','mixed'],
 stoolColor: ['yellow','green','brown','black','red','white'],
 stoolTexture: ['loose','soft','formed','hard'],
} as const;
export type CareDetails={milkType?:string;preparedMl?:string;diaperType?:string;urinationCount?:string;diaperChangeCount?:string;stoolColor?:string;stoolTexture?:string;item?:string;quantity?:string};
export function validDetails(d:unknown):boolean {
 if(d===undefined)return true;
 if(!d||typeof d!=='object'||Array.isArray(d))return false;
 return Object.entries(d).every(([key,v])=>typeof v==='string'&&v.length<=200&&(['urinationCount','diaperChangeCount'].includes(key)? /^\d+$/.test(v)&&Number.isSafeInteger(Number(v)) : key==='preparedMl'? /^\d+(\.\d+)?$/.test(v)&&Number.isFinite(Number(v)) : key==='item'||key==='quantity'||key in detailOptions&&(detailOptions[key as keyof typeof detailOptions] as readonly string[]).includes(v)));
}
export const detailLabels:Record<string,[string,string]>={milkType:['奶的类型','Milk type'],breastMilk:['母乳','Breast milk'],formula:['配方奶','Formula'],diaperType:['尿布情况','Diaper'],wet:['小便','Wet'],dirty:['大便','Dirty'],mixed:['大小便','Mixed'],stoolColor:['便便颜色','Stool color'],stoolTexture:['便便形态','Stool texture'],yellow:['黄色','Yellow'],green:['绿色','Green'],brown:['棕色','Brown'],black:['黑色','Black'],red:['红色','Red'],white:['白色','White'],loose:['稀便','Loose'],soft:['软便','Soft'],formed:['成形','Formed'],hard:['硬便','Hard']};

export function milkBalance(r:{kind:string;value?:number;details?:CareDetails}) {
 if(r.kind!=='bottle'||r.details?.preparedMl===undefined||!validDetails(r.details)||r.value===undefined||Number(r.details.preparedMl)<r.value)return null;
 const prepared=Number(r.details.preparedMl);
 return {prepared,consumed:r.value,leftover:Math.round((prepared-r.value)*100)/100};
}
export function formattedDetails(r:{kind:string;value?:number;details?:CareDetails},language:'zh'|'en') {
 const zh=language==='zh';
 const fields=Object.entries(r.details||{}).filter(([key])=>key!=='preparedMl').map(([key,v])=>key==='urinationCount'?(zh?`小便 ${v} 次`:`Urinations ${v}`):key==='diaperChangeCount'?(zh?`换尿布 ${v} 次`:`Diaper changes ${v}`):detailLabels[v]?.[zh?0:1]||v);
 const balance=milkBalance(r);
 if(balance)fields.push(zh?`冲泡 ${balance.prepared} ml · 剩余 ${balance.leftover} ml`:`Prepared ${balance.prepared} ml · Left ${balance.leftover} ml`);
 return fields.join(' · ');
}

/** Sum only explicit counts; absent counts remain unknown. */
export function eliminationSummary(records:{kind:string;details?:CareDetails}[]) {
 const rows=records.filter(r=>r.kind==='diaper');
 const count=(key:'urinationCount'|'diaperChangeCount')=>{
  const known=rows.filter(r=>r.details?.[key]!==undefined);
  return {total:known.length?known.reduce((n,r)=>n+Number(r.details![key]),0):null,known:known.length,unknown:rows.length-known.length};
 };
 return {urinations:count('urinationCount'),changes:count('diaperChangeCount'),recordCount:rows.length};
}
