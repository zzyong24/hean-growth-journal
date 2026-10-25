import {DeviceToolRouter,normalizeMCPToolResult,type FunctionTool,type ToolExecutor} from '@listenai/agent-sdk';
import {musicOrigin} from './config.local';

export const dashboardDefinition:FunctionTool={type:'function',function:{
 name:'hean_open_dashboard',description:'打开或重新进入已有的禾安五页数据看板。安装参数只能使用禾安服务器签发的内容，不生成、修改看板，不用于其他小应用。',
 parameters:{type:'object',properties:{id:{type:'string'},version:{type:'string'},name:{type:'string'},url:{type:'string'},size:{type:'integer'},hash:{type:'string'}},required:['id','version','name','url','size','hash'],additionalProperties:false}
}};

export function dashboardArguments(args:Record<string,unknown>):Record<string,unknown>{
 const prefix=musicOrigin+'/api/display/app.lua?ticket=';
 if(Object.keys(args).length!==6||typeof args.url!=='string'||!args.url.startsWith(prefix)||!/^[a-f0-9]{64}$/.test(args.url.slice(prefix.length))||
  typeof args.id!=='string'||!/^hean-[a-f0-9]{24}$/.test(args.id)||typeof args.hash!=='string'||!/^[a-f0-9]{32}$/.test(args.hash)||
  args.version!==args.hash||args.name!=='禾安看板'||!Number.isSafeInteger(args.size)||Number(args.size)<1||Number(args.size)>65536)throw Error('INVALID_DASHBOARD_PACKAGE');
 return {...args};
}

export class DashboardLauncher {
 constructor(private router=new DeviceToolRouter()){}
 executor():ToolExecutor {
  const install=this.router.executor({protocol:'xiaoling',originalName:'ls.built_in.miniapp_install',timeoutMs:45000});
  return {execute:async(call,context)=>{
   context.cancellation.throwIfCancelled();
   const args=dashboardArguments(call.parsedArguments);
   const result=await install.execute({...call,parsedArguments:args,arguments:JSON.stringify(args)},context);
   const started=!result.isError&&result.content.some(c=>c.type==='text'&&c.text.trim()==='miniapp installed and started');
   return {...result,isError:!started,control:{agentStop:false},content:[{type:'text',text:started?'HEAN_DASHBOARD_STARTED':'HEAN_DASHBOARD_UNCONFIRMED'}]};
  },cancel:install.cancel};
 }
 resolve(sessionId:string,raw:unknown):boolean {
  if(!raw||typeof raw!=='object'||Array.isArray(raw))return false;
  const value=raw as Record<string,unknown>;
  if(Object.keys(value).some(k=>!['_type','turn_id','id','result'].includes(k))||typeof value.turn_id!=='string'||typeof value.id!=='string')return false;
  let payload=value.result;
  // This firmware adds the original tool name to its standard MCP result.
  if(payload&&typeof payload==='object'&&!Array.isArray(payload)&&'tool' in payload){
   const {tool,...body}=payload as Record<string,unknown>;
   if(tool!=='ls.built_in.miniapp_install')return false;
   payload=body;
  }
  const result=normalizeMCPToolResult(payload,value.id);
  return !!result&&this.router.resolve({sessionId,turnId:value.turn_id,callId:value.id,result});
 }
 cancel(sessionId:string,reason?:string){this.router.cancelSession(sessionId,reason);}
}
