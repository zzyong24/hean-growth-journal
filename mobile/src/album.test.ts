import test from 'node:test';import assert from 'node:assert/strict';import {albumGroups} from './care/album';
test('album uses capture month, deduplicates shared ledger photo and filters videos',()=>{
 const a={id:'photo',type:'image' as const,mime:'image/jpeg',name:'',capturedAt:'2026-08-31T12:00:00Z'};
 const rows=[{id:'1',kind:'note' as const,at:'2026-09-08T12:00:00Z',note:'洗澡',sourceText:'',attachments:[a]},{id:'2',kind:'note' as const,at:'2026-09-08T12:00:00Z',note:'',sourceText:'',attachments:[a]}];
 const groups=albumGroups(rows,'2026-08-30');assert.equal(groups.length,1);assert.equal(groups[0].month,'2026-08');assert.equal(groups[0].items.length,1);assert.equal(albumGroups(rows,'2026-08-30','video').length,0);
});
