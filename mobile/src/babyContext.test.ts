import test from 'node:test';
import assert from 'node:assert/strict';
import { babyContext, deviceClock } from './babyContext';
import { initialData, CareRecord } from './domain';
import { quickBottle } from './quickRecord';
test('automatic context includes records older than the former 50-event cutoff', () => {
 const records: CareRecord[] = Array.from({length:60},(_,i)=>({id:String(i),kind:'bottle',at:new Date(2026,8,7,0,i).toISOString(),value:60,note:'',sourceText:''}));
 const c=babyContext({...initialData,records},new Date(2026,8,7,12));
 assert.equal(c.history.length,60); assert.equal(c.coverage.totalRecords,60); assert.equal(c.week.at(-1)?.milk,3600);
 assert.equal(c.latestByKind.weight,null);
});
test('device clock uses device calendar date and offset, not UTC calendar day',()=>{
 const old=process.env.TZ; process.env.TZ='Asia/Shanghai';
 try {const c=deviceClock(new Date('2026-09-07T20:30:00Z'));assert.equal(c.localDate,'2026-09-08');assert.equal(c.utcOffsetMinutes,480);assert.equal(c.timezone,'Asia/Shanghai');}
 finally {if(old===undefined)delete process.env.TZ;else process.env.TZ=old;}
});
test('fast record handles a complete event and rejects questions, corrections and leftovers',()=>{
 assert.equal(quickBottle('刚喝了90毫升')?.value,90);
 for(const text of ['喝了90毫升吗？','不是90毫升，是60毫升','剩下90毫升','喝了90毫升，换了尿布']) assert.equal(quickBottle(text),null);
});
test('bounded retrieval keeps a specifically mentioned old event without sending all history',()=>{
 const records:CareRecord[]=Array.from({length:1000},(_,i)=>({id:String(i),kind:'note',at:new Date(2024,0,i+1).toISOString(),note:i===0?'医院第一次洗澡':'日常观察',sourceText:''}));
 const c=babyContext({...initialData,records},new Date(2026,8,8),'医院第一次洗澡');
 assert.ok(c.history.length<=80);assert.ok(c.history.some(r=>r.id==='0'));assert.equal(c.coverage.totalRecords,1000);
});

test('CN AI context uses Beijing calendar even when host timezone is overseas',()=>{
 const now=new Date('2026-09-08T20:02:00Z');const c=deviceClock(now,'Asia/Shanghai');
 assert.equal(c.now,'2026-09-08T20:02:00.000Z');assert.equal(c.localDate,'2026-09-09');assert.equal(c.utcOffsetMinutes,480);
 assert.equal(babyContext({...initialData,settings:{...initialData.settings,region:'CN'}},now).timezone,'Asia/Shanghai');
});
