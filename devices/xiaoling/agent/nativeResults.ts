import {ToolRegistry, type AgentToolResult} from '@listenai/agent-sdk';

// Some platform camera replies lose the firmware's isError flag and retain
// agentStop=true. The exact denial then silently ends the turn without TTS.
export function nativeResult(result:AgentToolResult):AgentToolResult {
  const blocked=result.artifacts.length===0&&result.content.some(item=>
    item.type==='text'&&item.text.trim()==='tool unavailable in current application mode');
  if(!blocked)return result;
  return {...result,isError:true,control:{agentStop:false},content:[{
    type:'text',text:'HEAN_NATIVE_MODE_BLOCKED: 当前设备固件在数据看板运行时限制这项原生操作，本次没有执行。请如实告知用户，不要重试，不要自动退出看板。'
  }]};
}

export function withNativeErrorFeedback(original:ToolRegistry):ToolRegistry {
  const registry=new ToolRegistry();
  for(const definition of original.definitions())registry.register(definition,{
    execute:async(call,context)=>nativeResult(await original.execute({
      id:call.id,name:call.name,arguments:call.arguments
    },context))
  });
  return registry;
}
