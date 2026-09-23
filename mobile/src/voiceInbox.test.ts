import test from 'node:test';
import assert from 'node:assert/strict';
import { applyReceipts, VoiceReceipt, validReceipt } from './voiceInbox';
import { initialData } from './domain';
const receipt:VoiceReceipt={id:'invocation-1',text:'刚喝了90毫升，换了尿布',capturedAt:'2026-09-07T20:30:00Z',timezone:'Asia/Shanghai',status:'saved',records:[{id:'invocation-1-0',kind:'bottle',at:'2026-09-07T20:30:00Z',value:90,unit:'ml',note:'',sourceText:'90毫升'},{id:'invocation-1-1',kind:'diaper',at:'2026-09-07T20:20:00Z',note:'',sourceText:'尿布'}]};
test('voice batch preserves phone timestamps and imports once even after record deletion',()=>{
 const first=applyReceipts(initialData,[receipt]);assert.equal(first.data.records.length,2);assert.equal(first.data.records.find(r=>r.kind==='diaper')?.at,'2026-09-07T20:20:00Z');
 assert.equal(applyReceipts(first.data,[receipt]).incoming.length,0);
 assert.equal(applyReceipts({...first.data,records:[]},[receipt]).data.records.length,0);
});
test('review and network failures never count as saved care events',()=>{
 for(const status of ['review','failed'] as const){const result=applyReceipts(initialData,[{...receipt,status}]);assert.equal(result.data.records.length,0);assert.equal(result.incoming.length,1);}
 assert.equal(applyReceipts(initialData,[{...receipt,status:'processing'}]).incoming.length,0);
});
test('invalid events are rejected and undo removes the whole batch',()=>{
 assert.equal(validReceipt({...receipt,records:[{kind:'bottle',value:-1}]}),false);
 const first=applyReceipts(initialData,[receipt]);
 assert.equal(applyReceipts(first.data,[{...receipt,status:'undone'}]).data.records.length,0);
});

test('Siri receipts cannot cross babies including old unscoped receipts',()=>{
 assert.equal(applyReceipts({...initialData,babyId:'second'},[receipt,{...receipt,profileKey:'legacy'}]).incoming.length,0);
 assert.equal(applyReceipts({...initialData,babyId:'second'},[{...receipt,profileKey:'second'}]).data.records.length,2);
 assert.equal(applyReceipts({...initialData,babyId:'legacy'},[receipt]).data.records.length,2);
});

test('Siri correction keeps target ID and undo restores the original value',()=>{
 const original={id:'milk',kind:'bottle' as const,at:'2026-09-08T09:00:00Z',value:50,unit:'ml',note:'',sourceText:'50ml'};
 const fixed={...original,value:35,targetRecordId:'milk',baseVersion:JSON.stringify([original.id,original.kind,original.at,original.value,original.note,undefined,undefined,undefined,undefined])};
 const receipt:any={id:'correction',text:'上一顿改成35毫升',capturedAt:original.at,timezone:'UTC',status:'saved',records:[fixed],previousRecords:[original]};
 const saved=applyReceipts({...initialData,records:[original]},[receipt]).data;
 assert.equal(saved.records.length,1);assert.equal(saved.records[0].value,35);
 const restored=applyReceipts(saved,[{...receipt,status:'undone'}]).data;
 assert.equal(restored.records.length,1);assert.equal(restored.records[0].value,50);
});
