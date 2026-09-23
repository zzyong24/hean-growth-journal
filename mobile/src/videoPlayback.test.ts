import test from 'node:test';import assert from 'node:assert/strict';import {attachVideoPlayback} from './videoPlayback';
test('closing before video finishes loading ignores late callbacks after native release',async()=>{
 let resolve!:(v:unknown)=>void,listener!:(e:{status:string})=>void;let released=false,plays=0,updates=0;
 const cleanup=attachVideoPlayback({addListener:(_,fn)=>{listener=fn;return {remove(){if(released)throw new Error('released')}}},replaceAsync:()=>new Promise(r=>resolve=r),play:()=>{if(released)throw new Error('released');plays++}},'file://video.mov',()=>updates++,()=>updates++);
 released=true;assert.doesNotThrow(cleanup);assert.doesNotThrow(cleanup);resolve(null);listener({status:'readyToPlay'});await Promise.resolve();await Promise.resolve();assert.equal(plays,0);assert.equal(updates,0);
});
test('mounted video plays once and errors after cleanup do not update the view',async()=>{
 let plays=0;const cleanup=attachVideoPlayback({addListener:()=>({remove(){}}),replaceAsync:async()=>{},play:()=>{plays++}},'file://v.mp4',()=>{},()=>{});
 await Promise.resolve();assert.equal(plays,1);cleanup();
});
