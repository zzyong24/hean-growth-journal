import test from 'node:test';
import assert from 'node:assert/strict';
import {initialData,recordVersion,statsForDay,type AppData} from './domain';
import {applyBottleAction,normalizeBottleAction,canUndoBottle,type BottleAction} from './care/bottleFlow';
import {commitAutomaticRecords} from './automaticRecord';
import {applyReceipts,type VoiceReceipt} from './voiceInbox';
import {normalizeDrafts} from './aiCore/normalize.mjs';
const now='2026-10-25T07:00:00Z';
const start:BottleAction={type:'start',session:{id:'session-1',at:now,preparedMl:90,sourceText:'冲90'}};
const begin=()=>applyBottleAction({...initialData,babyId:'legacy'},start);
const finish=(d:AppData,leftoverMl=20)=>normalizeBottleAction({type:'finish',sessionId:d.bottleSession!.id,leftoverMl},d,'剩20',now)!;
test('prepared milk remains an unfinished session across serialization, only explicit completion counts',()=>{
 const started=JSON.parse(JSON.stringify(begin()));assert.equal(started.records.length,0);assert.equal(started.bottleSession.preparedMl,90);
 const action=finish(started);const ended=applyBottleAction(started,action);
 assert.equal(ended.records.length,1);assert.equal(ended.records[0].value,70);assert.equal(ended.records[0].details?.preparedMl,'90');assert.equal(ended.bottleSession,undefined);
 assert.deepEqual(applyBottleAction(ended,action),ended);assert.deepEqual(applyBottleAction(ended,start),ended);
});
test('undo restores progress, replay is safe, then corrected completion replaces the intake',()=>{
 const ended=applyBottleAction(begin(),finish(begin()));assert.equal(canUndoBottle(ended),true);
 const undo=normalizeBottleAction({type:'undo',recordId:ended.records[0].id},ended,'撤销',now)!;
 const undone=applyBottleAction(ended,undo);assert.equal(undone.records.length,0);assert.equal(undone.bottleSession?.preparedMl,90);
 assert.deepEqual(applyBottleAction(undone,undo),undone);
 const corrected=applyBottleAction(undone,finish(undone,10));assert.equal(corrected.records[0].value,80);assert.equal(corrected.bottleHistory?.[0].record?.value,70);
 const changed={...ended,records:[{...ended.records[0],value:60}]};assert.equal(canUndoBottle(changed),false);assert.throws(()=>applyBottleAction(changed,undo),/STALE/);
});
test('cancel creates no intake and keeps original progress; invalid or conflicting amounts cannot complete',()=>{
 const d=begin();const cancel:BottleAction={type:'cancel',sessionId:d.bottleSession!.id,at:now};const cancelled=applyBottleAction(d,cancel);
 assert.equal(cancelled.records.length,0);assert.equal(cancelled.bottleSession,undefined);assert.equal(cancelled.bottleHistory?.[0].session.preparedMl,90);assert.deepEqual(applyBottleAction(cancelled,cancel),cancelled);
 for(const quantities of [{},{leftoverMl:100},{consumedMl:-1},{consumedMl:80,leftoverMl:20},{consumedMl:'80'}])assert.throws(()=>normalizeBottleAction({type:'finish',sessionId:d.bottleSession!.id,...quantities},d,'',now));
 assert.equal(applyBottleAction(d,finish(d,90)).records[0].value,0);
 assert.throws(()=>normalizeBottleAction({type:'finish',sessionId:'wrong',leftoverMl:20},d,'',now),/SESSION/);
});
test('conflicting bottle action cannot partially save other events; mobile voice batch matches sequential durable state',()=>{
 const d=begin();assert.throws(()=>commitAutomaticRecords(d,[{id:'diaper',kind:'diaper',at:now,note:'',sourceText:''}],undefined,undefined,{...start,session:{...start.session,id:'other'}}),/RUNNING/);assert.equal(d.records.length,0);
 const receipt=(id:string,bottleAction:BottleAction):VoiceReceipt=>({id,profileKey:'legacy',status:'saved',capturedAt:now,timezone:'Asia/Shanghai',text:'test',records:[],bottleAction});
 const receipts=[receipt('start',start),receipt('finish',finish(d))];const first=applyReceipts({...initialData,babyId:'legacy'},receipts);
 assert.equal(first.data.records[0].value,70);assert.equal(applyReceipts(first.data,receipts).incoming.length,0);assert.equal(applyReceipts({...initialData,babyId:'other'},receipts).incoming.length,0);
 const conflict=applyReceipts({...d,bottleSession:{...d.bottleSession!,id:'other'}},[receipts[1]]);assert.equal(conflict.data.records.length,0);assert.equal(conflict.data.reviewQueue?.length,1);
});
test('normalization requires explicit action targets and rejects duplicate completed drafts for the same feed',()=>{
 const d=begin();const result=normalizeDrafts({drafts:[],reply:'已记录',bottleAction:{type:'finish',sessionId:d.bottleSession!.id,leftoverMl:20}},'剩20',[],[],{...d,now});assert.equal(result.bottleAction?.type,'finish');
 assert.throws(()=>normalizeDrafts({drafts:[{kind:'bottle',at:now,value:70}],reply:'',bottleAction:{type:'finish',sessionId:d.bottleSession!.id,leftoverMl:20}},'剩20',[],[],{...d,now}),/DUPLICATE/);
});
