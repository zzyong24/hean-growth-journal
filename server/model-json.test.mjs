import {test} from 'node:test';import assert from 'node:assert/strict';import {parseModelJSON} from './index.mjs';
test('leading whitespace around a JSON fence does not discard a complete model response',()=>{
 assert.deepEqual(parseModelJSON('\n```json\n{"reply":"","drafts":[]}\n```\n'),{reply:'',drafts:[]});
 assert.throws(()=>parseModelJSON('Here is a response: {"drafts":[]}'));
 assert.throws(()=>parseModelJSON('{"drafts":['));
});
