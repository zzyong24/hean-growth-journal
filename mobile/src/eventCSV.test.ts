import {test} from 'node:test';import assert from 'node:assert/strict';import {eventCSV} from './eventCSV';
test('CSV includes Beijing times, sleep start, original text and escapes formula/quotes/newlines',()=>{
 const csv=eventCSV([{id:'s',kind:'sleep',at:'2026-09-10T20:00:00Z',value:60,note:'=1+1',sourceText:'他说"睡了"\n一小时'}],'宝宝','Asia/Shanghai');
 assert.ok(csv.startsWith('\uFEFF'));assert.match(csv,/2026-09-11 04:00:00/);assert.match(csv,/2026-09-11 03:00:00/);assert.match(csv,/'=1\+1/);assert.match(csv,/他说""睡了""\n一小时/);
});
