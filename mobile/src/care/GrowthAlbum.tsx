import React,{useState} from 'react';import {View} from 'react-native';import {AppData,Attachment} from '../domain';import {albumGroups} from './album';import {AttachmentView} from '../AttachmentView';import {Heading,Txt,Choice,Button,useUI} from '../ui';
export function GrowthAlbum({data,onPreview}:{data:AppData;onPreview:(a:Attachment)=>void}){
 const {lang,c}=useUI();const [filter,setFilter]=useState<'all'|'image'|'video'>('all');const [limit,setLimit]=useState(3);const groups=albumGroups(data.records,data.profile.birthday,filter);
 return <View style={{gap:14,marginTop:24}}><Heading size={22}>{lang==='zh'?'成长相册':'Growing memories'}</Heading><View style={{flexDirection:'row',gap:8}}>{(['all','image','video'] as const).map((k,i)=><Choice key={k} label={(lang==='zh'?['全部','照片','视频']:['All','Photos','Videos'])[i]} selected={filter===k} onPress={()=>setFilter(k)}/>)}</View>
 {!groups.length&&<Txt color={c.muted}>{lang==='zh'?'记录里的照片和视频，会按拍摄月份整理在这里。':'Photos and videos in records appear here by capture month.'}</Txt>}
 {groups.slice(0,limit).map(g=><View key={g.month} style={{gap:10}}><Txt>{g.month} · {g.ageMonths} {lang==='zh'?'月龄起':'months+'} · {g.items.length}</Txt><View style={{flexDirection:'row',flexWrap:'wrap',gap:10}}>{g.items.map(({attachment})=><AttachmentView key={attachment.id} attachment={attachment} compact onOpen={onPreview}/>)}</View></View>)}
 {groups.length>limit&&<Button secondary label={lang==='zh'?'更早的月份':'Earlier months'} onPress={()=>setLimit(n=>n+3)}/>}</View>;
}
