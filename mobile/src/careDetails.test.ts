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
