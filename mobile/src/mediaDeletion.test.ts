import test from 'node:test';
import assert from 'node:assert/strict';
import {initialData,type Attachment,type CareRecord} from './domain';
import {allMedia,applyMediaDeletions,conversationMedia,deleteAlbumMedia,unownedMedia,withoutConversationMedia} from './care/mediaDeletion';
const photo:Attachment={id:'photo',type:'image',mime:'image/jpeg',name:'baby.jpg',livePhoto:{id:'live',type:'video',mime:'video/quicktime',name:'baby.mov'}};
const video:Attachment={id:'video',type:'video',mime:'video/mp4',name:'baby.mp4'};
const row=(id:string,attachments:Attachment[],note=''):CareRecord=>({id,kind:'note',at:'2026-10-25T03:00:00Z',note,sourceText:'',attachments});
test('batch deletion deduplicates media, preserves care values/text and removes empty photo-only rows',()=>{
 const milk:CareRecord={...row('milk',[photo]),kind:'bottle',value:80,details:{preparedMl:"90"}};
 const data={...initialData,records:[milk,row('picture',[photo]),row('memory',[photo,video],'第一次笑'),row('audio',[{id:'sound',type:'audio' as const,mime:'audio/m4a',name:'voice'}])]};
 const result=deleteAlbumMedia(data,['photo','video','photo','sound']);
 assert.equal(result.removed.length,2);assert.deepEqual(result.data.records.map(r=>r.id),['milk','memory','audio']);
 assert.deepEqual(result.data.records[0],{...milk,attachments:[]});assert.equal(result.data.records[1].note,'第一次笑');
 assert.deepEqual(result.data.mediaDeletionPending,result.removed);assert.equal(data.records.length,4);
});
test('notebook sources cannot be deleted even when another record lists the same file as memory',()=>{
 const source={...photo,role:'source' as const};const data={...initialData,records:[row('memory',[photo]),row('source',[source])]};
 assert.equal(deleteAlbumMedia(data,['photo']).data,data);assert.equal(deleteAlbumMedia(data,['photo']).removed.length,0);
});
test('tombstones survive restart and remove replayed attachments from data, review and chat',()=>{
 const data=deleteAlbumMedia({...initialData,records:[row('picture',[photo])]},['photo']).data;
 const replay=applyMediaDeletions({...JSON.parse(JSON.stringify(data)),records:[row('stale',[photo],'保留文字')]});
 assert.deepEqual(allMedia(replay),[]);assert.equal(replay.records[0].note,'保留文字');
 const chat=withoutConversationMedia({messages:[{id:'message',attachments:[photo],acceptedRecords:[row('accepted',[photo],'保留回执')]}],drafts:[row('draft',[photo])]},data.deletedMediaIds!);
 assert.deepEqual(conversationMedia(chat),[]);assert.equal(chat.messages[0].acceptedRecords?.[0].note,'保留回执');assert.equal(chat.drafts.length,0);
 // A failed cleanup remains retryable even though the album entry is already gone.
 assert.deepEqual(deleteAlbumMedia(replay,['photo']).data.mediaDeletionPending,[photo]);
});
test('cleanup preserves shared Live Photo videos and cross-profile accepted receipt attachments',()=>{
 assert.deepEqual(unownedMedia([photo,video],[photo.livePhoto!]).map(a=>a.id),['photo','video']);
 assert.ok(unownedMedia([photo],[]).every(a=>!a.livePhoto));
 const anotherBaby={messages:[{acceptedRecords:[row('shared',[photo])]}],drafts:[]};
 assert.deepEqual(unownedMedia([photo,video],conversationMedia(anotherBaby)).map(a=>a.id),['video']);
});
