import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import {Platform} from 'react-native';
import {endpoint,type Protocol} from './protocol';
export type Channel={baseURL:string;model:string;apiKey:string;protocol:Protocol};
export type ProviderConfig={mode:'cloud'|'direct';timeoutSeconds:number;retries:number;chat:Channel;asr:Channel;image:Channel};
export const defaults:ProviderConfig={mode:'cloud',timeoutSeconds:180,retries:2,chat:{baseURL:'',model:'',apiKey:'',protocol:'openai'},asr:{baseURL:'',model:'',apiKey:'',protocol:'transcriptions'},image:{baseURL:'',model:'',apiKey:'',protocol:'images'}};
const key='hean.provider-config.v1',channels=['chat','asr','image'] as const;
let webConfig:ProviderConfig=defaults;
export function validateConfig(c:ProviderConfig){
 if(!['cloud','direct'].includes(c.mode)||!Number.isInteger(c.timeoutSeconds)||c.timeoutSeconds<30||c.timeoutSeconds>600||!Number.isInteger(c.retries)||c.retries<0||c.retries>5)throw Error('INVALID_CONFIG');
 for(const k of channels){const x=c[k];if(x.baseURL)endpoint(x.baseURL,k==='chat'?(x.protocol==='anthropic'?'messages':'chat/completions'):k==='asr'?(x.protocol==='qwen-audio'?'chat/completions':'audio/transcriptions'):'images/generations');if(x.baseURL&&!x.model.trim())throw Error('MODEL_REQUIRED');}
 if(!['openai','responses','anthropic'].includes(c.chat.protocol)||!['transcriptions','qwen-audio'].includes(c.asr.protocol)||c.image.protocol!=='images')throw Error('INVALID_CONFIG');
 if(c.mode==='direct'&&!c.chat.baseURL)throw Error('CHAT_CONFIG_REQUIRED');
}
export async function loadProviders():Promise<ProviderConfig>{
 if(Platform.OS==='web')return structuredClone(webConfig);
 const raw=await AsyncStorage.getItem(key);if(!raw)return JSON.parse(JSON.stringify(defaults));
 const saved=JSON.parse(raw);const result={...defaults,...saved};
 for(const k of channels)result[k]={...defaults[k],...saved[k],apiKey:saved.secretRef?await SecureStore.getItemAsync(saved.secretRef+'.'+k)||'':''};
 return result;
}
export async function saveProviders(config:ProviderConfig){
 validateConfig(config);if(Platform.OS==='web'){webConfig=structuredClone(config);return;}
 const old=await AsyncStorage.getItem(key),secretRef='hean.provider.'+Date.now()+'.'+Math.random().toString(36).slice(2);
 const publicConfig:any={...config,secretRef};
 try{
  for(const k of channels){await SecureStore.setItemAsync(secretRef+'.'+k,config[k].apiKey,{keychainAccessible:SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY});publicConfig[k]={...config[k],apiKey:undefined};}
  await AsyncStorage.setItem(key,JSON.stringify(publicConfig));
 }catch(e){await Promise.all(channels.map(k=>SecureStore.deleteItemAsync(secretRef+'.'+k).catch(()=>{})));throw e;}
 const prior=old?JSON.parse(old).secretRef:null;if(prior)await Promise.all(channels.map(k=>SecureStore.deleteItemAsync(prior+'.'+k).catch(()=>{})));
}
