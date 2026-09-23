import {test} from 'node:test';import assert from 'node:assert/strict';import {endpoint,chatPayload,readChat} from './providers/protocol';
test('base or complete endpoint; reject URL credentials/query to avoid key leaks',()=>{
 assert.equal(endpoint('https://example.com/v1/','chat/completions'),'https://example.com/v1/chat/completions');
 assert.equal(endpoint('https://example.com/v1/messages','messages'),'https://example.com/v1/messages');
 assert.throws(()=>endpoint('https://user:secret@example.com','messages'));
});
test('Anthropic system/images and OpenAI output adapt without sharing reasoning',()=>{
 const p=chatPayload('anthropic','model','system','hello',['data:image/png;base64,AAAA']);
 assert.equal(p.system,'system');assert.equal(p.messages[0].content[1].source.type,'base64');
 assert.equal(readChat('anthropic',{content:[{type:'thinking',thinking:'private'},{type:'text',text:'ok'}]}),'ok');
 assert.equal(readChat('openai',{choices:[{message:{content:'ok'}}]}),'ok');
});
test('Responses preserves input image and excludes reasoning from result',()=>{const body=chatPayload('responses','model','system','hello',['data:image/png;base64,YQ==']);assert.equal(body.input[0].content[1].type,'input_image');assert.equal(readChat('responses',{output:[{type:'reasoning',summary:[]},{type:'message',content:[{type:'output_text',text:'OK'}]}]}),'OK');assert.throws(()=>readChat('responses',{status:'incomplete',output:[]}));assert.throws(()=>endpoint('http://localhost.evil.com','messages'));});
