import test from 'node:test';import assert from 'node:assert/strict';
import {DeviceToolRouter,CancellationTokenSource} from '@listenai/agent-sdk';
import {DashboardLauncher,dashboardArguments} from '../dashboard';import {musicOrigin} from '../config.local';
const args={id:'hean-'+'a'.repeat(24),version:'b'.repeat(32),name:'禾安看板',url:musicOrigin+'/api/display/app.lua?ticket='+'c'.repeat(64),size:100,hash:'b'.repeat(32)};
test('screen launcher restricts packages to the paired service and validates exact device fields',()=>{
 assert.deepEqual(dashboardArguments(args),args);
 for(const update of [{url:'https://evil.test/app.lua'},{url:args.url+'&redirect=evil'},{url:args.url.replace('https:','http:')},{id:'other'},{hash:'zz'},{version:'different'},{size:65537},{size:0},{size:1.5},{name:'other'},{extra:true}])assert.throws(()=>dashboardArguments({...args,...update}));
});
test('official device call and matching success receipt drive completion; unrelated results and failures do not',async()=>{
 const frames:unknown[]=[];const router=new DeviceToolRouter({emit:(session,frame)=>frames.push(frame)});const launcher=new DashboardLauncher(router),executor=launcher.executor();
 const cancellation=new CancellationTokenSource();const context={sessionId:'s',turnId:'t',requestId:'r',cancellation:cancellation.token};
 const call={id:'open',name:'hean_open_dashboard',arguments:JSON.stringify(args),parsedArguments:args};
 const pending=executor.execute(call,context);
 assert.deepEqual(frames[0],{type:'CUSTOM',nlp_origin:'xiaoling_mcp',payload:{method:'tools/call',id:'open',turn_id:'t',params:{name:'ls.built_in.miniapp_install',arguments:args}}});
 const result={tool:'ls.built_in.miniapp_install',content:[{type:'text',text:'miniapp installed and started'}],isError:false};
 assert.equal(launcher.resolve('s',{id:'open',turn_id:'t',result:{...result,tool:'different'}}),false);
 assert.equal(launcher.resolve('wrong',{id:'open',turn_id:'t',result}),false);
 assert.equal(launcher.resolve('s',{id:'open',turn_id:'wrong',result}),false);
 assert.equal(launcher.resolve('s',{id:'open',turn_id:'t',result}),true);
 assert.equal((await pending).content[0].type,'text');assert.match(JSON.stringify((await pending).content),/HEAN_DASHBOARD_STARTED/);
 const failed=executor.execute({...call,id:'fail'},context);launcher.resolve('s',{id:'fail',turn_id:'t',result:{content:[{type:'text',text:'miniapp install failed: download failed'}],isError:true}});assert.equal((await failed).isError,true);assert.equal((await failed).control.agentStop,false);
 const cancelled=executor.execute({...call,id:'cancel'},context);launcher.cancel('s','test');await assert.rejects(cancelled);assert.equal(router.pendingCount,0);
});
