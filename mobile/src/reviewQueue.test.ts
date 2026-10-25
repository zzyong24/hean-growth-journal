import test from 'node:test';
import assert from 'node:assert/strict';
import {initialData,type CareRecord} from './domain';
import {seedNotebookReviews,resolveReview,pendingReviews} from './review/queue';
import {applyReceipts,type VoiceReceipt} from './voiceInbox';
const attachment={id:'page-1',type:'image' as const,mime:'image/jpeg',name:'notebook',role:'source' as const};
const page:CareRecord={id:'page',kind:'note',at:'2026-10-02T04:00:00Z',note:'某行字迹不清，待核对',sourceText:'整页原文',attachments:[attachment]};
const milk:CareRecord={id:'milk',kind:'bottle',at:page.at,value:70,note:'时段待核对',sourceText:'原文',attachments:[attachment]};
test('notebook migration creates one source card with only affected care rows and remains resolved across restart',()=>{
 const data={...initialData,records:[page,milk,{...milk,id:'clear',note:'',sourceText:''}]};const migrated=seedNotebookReviews(data);
 assert.equal(migrated.reviewQueue?.length,1);assert.deepEqual(migrated.reviewQueue?.[0].recordIds,['milk']);assert.equal(migrated.reviewQueue?.[0].attachments?.[0].id,attachment.id);
 assert.equal(seedNotebookReviews(migrated),migrated);const done=resolveReview(migrated,migrated.reviewQueue![0].id);assert.equal(pendingReviews(seedNotebookReviews(JSON.parse(JSON.stringify(done)))).length,0);assert.equal(done.records.length,3);
});
test('failed and partial receipts keep raw text in review without adding uncertain intake, deduplicated across replay',()=>{
 const r:VoiceReceipt={id:'failed',profileKey:'legacy',text:'刚才喝了，量不清楚',capturedAt:page.at,timezone:'Asia/Shanghai',status:'failed',records:[],reply:'解析失败'};
 const failed=applyReceipts({...initialData,babyId:'legacy'},[r]).data;assert.equal(failed.records.length,0);assert.equal(failed.reviewQueue?.[0].sourceText,r.text);assert.equal(applyReceipts(failed,[r]).data.reviewQueue?.length,1);
 const partial=applyReceipts({...initialData,babyId:'legacy'},[{...r,id:'partial',status:'saved',records:[milk],reviewReasons:['还有一行时间不清']}]).data;assert.equal(partial.records.length,1);assert.equal(partial.reviewQueue?.length,1);assert.deepEqual(partial.reviewQueue?.[0].recordIds,['milk']);
});
