export const detailOptions = {
 milkType: ['breastMilk','formula'],
 diaperType: ['wet','dirty','mixed'],
 stoolColor: ['yellow','green','brown','black','red','white'],
 stoolTexture: ['loose','soft','formed','hard'],
} as const;
export type CareDetails={milkType?:string;diaperType?:string;stoolColor?:string;stoolTexture?:string;item?:string;quantity?:string};
export function validDetails(d:unknown):boolean {
 if(d===undefined)return true;
 if(!d||typeof d!=='object'||Array.isArray(d))return false;
 return Object.entries(d).every(([key,v])=>typeof v==='string'&&v.length<=200&&(key==='item'||key==='quantity'||key in detailOptions&&(detailOptions[key as keyof typeof detailOptions] as readonly string[]).includes(v)));
}
export const detailLabels:Record<string,[string,string]>={milkType:['奶的类型','Milk type'],breastMilk:['母乳','Breast milk'],formula:['配方奶','Formula'],diaperType:['尿布情况','Diaper'],wet:['小便','Wet'],dirty:['大便','Dirty'],mixed:['大小便','Mixed'],stoolColor:['便便颜色','Stool color'],stoolTexture:['便便形态','Stool texture'],yellow:['黄色','Yellow'],green:['绿色','Green'],brown:['棕色','Brown'],black:['黑色','Black'],red:['红色','Red'],white:['白色','White'],loose:['稀便','Loose'],soft:['软便','Soft'],formed:['成形','Formed'],hard:['硬便','Hard']};
