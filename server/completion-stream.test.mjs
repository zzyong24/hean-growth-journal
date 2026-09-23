import {test} from 'node:test';import assert from 'node:assert/strict';
import {readCompletionStream} from './completion-stream.mjs';
async function* chunks(lines){const bytes=new TextEncoder().encode(lines);for(let i=0;i<bytes.length;i+=7)yield bytes.slice(i,i+7);}
test('fragmented UTF8 and final unclosed SSE line preserve complete content only',async()=>{
 const input='data: '+JSON.stringify({choices:[{delta:{reasoning_content:'private'}}]})+'\n\n'+'data: '+JSON.stringify({choices:[{delta:{content:'宝宝'}}]})+'\n\n'+'data: '+JSON.stringify({choices:[{delta:{content:'好'},finish_reason:'stop'}]});
 assert.equal(await readCompletionStream(chunks(input)),'宝宝好');
});
test('token limit never publishes even an apparently complete partial result',async()=>{
 const input='data: '+JSON.stringify({choices:[{delta:{content:'{}'},finish_reason:'length'}]})+'\n';
 await assert.rejects(readCompletionStream(chunks(input)),/MODEL_OUTPUT_LIMIT/);
});
test('DONE completes the response without waiting for the provider to close its connection',async()=>{
 async function* keptOpen(){yield new TextEncoder().encode('data: {"choices":[{"delta":{"content":"{}"}}]}\n\ndata: [DONE]\n\n');await new Promise(()=>{});}
 const result=await Promise.race([readCompletionStream(keptOpen()),new Promise(r=>setTimeout(()=>r('TIMEOUT'),50))]);
 assert.equal(result,'{}');
});
