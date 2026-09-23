import React from 'react';import {View} from 'react-native';import {CareRecord} from '../domain';import {Choice,Field,Txt,useUI} from '../ui';import {detailOptions,detailLabels} from './details';
export function CareDetailFields({record:r,onChange}:{record:CareRecord;onChange:(r:CareRecord)=>void}){
 const {lang,c}=useUI();const label=(k:string)=>detailLabels[k]?.[lang==='zh'?0:1]||k;
 const keys=r.kind==='bottle'?['milkType']:r.kind==='diaper'?['diaperType',...(r.details?.diaperType==='wet'?[]:['stoolColor','stoolTexture'])]:[];
 const set=(k:string,v:string)=>onChange({...r,details:{...r.details,[k]:v}});
 return <View style={{gap:12,marginBottom:16}}>{keys.map(key=><View key={key} style={{gap:6}}><Txt size={12} color={c.muted}>{label(key)}</Txt><View style={{flexDirection:'row',flexWrap:'wrap',gap:6}}>{detailOptions[key as keyof typeof detailOptions].map(v=><Choice key={v} label={label(v)} selected={r.details?.[key as keyof typeof r.details]===v} onPress={()=>set(key,v)}/>)}</View></View>)}
 {['food','medicine','supplement'].includes(r.kind)&&<><Field label={lang==='zh'?'名称':'Name'} value={r.details?.item||''} onChange={v=>set('item',v)}/><Field label={lang==='zh'?'实际用量（含单位）':'Recorded amount (with unit)'} value={r.details?.quantity||''} onChange={v=>set('quantity',v)}/></>}
 </View>;
}
