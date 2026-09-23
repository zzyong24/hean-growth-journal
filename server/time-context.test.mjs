import test from 'node:test';import assert from 'node:assert/strict';import {withTimeContext} from './agent/timeContext.mjs';
test('history keeps actual elapsed hours, unknown timestamps never become current time',()=>{
 const result=withTimeContext({now:'2026-09-09T08:28:00Z',timezone:'Asia/Shanghai',history:[{at:'2026-09-08T20:02:00Z',text:'旧纠正'},{text:'没有时间的旧消息'}],records:[{kind:'sleep',at:'2026-09-08T20:02:00Z',value:122}]});
 assert.equal(result.localNow,'2026-09-09 16:28:00');assert.equal(result.history[0].elapsedMinutes,746);assert.equal(result.history[0].localSentAt,'2026-09-09 04:02:00');assert.equal(result.history[1].elapsedMinutes,null);assert.equal(result.history[1].timeKnown,false);assert.equal(result.records[0].localSleepStart,'2026-09-09 02:00:00');assert.equal(result.records[0].localEventAt,'2026-09-09 04:02:00');
});
