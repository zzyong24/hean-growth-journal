import React,{useEffect,useRef,useState} from 'react';
import {View,TextInput,Platform} from 'react-native';
import {Sheet,Txt,Button,Field,useUI} from '../ui';
import {defaults,loadProviders,saveProviders,type ProviderConfig} from './config';
import {testChat} from './client';
const dudu='https://dudu.mom/v1',qwen='https://dashscope.aliyuncs.com/compatible-mode/v1';
export function ProviderSettings({onClose,onSaved}:{onClose:()=>void;onSaved:()=>void}){
 const {c}=useUI();const [value,setValue]=useState<ProviderConfig>(defaults),[ready,setReady]=useState(false),[busy,setBusy]=useState(false),[notice,setNotice]=useState(''),[advanced,setAdvanced]=useState(false);const request=useRef<AbortController|null>(null);
 useEffect(()=>{loadProviders().then(x=>{setValue({...x,chat:{baseURL:dudu,protocol:'openai',model:x.chat.baseURL===dudu&&x.chat.model?x.chat.model:'gpt-5.6-sol',apiKey:x.chat.baseURL===dudu?x.chat.apiKey:''},image:{baseURL:dudu,protocol:'images',model:x.image.baseURL===dudu&&x.image.model?x.image.model:'gpt-image-2',apiKey:x.image.baseURL===dudu&&x.image.apiKey!==x.chat.apiKey?x.image.apiKey:''},asr:{baseURL:qwen,protocol:'qwen-audio',model:'qwen3-asr-flash',apiKey:x.asr.baseURL===qwen?x.asr.apiKey:''}});setReady(true)}).catch(()=>setNotice('配置读取失败，请重新打开'));return()=>request.current?.abort()},[]);
 async function save(test:boolean){if(busy)return;setBusy(true);setNotice('');const ac=new AbortController();request.current=ac;const snapshot={...value,image:{...value.image,apiKey:value.image.apiKey||value.chat.apiKey}};try{if(test)await testChat(snapshot,ac.signal);if(ac.signal.aborted)return;await saveProviders(snapshot);onSaved();setNotice(test?'已保存，Dudu 对话连接正常':'已保存');}catch(e){if(!ac.signal.aborted)setNotice(e instanceof Error&&e.message.includes('401')?'密钥验证失败，请检查 Dudu 密钥':e instanceof Error&&e.message.includes('429')?'服务限流，请稍后再试':'未能完成，请检查密钥余额与模型权限。配置未覆盖。')}finally{if(request.current===ac)setBusy(false)}}
 const secret=(label:string,key:'chat'|'asr'|'image')=><View style={{gap:8}}><Txt size={14}>{label}</Txt><TextInput accessibilityLabel={label} placeholder="粘贴 API Key" placeholderTextColor={c.muted} secureTextEntry autoCapitalize="none" autoCorrect={false} editable={!busy} value={value[key].apiKey} onChangeText={apiKey=>setValue(v=>({...v,[key]:{...v[key],apiKey}}))} style={{padding:16,borderRadius:14,backgroundColor:c.surface,color:c.ink,borderWidth:1,borderColor:c.line}}/></View>;
 return <Sheet visible title="AI 配置" onClose={()=>{request.current?.abort();onClose()}}><View style={{gap:18}}>
 <Txt size={14}>填入两把密钥，就能开始使用。地址和模型已帮你配好。</Txt>
 <View style={{flexDirection:'row',gap:10}}>{(['cloud','direct'] as const).map(mode=><Button key={mode} secondary={value.mode!==mode} disabled={busy||!ready} label={mode==='cloud'?'默认服务':'使用自己的密钥'} onPress={()=>setValue(v=>({...v,mode}))}/>)}</View>
 {value.mode==='direct'&&<>
 {secret('Dudu 密钥 · 对话和生图','chat')}
 <Txt size={12} color={c.muted}>在 Dudu 控制台创建可调用对话和图片模型的令牌。</Txt>
 {secret('千问密钥 · 语音识别','asr')}
 <Txt size={12} color={c.muted}>使用阿里云百炼北京地域的 API Key。未填写时仍可使用文字记录。</Txt>
 <Button secondary disabled={busy} label={advanced?'收起高级设置':'高级设置（通常不用改）'} onPress={()=>setAdvanced(!advanced)}/>
 {advanced&&<View style={{gap:12}}>
 <Field label="Dudu 对话模型" value={value.chat.model} onChange={model=>setValue(v=>({...v,chat:{...v.chat,model}}))}/>
 <Field label="Dudu 图片模型" value={value.image.model} onChange={model=>setValue(v=>({...v,image:{...v.image,model}}))}/>
 {secret('单独的生图密钥（留空复用 Dudu 密钥）','image')}
 <Field label="单次超时秒数（30–600）" value={String(value.timeoutSeconds)} onChange={v=>setValue(x=>({...x,timeoutSeconds:Number(v)}))}/>
 <Field label="失败后重试次数（0–5）" value={String(value.retries)} onChange={v=>setValue(x=>({...x,retries:Number(v)}))}/>
 </View>}
 <Txt size={12} color={c.muted}>直接连接服务商，费用由自己的账号承担。直连在 App 内使用，Siri 后台记录会暂停。</Txt>
 </>}
 <Txt size={12} color={c.muted}>{Platform.OS==='web'?'网页预览仅在本次打开期间保留密钥；实际使用请在手机配置。':'密钥只存本机钥匙串，不随数据导出。'}</Txt>
 {!!notice&&<Txt size={13}>{notice}</Txt>}
 <Button disabled={!ready||busy} label={busy?'处理中…':'保存'} onPress={()=>save(false)}/>
 {value.mode==='direct'&&<Button secondary disabled={!ready||busy||!value.chat.apiKey.trim()} label="测试 Dudu 并保存" onPress={()=>save(true)}/>}
 {busy&&<Button secondary label="取消" onPress={()=>{request.current?.abort();request.current=null;setBusy(false);setNotice('已取消')}}/>}
 </View></Sheet>
}
