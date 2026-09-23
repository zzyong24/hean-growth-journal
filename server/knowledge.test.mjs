import test from 'node:test';import assert from 'node:assert/strict';import {retrieveKnowledge} from './agent/knowledge.mjs';
test('AAP retrieval is relevant and age-bounded, not a pasted textbook',()=>{
 assert.equal(retrieveKnowledge('怎么安全睡觉',{birthday:'2026-08-30'},'2026-09-08')[0].id,'aap-sleep');
 assert.equal(retrieveKnowledge('怎么安全睡觉',{birthday:'2023-01-01'},'2026-09-08').length,0);
 assert.equal(retrieveKnowledge('今天出门散步',{},'2026-09-08').length,0);
});

test('newborn concerns retrieve verified sources with urgent topics first',()=>{
 const profile={birthday:'2026-08-30'};
 const fever=retrieveKnowledge('宝宝发热，吃奶也不好',profile,'2026-09-09');assert.equal(fever[0].id,'aap-fever');assert.ok(fever.length<=4);
 for(const [query,id] of [['黄疸','aap-jaundice'],['吸奶太少','aap-pumping'],['一直哭闹','aap-crying'],['便便很稀','aap-diapers'],['母乳吃饱了吗','aap-breastfeeding']]){const card=retrieveKnowledge(query,profile,'2026-09-09').find(c=>c.id===id);assert.ok(card);assert.equal(card.reviewedAt,'2026-09-09');assert.ok(card.url.startsWith('https://www.healthychildren.org/'));}
});
