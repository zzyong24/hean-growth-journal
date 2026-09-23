import test from 'node:test';
import assert from 'node:assert/strict';
import {mergeRecords, CareRecord} from './domain';
import {correctLatestBottle} from './eventCorrection';
const milk:CareRecord={id:'milk',kind:'bottle',at:'2026-09-08T02:23:00+08:00',value:50,note:'50ml都喝完了',sourceText:'喝了50ml'};
test('saved milk correction changes the same event and summary without adding a record',()=>{
 const draft=correctLatestBottle('上一顿奶改为35ml',[milk],new Date('2026-09-08T02:50:00+08:00'))!;
 const saved=mergeRecords([milk],[draft]);assert.equal(saved.length,1);assert.equal(saved[0].id,'milk');assert.equal(saved[0].value,35);assert.equal(saved[0].at,milk.at);assert.equal(saved[0].note.includes('50'),false);
 assert.throws(()=>mergeRecords([{...milk,value:40}],[draft]),/STALE/);
});
test('complex, hypothetical and ambiguous requests must not be partially swallowed by fast correction',()=>{
 for(const text of ['上一顿改为35ml，然后睡到了喝奶时','是不是改成35ml？','昨天那顿改成35ml','喝了35ml'])assert.equal(correctLatestBottle(text,[milk]),null);
});
