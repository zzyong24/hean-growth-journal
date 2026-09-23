import AsyncStorage from '@react-native-async-storage/async-storage';
import {API_URL} from './serviceConfig';
import {requestDeadline} from './requestDeadline';
import {checkCancelled} from './cancellation';
let pending:Promise<string>|null=null;
export async function serviceToken():Promise<string>{
 if(process.env.EXPO_PUBLIC_GUEST_AUTH!=='true')return process.env.EXPO_PUBLIC_APP_TOKEN||'';
 if(!pending)pending=requestDeadline(async signal=>{const key='hean:device-token:'+API_URL;const old=await AsyncStorage.getItem(key);checkCancelled(signal);if(old)return old;
 const r=await fetch(API_URL+'/auth/guest',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}',signal});if(!r.ok)throw Error('AUTH_UNAVAILABLE');const d=await r.json();checkCancelled(signal);if(!/^[a-f0-9]{64}$/.test(d.token))throw Error('INVALID_AUTH');await AsyncStorage.setItem(key,d.token);return d.token;},undefined,10000).catch(e=>{pending=null;throw e});
 return pending;
}
export async function serviceHeaders(){const token=await serviceToken();return {'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})};}
