import test from 'node:test';import assert from 'node:assert/strict';import {initialData,validateRecord} from './domain';import {dayAnalytics} from './analytics';
test('pumping is not added to consumed milk and diaper fields are validated',()=>{
 const record={id:'p',kind:'pumping',at:new Date().toISOString(),value:120,note:'',sourceText:''};
 assert.ok(validateRecord(record));assert.equal(dayAnalytics([record as any],new Date()).milk,null);
 assert.ok(validateRecord({...record,kind:'diaper',value:undefined,details:{diaperType:'wet'}}));
 assert.equal(validateRecord({...record,details:{diaperType:'guess'}}),false);
});
test('medication needs an explicit name and amount cannot silently imply a dose',()=>{
 assert.equal(validateRecord({id:'m',kind:'medicine',at:new Date().toISOString(),note:'',sourceText:''}),false);
});
import {feedingSummary} from './analytics';
import {milkBalance} from './care/details';
test('consumption excludes leftover, and unknown prepared amounts stay unknown',()=>{
 const r:any={id:'m',kind:'bottle',at:'2026-10-25T07:00:00Z',value:80,note:'',sourceText:'',details:{preparedMl:'90'}};
 assert.ok(validateRecord(r));assert.deepEqual(milkBalance(r),{prepared:90,consumed:80,leftover:10});
 assert.equal(validateRecord({...r,value:100}),false);assert.equal(validateRecord({...r,details:{preparedMl:'NaN'}}),false);
 assert.ok(validateRecord({...r,value:0}));assert.equal(validateRecord({...r,value:0,details:{}}),false);
 const summary=feedingSummary([r,{...r,id:'other',value:60,details:{}}],7,new Date('2026-10-25T08:00:00Z'));
 assert.equal(summary.total,140);assert.equal(summary.prepared,90);assert.equal(summary.leftover,10);assert.equal(summary.preparedCount,1);
});

import {eliminationSummary,formattedDetails} from './care/details';
test('urination counts and diaper changes stay independent and unknown stays unknown',()=>{
 const r:any={id:'u',kind:'diaper',at:new Date().toISOString(),note:'',sourceText:'',details:{diaperType:'wet',urinationCount:'3',diaperChangeCount:'1'}};
 assert.ok(validateRecord(r));
 const stats=eliminationSummary([r,{...r,id:'unknown',details:{diaperType:'wet'}}]);
 assert.deepEqual(stats,{urinations:{total:3,known:1,unknown:1},changes:{total:1,known:1,unknown:1},recordCount:2});
 assert.equal(dayAnalytics([r],new Date()).diapers,1);assert.equal(dayAnalytics([r],new Date()).urinations,3);
 assert.equal(eliminationSummary([{...r,details:{}}]).changes.total,null);
 for(const value of ['-1','1.5','NaN','9007199254740992'])assert.equal(validateRecord({...r,details:{urinationCount:value}}),false);
 assert.ok(validateRecord({...r,details:{urinationCount:'0'}}));
 assert.equal(validateRecord({...r,kind:'note'}),false);
 assert.match(formattedDetails(r,'zh'),/小便 3 次 · 换尿布 1 次/);
});
