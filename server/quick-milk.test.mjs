import test from 'node:test';import assert from 'node:assert/strict';import {quickMilk} from './quick-milk.mjs';
const at='2026-01-20T10:00:00Z';
test('explicit current milk intake is parsed without a model and preserves unknown remainder',()=>{
 for(const text of ['我喝了90毫升奶','宝宝刚才喝了90毫升的奶都喝完了。','刚喝了90ml']){
  const result=quickMilk(text,at);assert.equal(result.drafts[0].value,90);assert.equal(result.drafts[0].at,at);assert.equal(result.drafts[0].sourceText,text);
  assert.equal(result.drafts[0].details?.preparedMl,text.includes('都喝完')?'90':undefined);
 }
});
test('ambiguous, past, corrected, negated or ongoing events always use the full parser',()=>{
 for(const text of ['喝90ml好吗','没喝90ml','如果喝了90ml','宝宝昨天喝了90ml','宝宝刚喝了90ml还在喝','把90ml改成80ml','喝了90ml，又吐了','刚喝了0ml','刚喝了900ml','刚喝了九十毫升','冲了90ml','爸爸喝了90ml'])assert.equal(quickMilk(text,at),null,text);
 assert.equal(quickMilk('宝宝刚喝了90ml',at,{bottleSession:{preparedMl:100}}),null);
});
