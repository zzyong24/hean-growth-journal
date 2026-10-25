import test from 'node:test';
import assert from 'node:assert/strict';
import {ToolRegistry,CancellationTokenSource,type ToolExecutionContext,type AgentToolResult} from '@listenai/agent-sdk';
import {nativeResult,withNativeErrorFeedback} from '../nativeResults';

test('firmware mode denial becomes a reportable error instead of silently stopping',async()=>{
  let count=0;const original=new ToolRegistry();
  original.register({type:'function',function:{name:'take_photo',parameters:{type:'object',properties:{}}}}, {execute:async(call)=>{
    count++;return {callId:call.id,isError:false,control:{agentStop:true},artifacts:[],content:[{type:'text',text:'tool unavailable in current application mode'}]};
  }});
  const wrapped=withNativeErrorFeedback(original),cancel=new CancellationTokenSource();
  const context={sessionId:'test',turnId:'test',requestId:'test',cancellation:cancel.token} as ToolExecutionContext;
  const result=await wrapped.execute({id:'photo_1',name:'take_photo',arguments:'{}'},context);
  assert.equal(count,1);assert.equal(result.isError,true);assert.equal(result.control.agentStop,false);
  assert.match(JSON.stringify(result.content),/HEAN_NATIVE_MODE_BLOCKED/);
  assert.deepEqual(wrapped.definitions(),original.definitions());
  cancel.cancel('test cancellation');await assert.rejects(wrapped.execute({id:'photo_2',name:'take_photo',arguments:'{}'},context));assert.equal(count,1);
});

test('successful camera results, other failures and player stop semantics remain untouched',()=>{
  for(const result of [
    {callId:'ok',isError:false,control:{agentStop:true},artifacts:[],content:[{type:'text',text:'photo captured'}]},
    {callId:'busy',isError:true,control:{agentStop:false},artifacts:[],content:[{type:'text',text:'camera busy'}]},
    {callId:'music',isError:false,control:{agentStop:true},artifacts:[],content:[]}
  ] satisfies AgentToolResult[])assert.equal(nativeResult(result),result);
});
