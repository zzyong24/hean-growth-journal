import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeImageTimes} from './agent/imageTime.mjs';
test('paper clock times use Shanghai exactly once, including previous UTC date',()=>{
 const result=normalizeImageTimes({reply:'',drafts:['03:20','06:30','09:20'].map(time=>({kind:'bottle',value:60,localAt:`2026-09-10T${time}:00`,at:'2026-09-09T11:20:00Z'}))},'Asia/Shanghai');
 assert.deepEqual(result.drafts.map(d=>d.at),['2026-09-09T19:20:00.000Z','2026-09-09T22:30:00.000Z','2026-09-10T01:20:00.000Z']);
 const fmt=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Shanghai',hour:'2-digit',minute:'2-digit'});
 assert.deepEqual(result.drafts.map(d=>fmt.format(new Date(d.at))),['03:20','06:30','09:20']);
});
test('image times reject absent, invalid dates and invalid zones instead of guessing',()=>{
 for(const localAt of [undefined,'2026-02-30T03:00:00','2026-09-10T25:00:00','2026-09-10T03:00:00Z'])assert.throws(()=>normalizeImageTimes({drafts:[{localAt}]},'Asia/Shanghai'),/INVALID_MODEL_RESPONSE/);
 assert.throws(()=>normalizeImageTimes({drafts:[{localAt:'2026-09-10T03:00:00'}]},undefined),/INVALID_MODEL_RESPONSE/);
});
test('overseas offset follows event date; ambiguous and nonexistent daylight saving clocks rejected',()=>{
 const run=localAt=>normalizeImageTimes({drafts:[{localAt}]},'America/Los_Angeles').drafts[0].at;
 assert.equal(run('2026-09-10T03:00:00'),'2026-09-10T10:00:00.000Z');
 assert.equal(run('2026-01-10T03:00:00'),'2026-01-10T11:00:00.000Z');
 assert.throws(()=>run('2026-03-08T02:30:00'),/INVALID_MODEL_RESPONSE/);
 assert.throws(()=>run('2026-11-01T01:30:00'),/INVALID_MODEL_RESPONSE/);
});
