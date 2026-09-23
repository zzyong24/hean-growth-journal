import {test} from 'node:test';
import assert from 'node:assert/strict';
import {aiFailure} from './aiFailure';
test('provider failure, deadline and network failure have distinct actionable messages',()=>{
 assert.match(aiFailure(Error('AI_PROVIDERS_UNAVAILABLE'),'zh'),/备用模型/);
 assert.match(aiFailure(Error('AI_REQUEST_TIMEOUT'),'zh'),/已停止等待/);
 assert.match(aiFailure(new TypeError('network'),'zh'),/检查网络/);
 assert.equal(aiFailure(Error('private token'),'en').includes('private'),false);
});
