import {test} from 'node:test';
import assert from 'node:assert/strict';
import {messageTime} from './messageTime';
test('Beijing timestamp uses sent time and includes date after midnight',()=>{
 const at='2026-09-09T15:59:00Z';
 assert.equal(messageTime(at,'Asia/Shanghai',new Date('2026-09-09T15:59:30Z')),'23:59');
 assert.match(messageTime(at,'Asia/Shanghai',new Date('2026-09-09T16:01:00Z')),/2026.*09.*09.*23:59/);
 assert.equal(messageTime(undefined,'Asia/Shanghai'),'');
 assert.equal(messageTime('invalid','Asia/Shanghai'),'');
});
