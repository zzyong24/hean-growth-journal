import {emitTTSStreamUrl, closeActiveTTSStream, type FunctionTool, type ToolExecutor, type DeviceActionRequest} from '@listenai/agent-sdk';
import {DefaultToolProvider, type ToolPreparationContext} from './vendor/tools/defaultToolProvider';
import type {VoiceTurnContext} from './vendor/types';
import {musicOrigin} from './config.local';
import {withNativeErrorFeedback} from './nativeResults';
import {DashboardLauncher,dashboardDefinition} from './dashboard';

export const playDefinition:FunctionTool={type:'function',function:{
  name:'hean_play_audio_link',description:'播放禾安家庭曲库中用户提供的音乐。仅接受禾安签发的临时音频链接。',
  parameters:{type:'object',properties:{url:{type:'string'},title:{type:'string'}},required:['url','title'],additionalProperties:false}
}};
export const stopDefinition:FunctionTool={type:'function',function:{
  name:'hean_stop_audio',description:'停止正在播放的音乐。',parameters:{type:'object',properties:{},additionalProperties:false}
}};

export function playbackAction(args:Record<string,unknown>):DeviceActionRequest {
  // This player cannot fetch arbitrary model-provided or local-network URLs.
  const url=String(args.url||'');
  const prefix=musicOrigin+'/api/music/play/';
  if(!url.startsWith(prefix)||!/^(abc|lubinghua|playlist)\?ticket=[a-f0-9]{64}$/.test(url.slice(prefix.length)))throw Error('INVALID_MUSIC_LINK');
  const id=url.split('/play/')[1].split('?')[0];
  const names:Record<string,string>={abc:'ABC儿歌',lubinghua:'鲁冰花',playlist:'ABC儿歌和鲁冰花连播'};
  return {action:'music_playlist',playback:'audio_link',items:[{item_id:id,name:names[id],url,playable:1,source:'hean_family'}]};
}

export class HeanTools extends DefaultToolProvider {
  private readonly dashboard=new DashboardLauncher();
  override resolveDeviceResult(sessionId:string,raw:unknown):boolean {
    return this.dashboard.resolve(sessionId,raw)||super.resolveDeviceResult(sessionId,raw);
  }
  override cancelSession(sessionId:string,reason?:string):void {
    this.dashboard.cancel(sessionId,reason);super.cancelSession(sessionId,reason);
  }
  override clearSession(sessionId:string):void {
    this.dashboard.cancel(sessionId,'Session state cleared');super.clearSession(sessionId);
  }
  override async prepare(context:VoiceTurnContext,policy:ToolPreparationContext={}) {
    const prepared=await super.prepare(context,policy);
    prepared.registry=withNativeErrorFeedback(prepared.registry);
    const executor=(stop:boolean):ToolExecutor=>({execute:async(call,execution)=>{
      execution.cancellation.throwIfCancelled();
      if(!stop){
        const action=playbackAction(call.parsedArguments);
        if(action.action!=='music_playlist'||!action.items[0].url)throw Error('INVALID_MUSIC_LINK');
        closeActiveTTSStream();
        // The official URL audio channel is available alongside the Lua screen.
        // A new wake/utterance interrupts it through the ordinary speech lifecycle.
        emitTTSStreamUrl(execution.sessionId,action.items[0].url);
      }
      return {callId:call.id,content:[],isError:false,control:{agentStop:true},artifacts:[]};
    }});
    // These app-owned tools remain available while the read-only Lua screen runs.
    // The dedicated music MCP is excluded in the device's miniapp mode. Keep the
    // original screen and use the supported audio URL stream, without a music subscription.
    prepared.registry.register(playDefinition,executor(false));
    prepared.registry.register(stopDefinition,executor(true));
    prepared.registry.register(dashboardDefinition,this.dashboard.executor());
    prepared.catalog.tools=prepared.registry.definitions();
    prepared.toolChoice='auto';
    return prepared;
  }
}
