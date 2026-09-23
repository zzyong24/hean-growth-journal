import {test} from 'node:test';
import assert from 'node:assert/strict';
import {compactContext} from './agent/compactContext.mjs';
test('remove identical summary copies without dropping original facts or message times',()=>{
 const r={id:'r',kind:'bottle',at:'2026-09-10T07:35:00Z',value:60,sourceText:'original',note:'long original note',attachments:[{id:'image',type:'image',uri:'local'}]};
 const context={records:[r],history:[{text:'retry',at:'2026-09-10T08:00:00Z'}],babyContext:{history:[{id:'r',kind:'bottle',value:60,note:'long',attachmentCount:1,attachments:[{id:'image',type:'image'}]}],sleepStart:'2026-09-10T03:35:00Z'}};
 const result=compactContext(context);
 assert.deepEqual(result.babyContext.history,[]);
 assert.deepEqual(result.records,[r]);assert.deepEqual(result.history,context.history);
 assert.equal(result.babyContext.sleepStart,context.babyContext.sleepStart);
 assert.equal(context.babyContext.history.length,1);
});
test('preserve differing summaries and facts absent from records',()=>{
 const history=[{id:'a',value:80},{id:'b',value:20}];
 assert.deepEqual(compactContext({records:[{id:'a',value:60}],babyContext:{history}}).babyContext.history,history);
});
