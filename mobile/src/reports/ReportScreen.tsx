import React,{useRef,useState,useEffect} from 'react';
import {View,Platform} from 'react-native';
import {SvgXml} from 'react-native-svg';
import {AppData} from '../domain';
import {Button,Choice,Txt,useUI} from '../ui';
import {DateControl} from '../controls';
import {localDate,Period,reportRange} from './model';
import {generateReport} from './generate';
import {exportReport} from './export';
import {readPoster,writePoster} from './history';
import {reportKey,SavedPoster} from './historyKey';
const memory=new Map<string,SavedPoster>();
export function ReportScreen({data}:{data:AppData}){
 const {lang,c}=useUI(),zh=lang==='zh';
 const [period,setPeriod]=useState<Period>('day'),[date,setDate]=useState(localDate(new Date()));
 const key=reportKey(data.babyId,period,date);
 const activeKey=useRef(key);activeKey.current=key;
 const [entry,setEntry]=useState<{key:string;value:SavedPoster}|null>(null),[loading,setLoading]=useState(true);
 const card=entry?.key===key?entry.value:null;
 const [stage,setStage]=useState(''),[message,setMessage]=useState(''),[saved,setSaved]=useState(false),[exporting,setExporting]=useState(false);
 const variation=useRef(0);const ref=useRef<any>(null),task=useRef<AbortController|null>(null),saveLock=useRef(false);
 useEffect(()=>{let live=true;task.current?.abort();task.current=null;setMessage('');setLoading(true);
 const cached=memory.get(key);setEntry(cached?{key,value:cached}:null);setSaved(cached?.saved||false);
 readPoster(key).then(value=>{if(live&&value){memory.set(key,value);setEntry({key,value});setSaved(value.saved)}}).catch(()=>{}).finally(()=>{if(live){setLoading(false);void generate()}});
 return ()=>{live=false;task.current?.abort();task.current=null};},[key,data.records,data.profile.name,lang]);
 function change(p:Period,d:string){task.current?.abort();task.current=null;setStage('');setPeriod(p);setDate(d);setMessage('')}
 async function generate(){if(task.current)return;try{reportRange(period,date)}catch{setMessage(zh?'请选择有效日期':'Choose a valid date');return}
 const controller=new AbortController();task.current=controller;setStage('media');setMessage('');
 try{const result=await generateReport(data,period,date,controller.signal,s=>{if(task.current===controller)setStage(s)},0);if(task.current===controller){const value={...result,variation:0,saved:memory.get(key)?.xml===result.xml&&!!memory.get(key)?.saved};memory.set(key,value);setEntry({key,value});setSaved(value.saved);try{await writePoster(key,value)}catch{if(task.current===controller)setMessage(zh?'海报已生成，但本机保存失败，请先下载。':'Poster created, but local storage failed. Please download it.')}}}catch(e:any){if(!controller.signal.aborted)setMessage(e?.message==='IMAGE_PROVIDER_503'?(zh?'图像服务暂忙，请稍后重试。':'Image service is busy. Try again later.'):(zh?'这次生成未完成，请重试。原记录和照片都还在。':'Generation did not finish. Your records and photos are unchanged.'))}finally{if(task.current===controller){task.current=null;setStage('')}}}
 async function output(action:'save'|'share'){if(!card||saveLock.current)return;saveLock.current=true;setExporting(true);try{await exportReport(card.xml,card.height,ref.current,action,`hean-growth-${period}-${date}`);if(action==='save'){if(activeKey.current===key)setSaved(true);const value={...card,saved:true};memory.set(key,value);await writePoster(key,value)}}catch(e:any){if(e?.name!=='AbortError')setMessage(zh?'未完成，请检查相册权限或重试。':'Could not complete. Check permission or retry.')}finally{saveLock.current=false;setExporting(false)}}
 return <View style={{gap:18,paddingTop:16}}><Txt color={c.muted}>{zh?'把这段日常，留成一张值得珍藏的海报。':'Turn little days into a keepsake.'}</Txt>
 <View style={{flexDirection:'row',gap:8}}>{(['day','week','month'] as Period[]).map((p,i)=><Choice key={p} label={(zh?['日报','周报','月报']:['Day','Week','Month'])[i]} selected={period===p} onPress={()=>change(p,date)}/>)}</View>
 <DateControl value={date} onChange={d=>change(period,d)} label={zh?'报告日期':'Report date'} maxDate={localDate(new Date())}/>
 {!card&&(loading||!!stage)&&<Txt color={c.muted}>{zh?'正在整理海报…':'Preparing poster…'}</Txt>}
 {!card&&!loading&&!stage&&!!message&&<Button secondary label={zh?'重试':'Retry'} onPress={generate}/>}
 {!!message&&<Txt color={c.muted}>{message}</Txt>}
 {card&&<><View style={{width:'100%',aspectRatio:720/card.height,borderRadius:18,overflow:'hidden'}}><SvgXml xml={card.xml} width="100%" height="100%" override={{ref,width:'100%',height:'100%'}}/></View><View style={{flexDirection:'row',gap:10}}><Button secondary style={{flex:1}} disabled={exporting||!!stage||saved} label={saved?(zh?'已保存':'Saved'):Platform.OS==='web'?(zh?'下载图片':'Download'):(zh?'保存相册':'Save photo')} onPress={()=>output('save')}/><Button style={{flex:1}} disabled={exporting||!!stage} label={zh?'分享海报':'Share'} onPress={()=>output('share')}/></View></>}
 </View>;
}
