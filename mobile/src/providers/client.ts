import {Platform} from 'react-native';
import {File,Paths} from 'expo-file-system';
import {chatPayload,endpoint,readChat} from './protocol';
import {loadProviders,validateConfig,type ProviderConfig,type Channel} from './config';
import {ProviderError,retryProvider} from './retry';
import {recordingPrompt} from '../aiCore/recordingPrompt.mjs';
import {retrieveKnowledge,knowledgePolicy} from '../aiCore/knowledge.mjs';
import {withTimeContext} from '../aiCore/timeContext.mjs';
import {compactContext} from '../aiCore/compactContext.mjs';
import {normalizeDrafts} from '../aiCore/normalize.mjs';
import {CareRecord} from '../domain';
function headers(c:Channel,json=true){return {...(json?{'Content-Type':'application/json'}:{}),...(c.apiKey?(c.protocol==='anthropic'?{'x-api-key':c.apiKey,'anthropic-version':'2023-06-01'}:{Authorization:'Bearer '+c.apiKey}):{}),...(c.protocol==='anthropic'?{'anthropic-version':'2023-06-01'}:{})};}
async function jsonRequest(c:Channel,path:string,body:unknown,signal:AbortSignal){if(!c.baseURL||!c.model)throw Error('MODEL_NOT_CONFIGURED');const r=await fetch(endpoint(c.baseURL,path),{method:'POST',headers:headers(c,!(body instanceof FormData)),body:body instanceof FormData?body:JSON.stringify(body),signal});if(!r.ok){throw new ProviderError(r.status);}return r.json();}
export async function testChat(config:ProviderConfig,signal?:AbortSignal){validateConfig(config);return retryProvider(async s=>readChat(config.chat.protocol,await jsonRequest(config.chat,config.chat.protocol==='anthropic'?'messages':config.chat.protocol==='responses'?'responses':'chat/completions',chatPayload(config.chat.protocol,config.chat.model,'Reply briefly.','Reply OK.'),s)),{...config,retries:0},signal);}
export async function directInterpret(body:any,config:ProviderConfig,signal?:AbortSignal){
 validateConfig(config);
 const knowledge=retrieveKnowledge(body.text,body.profile,body.now);
 const payload=compactContext(withTimeContext({...body,babyContext:{...body.babyContext,parentingKnowledge:knowledge},images:body.images?.map((x:any)=>({capturedAt:x.capturedAt}))}));
 const request=chatPayload(config.chat.protocol,config.chat.model,recordingPrompt+'\n'+knowledgePolicy,JSON.stringify(payload),body.images?.map((x:any)=>x.data));
 return retryProvider(async s=>{
  const raw=readChat(config.chat.protocol,await jsonRequest(config.chat,config.chat.protocol==='anthropic'?'messages':config.chat.protocol==='responses'?'responses':'chat/completions',request,s));
  let parsed;try{parsed=JSON.parse(raw.trim().replace(/^```(?:json)?\s*/,'').replace(/\s*```$/,''));}catch{throw Error('INVALID_MODEL_RESPONSE');}
  const result=normalizeDrafts(parsed,body.text,body.pending as CareRecord[],body.records as CareRecord[]);
  return {...result,sources:knowledge.filter(k=>Array.isArray(parsed.sources)&&parsed.sources.includes(k.id)).map(({id,title,url})=>({id,title,url}))};
 },config,signal);
}
async function appendData(form:FormData,name:string,data:string,filename:string,files:File[]){
 const m=data.match(/^data:([^;]+);base64,(.+)$/s);if(!m)throw Error('INVALID_MEDIA');
 if(Platform.OS==='web')form.append(name,await (await fetch(data)).blob(),filename);
 else{const f=new File(Paths.cache,'upload-'+Date.now()+'-'+Math.random().toString(36).slice(2)+'-'+filename);f.write(m[2],{encoding:'base64'});files.push(f);form.append(name,{uri:f.uri,type:m[1],name:filename} as any);}
}
export async function directTranscribe(media:{data:string;mime:string},config:ProviderConfig,signal?:AbortSignal){
 validateConfig(config);
 return retryProvider(async s=>{
  const files:File[]=[];try{
   if(config.asr.protocol==='qwen-audio'){const x=await jsonRequest(config.asr,'chat/completions',{model:config.asr.model,messages:[{role:'user',content:[{type:'input_audio',input_audio:{data:media.data}}]}],stream:false,asr_options:{enable_itn:true}},s);return readChat('openai',x);}
   const form=new FormData();form.append('model',config.asr.model);form.append('response_format','json');await appendData(form,'file',media.data,'recording.'+(media.mime.includes('webm')?'webm':media.mime.includes('wav')?'wav':media.mime.includes('mpeg')?'mp3':'m4a'),files);
   const x=await jsonRequest(config.asr,'audio/transcriptions',form,s);if(typeof x.text!=='string')throw Error('INVALID_MODEL_RESPONSE');return x.text;
  }finally{for(const f of files)if(f.exists)f.delete();}
 },config,signal);
}
export async function directImage(prompt:string,images:string[]=[],signal?:AbortSignal){
 const config=await loadProviders();if(config.mode!=='direct')throw Error('DIRECT_MODE_REQUIRED');
 return retryProvider(async s=>{const files:File[]=[];try{
  let body:unknown={model:config.image.model,prompt,n:1,size:'1024x1536'};
  if(images.length){const form=new FormData();form.append('model',config.image.model);form.append('prompt',prompt);form.append('n','1');form.append('size','1024x1536');for(let i=0;i<images.length;i++)await appendData(form,'image[]',images[i],'input-'+i+(images[i].startsWith('data:image/jpeg')?'.jpg':images[i].startsWith('data:image/webp')?'.webp':'.png'),files);body=form;}
  const x=await jsonRequest(config.image,images.length?'images/edits':'images/generations',body,s);const item=x.data?.[0];
  if(typeof item?.b64_json==='string'&&/^[A-Za-z0-9+/=]+$/.test(item.b64_json))return {image:'data:image/png;base64,'+item.b64_json};
  if(typeof item?.url==='string'&&item.url.startsWith('https://')){const r=await fetch(item.url,{signal:s});if(!r.ok)throw new ProviderError(r.status);const blob=await r.blob();return {image:await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(Error('INVALID_IMAGE'));reader.readAsDataURL(blob);})};}
  throw Error('INVALID_MODEL_RESPONSE');
 }finally{for(const f of files)if(f.exists)f.delete();}},config,signal);
}
