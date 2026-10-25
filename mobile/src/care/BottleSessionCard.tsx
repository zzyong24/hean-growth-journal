import React,{useState} from 'react';
import {View} from 'react-native';
import type {AppData} from '../domain';
import {Button,Choice,Field,Sheet,Txt,useUI} from '../ui';
import {localDateTime} from '../Editor';
import {applyBottleAction,canUndoBottle,normalizeBottleAction} from './bottleFlow';

export function BottleSessionCard({data,onUpdate,compact=false,disabled=false}:{data:AppData;onUpdate:(fn:(d:AppData)=>AppData)=>Promise<boolean>;compact?:boolean;disabled?:boolean}){
 const {lang,c}=useUI();const zh=lang==='zh';
 const [open,setOpen]=useState(false),[amount,setAmount]=useState(''),[time,setTime]=useState(''),[mode,setMode]=useState<'leftover'|'consumed'>('leftover'),[milk,setMilk]=useState<'formula'|'breastMilk'>('formula'),[busy,setBusy]=useState(false),[error,setError]=useState(''),[cancel,setCancel]=useState(false);
 const session=data.bottleSession;
 const value=amount.trim()?Number(amount):NaN;
 const valid=Number.isFinite(value)&&value>=0&&(session?value<=session.preparedMl:value>0);
 const consumed=session&&valid?(mode==='leftover'?session.preparedMl-value:value):undefined;
 function show(){setAmount('');setTime(localDateTime(new Date().toISOString()));setError('');setCancel(false);setOpen(true);}
 async function act(raw:any){
  if(busy||disabled)return;setBusy(true);setError('');
  try{if(await onUpdate(d=>applyBottleAction(d,normalizeBottleAction(raw,d,zh?'在禾安中操作':'Recorded in Hean',new Date().toISOString()))))setOpen(false);else setError(zh?'未保存，请核对当前状态后重试。':'Not saved. Check the current state and retry.');}
  finally{setBusy(false);}
 }
 function save(){
  if(!valid)return;
  if(session){void act({type:'finish',sessionId:session.id,[mode==='leftover'?'leftoverMl':'consumedMl']:value});return;}
  const date=new Date(time.replace(' ','T'));
  if(!Number.isFinite(date.getTime())||localDateTime(date.toISOString())!==time){setError(zh?'请填写有效的开始时间。':'Enter a valid start time.');return;}
  void act({type:'start',at:date.toISOString(),preparedMl:value,milkType:milk});
 }
 const title=session?(zh?`喂奶进行中 · 冲泡 ${session.preparedMl} ml`:`Feeding · prepared ${session.preparedMl} ml`):(zh?'连续记录一顿奶':'Track a bottle feed');
 return <View style={{gap:8,marginBottom:compact?6:18,flex:compact?1:undefined}}>
  {!compact&&<Txt size={13} color={c.muted}>{session?(zh?'结束时补充剩余量或实际喝下的量。':'Finish with the remaining or consumed amount.'):(zh?'先记冲泡量，喝完再补实际量。':'Record preparation now and intake when finished.')}</Txt>}
  <Button small={compact} secondary={!session} label={title} disabled={disabled||busy} onPress={show}/>
  {!compact&&canUndoBottle(data)&&<Button small secondary disabled={disabled||busy} label={zh?`撤销上一顿 ${data.lastBottleFeed!.record.value} ml，恢复进行中`:'Undo last feed and resume'} onPress={()=>act({type:'undo',recordId:data.lastBottleFeed!.record.id})}/>}
  <Sheet visible={open} title={title} onClose={()=>{if(!busy)setOpen(false)}}>
   <View style={{gap:12}}>
    {session?<>
     <Txt color={c.muted}>{localDateTime(session.at)} · {zh?'尚未计入实际奶量':'Not yet counted as intake'}</Txt>
     <View style={{flexDirection:'row',gap:10}}>{(['leftover','consumed'] as const).map(m=><Choice key={m} selected={mode===m} label={m==='leftover'?(zh?'剩余量':'Remaining'):(zh?'实际喝下':'Consumed')} onPress={()=>{setMode(m);setAmount('')}}/>)}</View>
     <Field number label={mode==='leftover'?(zh?'剩余多少 ml':'Remaining ml'):(zh?'实际喝下多少 ml':'Consumed ml')} value={amount} onChange={setAmount}/>
     {consumed!==undefined&&<Txt weight="600">{zh?`实际喝下 ${consumed} ml · 剩余 ${session.preparedMl-consumed} ml`:`Consumed ${consumed} ml · remaining ${session.preparedMl-consumed} ml`}</Txt>}
    </>:<>
     <Field number label={zh?'冲泡 / 准备奶量 ml':'Prepared milk ml'} value={amount} onChange={setAmount}/>
     <Field dateMode="datetime" label={zh?'开始时间':'Start time'} value={time} onChange={setTime}/>
     <View style={{flexDirection:'row',gap:10}}><Choice selected={milk==='formula'} label={zh?'配方奶':'Formula'} onPress={()=>setMilk('formula')}/><Choice selected={milk==='breastMilk'} label={zh?'母乳瓶喂':'Breast milk'} onPress={()=>setMilk('breastMilk')}/></View>
     <Txt color={c.muted}>{zh?'保存后可以退出 APP，进度会保留。':'Progress is saved even when you leave the app.'}</Txt>
    </>}
    {!!error&&<Txt color={c.primary}>{error}</Txt>}
    <Button disabled={!valid||busy||disabled} label={session?(zh?'结束并保存实际奶量':'Finish and save intake'):(zh?'开始这顿奶':'Start this feed')} onPress={save}/>
    {session&&(cancel?<><Txt>{zh?'取消后不计入奶量，原始进度保留在操作历史中。':'Cancel without counting intake. The original progress remains in history.'}</Txt><Button danger disabled={busy||disabled} label={zh?'确认取消这顿奶':'Confirm cancellation'} onPress={()=>act({type:'cancel',sessionId:session.id})}/></>:<Button secondary disabled={busy} label={zh?'取消这顿奶':'Cancel this feed'} onPress={()=>setCancel(true)}/>)}
   </View>
  </Sheet>
 </View>;
}
