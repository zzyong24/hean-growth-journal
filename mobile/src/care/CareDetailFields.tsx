import React from 'react';import {View} from 'react-native';import {CareRecord} from '../domain';import {Choice,Field,Txt,useUI} from '../ui';import {detailOptions,detailLabels,milkBalance} from './details';
export function CareDetailFields({record:r,onChange}:{record:CareRecord;onChange:(r:CareRecord)=>void}){
 const {lang,c}=useUI();const label=(k:string)=>detailLabels[k]?.[lang==='zh'?0:1]||k;
 const keys=r.kind==='bottle'?['milkType']:r.kind==='diaper'?['diaperType',...(r.details?.diaperType==='wet'?[]:['stoolColor','stoolTexture'])]:[];
 const balance=milkBalance(r);
 const set=(k:string,v:string)=>onChange({...r,details:{...r.details,[k]:v}});
 return <View style={{gap:12,marginBottom:16}}>{keys.map(key=><View key={key} style={{gap:6}}><Txt size={12} color={c.muted}>{label(key)}</Txt><View style={{flexDirection:'row',flexWrap:'wrap',gap:6}}>{detailOptions[key as keyof typeof detailOptions].map(v=><Choice key={v} label={label(v)} selected={r.details?.[key as keyof typeof r.details]===v} onPress={()=>set(key,v)}/>)}</View></View>)}
 {r.kind==='bottle'&&<><Field label={lang==='zh'?'冲泡量 ml（选填）':'Prepared ml (optional)'} value={r.details?.preparedMl||''} onChange={v=>{const details={...r.details};if(v.trim())details.preparedMl=v;else delete details.preparedMl;onChange({...r,details});}}/>
 <Txt size={12} color={c.muted}>{balance?(lang==='zh'?`实际喝下 ${balance.consumed} ml，剩余 ${balance.leftover} ml`:`Consumed ${balance.consumed} ml, left ${balance.leftover} ml`):(lang==='zh'?'仅记录实际喝下量时，不计算剩余量。冲泡量不能小于实际喝下量。':'Leftover requires a prepared amount at least as large as intake.')}</Txt></>}
 {r.kind==='diaper'&&<>{(['urinationCount','diaperChangeCount'] as const).map(key=><Field key={key} label={lang==='zh'?(key==='urinationCount'?'小便次数（选填）':'换尿布次数（选填）'):(key==='urinationCount'?'Urination count (optional)':'Diaper changes (optional)')} value={r.details?.[key]||''} onChange={v=>{const details={...r.details};if(v.trim())details[key]=v;else delete details[key];onChange({...r,details});}}/>)}<Txt size={12} color={c.muted}>{lang==='zh'?'小便和换尿布分别统计；未记录的次数留空，不当成零次。':'Urinations and changes are separate; leave unknown counts blank.'}</Txt></>}
 {['food','medicine','supplement'].includes(r.kind)&&<><Field label={lang==='zh'?'名称':'Name'} value={r.details?.item||''} onChange={v=>set('item',v)}/><Field label={lang==='zh'?'实际用量（含单位）':'Recorded amount (with unit)'} value={r.details?.quantity||''} onChange={v=>set('quantity',v)}/></>}
 </View>;
}
