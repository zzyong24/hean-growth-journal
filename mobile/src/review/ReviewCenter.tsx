import React,{useState} from 'react';
import {View,Pressable} from 'react-native';
import {recordVersion} from '../domain';
import type {AppData,Attachment,CareRecord} from '../domain';
import {Button,Choice,Field,Txt,Card,useUI} from '../ui';
import {AttachmentView} from '../AttachmentView';
import {localDateTime} from '../Editor';
import type {ReviewEntry} from './queue';

const sourceLabels:Record<string,string>={timeText:'时间',formulaLeft:'配方栏①',formulaRight:'配方栏②',breastLeft:'左侧亲喂栏',breastRight:'右侧亲喂栏',sleepStart:'睡眠起始栏',sleepEnd:'睡眠结束栏',stoolTexture:'便便性状',stoolColor:'便便颜色',stoolAmount:'便便量',urine:'小便栏',other:'其他栏',name:'名称',entries:'记录'};
const readable=(text:string)=>text.replace(/\b(timeText|formulaLeft|formulaRight|breastLeft|breastRight|sleepStart|sleepEnd|stoolTexture|stoolColor|stoolAmount|urine|other|name|entries)=/g,(_,key)=>sourceLabels[key]+'：');
export function ReviewCenter({data,busy,onPreview,onEdit,onAdd,onRetry,onResolve,onApply}:{data:AppData;busy:boolean;onPreview:(a:Attachment)=>void;onEdit:(r:CareRecord,entry:ReviewEntry)=>void;onAdd:(entry:ReviewEntry,proposal?:CareRecord)=>void;onRetry:(entry:ReviewEntry,clarification:string)=>Promise<void>;onResolve:(entry:ReviewEntry)=>void;onApply:(entry:ReviewEntry)=>void}){
 const {c,lang,t}=useUI(),zh=lang==='zh';
 const [resolved,setResolved]=useState(false),[open,setOpen]=useState(''),[clarification,setClarification]=useState(''),[limit,setLimit]=useState(10),[fullSource,setFullSource]=useState('');
 const all=data.reviewQueue||[],pending=all.filter(r=>!r.resolvedAt).length;
 const items=all.filter(r=>!!r.resolvedAt===resolved).sort((a,b)=>Date.parse(b.at)-Date.parse(a.at));
 return <View style={{gap:14,paddingBottom:28}}>
  <Txt color={c.muted}>{zh?'原图不清、缺少数值和未完成的语音都在这里。修改或补录后，再标记已核对。':'Review unclear sources, missing values and failed requests. Mark reviewed after editing or adding records.'}</Txt>
  <View style={{flexDirection:'row',gap:8}}><Choice selected={!resolved} label={zh?`待核对 ${pending}`:`Pending ${pending}`} onPress={()=>{setResolved(false);setLimit(10)}}/><Choice selected={resolved} label={zh?`已核对 ${all.length-pending}`:`Reviewed ${all.length-pending}`} onPress={()=>{setResolved(true);setLimit(10)}}/></View>
  {!items.length&&<Card><Txt>{zh?(resolved?'还没有已核对的内容。':'目前没有待核对内容。'):(resolved?'No reviewed items yet.':'Nothing to review.')}</Txt></Card>}
  {items.slice(0,limit).map(item=>{const expanded=open===item.id;const related=(item.recordIds||[]).map(id=>data.records.find(r=>r.id===id)).filter((r):r is CareRecord=>!!r);const reason=item.reason==='部分时刻或数值不清，请对照原图补充。'?(related.map(r=>r.note).filter(Boolean).join('；')||item.reason):item.reason;const proposed=(item.proposedRecords||[]).filter(r=>!data.records.some(x=>x.id===r.id&&recordVersion(x)===recordVersion(r)));return <Card key={item.id}>
   <View style={{gap:12}}>
    <Pressable accessibilityRole="button" onPress={()=>{setOpen(expanded?'':item.id);setClarification('')}}><Txt weight="600">{item.title}</Txt><Txt size={13} color={c.muted}>{item.origin==='notebook'?localDateTime(item.at).slice(0,10):localDateTime(item.at)} · {expanded?(zh?'收起':'Collapse'):(zh?'展开核对':'Review')}</Txt><Txt numberOfLines={expanded?undefined:2}>{readable(reason)}</Txt></Pressable>
    {expanded&&<>
     {!!item.attachments?.length&&<View style={{flexDirection:'row',gap:10,flexWrap:'wrap'}}>{item.attachments.map(a=><AttachmentView key={a.id} attachment={a} onOpen={onPreview}/>)}</View>}
     <Txt size={13} color={c.muted}>{zh?'原始内容':'Original source'}</Txt><Txt selectable numberOfLines={fullSource===item.id?undefined:6}>{readable(item.sourceText)|| (zh?'请查看附件。':'See attachment.')}</Txt>{item.sourceText.length>180&&<Button small secondary label={fullSource===item.id?(zh?'收起原文':'Collapse source'):(zh?'展开全部原文':'Read full source')} onPress={()=>setFullSource(fullSource===item.id?'':item.id)}/>}
     {related.map(r=><Button key={r.id} secondary small disabled={busy} label={`${t[r.kind]} · ${r.timePrecision==='day'?localDateTime(r.at).slice(0,10):localDateTime(r.at)}${r.value!==undefined?' · '+r.value+' '+(r.unit||''):''} · ${zh?'修改':'Edit'}`} onPress={()=>onEdit(r,item)}/>)}
     {proposed.map(r=><Button key={r.id} secondary small disabled={busy} label={`${zh?'核对未保存的':'Review unsaved'} ${t[r.kind]}${r.value!==undefined?' '+r.value+' '+(r.unit||''):''}`} onPress={()=>onAdd(item,r)}/>)}
     {!item.resolvedAt?<>
      {(item.sleepStart||item.nursingStart)&&<><Txt>{item.sleepStart?`${zh?'待确认：开始睡眠':'Sleep start'} ${localDateTime(item.sleepStart)}`:''}{item.nursingStart?` ${zh?'待确认：开始亲喂':'Nursing start'} ${localDateTime(item.nursingStart.at)}`:''}</Txt><Button disabled={busy} label={zh?'确认开始记录':'Confirm session start'} onPress={()=>onApply(item)}/></>}
      {item.bottleAction&&<><Txt>{zh?'待确认喂奶操作：':'Bottle action: '}{item.bottleAction.type==='start'?`${zh?'开始，准备':'Start, prepared'} ${item.bottleAction.session.preparedMl} ml`:item.bottleAction.type==='finish'?`${zh?'结束，实际喝下':'Finish, consumed'} ${item.bottleAction.record.value} ml`:item.bottleAction.type==='undo'?(zh?'撤销完成，恢复进行中':'Undo and resume'):(zh?'取消这顿奶':'Cancel feed')}</Txt><Button disabled={busy} label={zh?'确认这项喂奶操作':'Confirm bottle action'} onPress={()=>onApply(item)}/></>}
      <Button secondary disabled={busy} label={zh?'手动补录一条':'Add a missing record'} onPress={()=>onAdd(item)}/>
      <Field multiline label={zh?'补充说明（可选）':'Clarification (optional)'} value={clarification} onChange={setClarification} placeholder={zh?'例如：这一行是 15:00，实际喝了 80 ml':'For example: this row is 15:00, consumed 80 ml'}/>
      <Button secondary disabled={busy} label={busy?(zh?'正在处理…':'Processing…'):(zh?'重新识别，生成待确认结果':'Retry and review results')} onPress={()=>onRetry(item,clarification)}/>
      <Button disabled={busy} label={zh?'已核对完成':'Mark reviewed'} onPress={()=>onResolve(item)}/>
     </>:<Txt color={c.primary}>{item.resolution} · {item.resolvedAt&&localDateTime(item.resolvedAt)}</Txt>}
    </>}
   </View>
  </Card>})}
  {items.length>limit&&<Button secondary label={zh?'查看更多':'Load more'} onPress={()=>setLimit(n=>n+10)}/>}
 </View>;
}
