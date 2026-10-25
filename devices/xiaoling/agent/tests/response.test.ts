import test from 'node:test';import assert from 'node:assert/strict';import {LazyResponseProvider} from '../lazyResponse';import type {ResponsePipeline} from '../vendor/response/deviceResponsePipeline';
test('waiting for care parsing does not publish an empty TTS URL; text and lifecycle still reach official pipeline',()=>{
 const events:string[]=[];
 const pipeline={finalAnswer:'',ignoreSession:false,endSession:false,imageArtifacts:[],outputMeta:{},hasActivity:false,start(){events.push('empty-url')},write(t:string){events.push(t)},handleEvent(){events.push('delta')},emitFrames(){},flush(){},discardPending(){},abort(){events.push('abort')},finish(){events.push('finish')}} satisfies ResponsePipeline;
 const p=new LazyResponseProvider({create:()=>pipeline}).create('test');p.start();assert.deepEqual(events,[]);p.write('已记下90毫升。');p.finish();assert.deepEqual(events,['已记下90毫升。','finish']);
 const q=new LazyResponseProvider({create:()=>pipeline}).create('cancel');q.start();q.abort();assert.equal(events.at(-1),'abort');
});
