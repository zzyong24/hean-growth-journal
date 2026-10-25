import {validBottleAction,type BottleAction} from './care/bottleFlow';
import {Platform} from "react-native";
import {loadProviders} from './providers/config';
import {directInterpret,directTranscribe} from './providers/client';
import {withTransientRetry} from "./transientRetry";
import {requestDeadline} from './requestDeadline';
import {checkCancelled} from './cancellation';
import { fetch as streamFetch } from "expo/fetch";
import { babyContext, deviceClock, relevantRecords } from "./babyContext";
import { AppData, CareRecord, validateRecord } from "./domain";
import {API_URL} from "./serviceConfig";
export {API_URL} from "./serviceConfig";
import {serviceHeaders} from "./serviceAuth";
export type Media = {
  livePhoto?: import("./domain").Attachment;
  attachment?: import("./domain").Attachment;
  messageId?: string;
  capturedAt?: string;
  uri: string;
  type: "image" | "audio" | "video";
  mime: string;
  data: string;
};
export type Capabilities = { text: boolean; asr: boolean; omni: boolean };
async function request(path: string, body?: unknown, signal?: AbortSignal) {
  const timeoutMs=path==="/api/status"?5000:path==="/api/interpret"?105000:60000;
  const response = await fetch(`${API_URL}${path}`, {
    method: body ? "POST" : "GET",
    headers: await serviceHeaders(),
    body: body ? JSON.stringify(body) : undefined,
    signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(timeoutMs)]) : AbortSignal.timeout(timeoutMs),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "SERVICE_ERROR");
  return result;
}
export async function getStatus(): Promise<Capabilities> {
  const config=await loadProviders();if(config.mode==='direct')return {text:!!config.chat.baseURL,asr:!!config.asr.baseURL,omni:false};
  return request("/api/status");
}
function context(data: AppData, text: string,requestAt?:string) {
  const now = requestAt?new Date(requestAt):new Date();
  return {
    text,
    ...deviceClock(now,data.settings.region==='CN'?'Asia/Shanghai':undefined),
    babyContext: babyContext(data, now, text),
    language: data.settings.language,
    profile: data.profile,
    records: relevantRecords(data,text),
  };
}
export async function interpret(
  data: AppData,
  text: string,
  history: { role: "user" | "assistant"; text: string; at?: string; acceptedRecords?: CareRecord[]; nursingStarted?: AppData["nursingSession"] }[] = [],
  pending: CareRecord[] = [],
  signal?: AbortSignal,
  onReply?: (text: string) => void,
  images: {data:string;capturedAt?:string}[] = [],
  mediaMetadata: {type:string;capturedAt?:string}[] = [],
  requestAt?:string,
  recordsOverride?:CareRecord[],
): Promise<{ bottleAction?:BottleAction;reviewReasons?:string[]; sleepStart?:string; nursingStart?:AppData["nursingSession"]; drafts: CareRecord[]; reply: string; sources?: {id:string;title:string;url:string}[] }> {

  const retrievalQuery=[text,...history.filter(m=>m.role==="user").slice(-3).map(m=>m.text)].join(' ');
  const body = {...context(data,retrievalQuery,requestAt),...(recordsOverride?{records:recordsOverride}:{}),text,history:history.slice(-12).map(({role,text,at,acceptedRecords,nursingStarted})=>({role,text,at,acceptedRecords,nursingStarted})),pending,images,mediaMetadata};
  const config=await loadProviders();if(config.mode==='direct')return directInterpret(body,config,signal);
  return requestDeadline(requestSignal=>withTransientRetry(async()=>{
  let result:any;
  if(onReply && Platform.OS === "web"){
    const response=await streamFetch(`${API_URL}/api/interpret-stream`,{method:"POST",headers:await serviceHeaders(),body:JSON.stringify(body),signal:requestSignal});
    if(!response.ok){const failure=await response.json().catch(()=>({}));throw new Error(failure.error||"SERVICE_ERROR");}
    if(!response.body)throw new Error("SERVICE_ERROR");
    const reader=response.body.getReader(),decoder=new TextDecoder();let buffer="";
    const consume=(line:string)=>{checkCancelled(requestSignal);if(!line.trim())return;const item=JSON.parse(line);if(item.error)throw new Error(item.error);if(typeof item.reply==="string")onReply(item.reply);if(item.result)result=item.result;};
    try{while(true){const {value,done}=await reader.read();if(done)break;buffer+=decoder.decode(value,{stream:true});const lines=buffer.split("\n");buffer=lines.pop()||"";lines.forEach(consume);}consume(buffer);}finally{reader.releaseLock();}
    if(!result)throw new Error("INCOMPLETE_RESPONSE");
  }else result=await request("/api/interpret",body,requestSignal);
  checkCancelled(requestSignal);
  if (
    !Array.isArray(result.drafts) ||
    !result.drafts.every(validateRecord) ||
    typeof result.reply !== "string"
  )
    throw new Error("INVALID_MODEL_RESPONSE");
  if(result.bottleAction&&!validBottleAction(result.bottleAction))throw new Error('INVALID_MODEL_RESPONSE');
  if(result.sleepStart&&!Number.isFinite(Date.parse(result.sleepStart)))throw new Error("INVALID_MODEL_RESPONSE");
  if(result.nursingStart&&(!["left","right"].includes(result.nursingStart.side)||!Number.isFinite(Date.parse(result.nursingStart.at))))throw new Error("INVALID_MODEL_RESPONSE");
  for(const r of result.drafts) {
    if(r.targetRecordId&&!data.records.some(x=>x.id===r.targetRecordId&&x.id===r.id&&x.kind===r.kind))throw new Error("INVALID_UPDATE_TARGET");
  }
  return result;
  },requestSignal),signal);
}
export async function transcribe(media: Media,signal?:AbortSignal): Promise<string> {
  const config=await loadProviders();if(config.mode==='direct')return directTranscribe(media,config,signal);
  const result = await requestDeadline(requestSignal=>withTransientRetry(()=>request("/api/transcribe", { audio: media.data },requestSignal),requestSignal),signal,65000);
  if (typeof result.text !== "string")
    throw new Error("INVALID_MODEL_RESPONSE");
  return result.text;
}
export async function observe(
  data: AppData,
  text: string,
  media: Media,
): Promise<string> {
  if((await loadProviders()).mode==='direct')throw Error("DIRECT_MEDIA_UNSUPPORTED");
  const result = await request("/api/observe", {
    ...context(data, text),
    media: [{ type: media.type, data: media.data }],
  });
  if (typeof result.reply !== "string")
    throw new Error("INVALID_MODEL_RESPONSE");
  return result.reply;
}
