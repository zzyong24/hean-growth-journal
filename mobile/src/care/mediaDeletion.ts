import {type AppData,type Attachment,type CareRecord,validateRecord} from '../domain';
type MediaOwner={attachments?:Attachment[]};
type ConversationMedia={messages:(MediaOwner&{acceptedRecords?:CareRecord[]})[];drafts:CareRecord[]};
export function conversationMedia(chat:ConversationMedia):Attachment[]{
 return [...chat.messages,...chat.messages.flatMap(m=>m.acceptedRecords||[]),...chat.drafts].flatMap(m=>m.attachments||[]);
}
export function unownedMedia(pending:Attachment[],owners:Attachment[]):Attachment[]{
 const owned=new Set(owners.flatMap(a=>[a.id,...(a.livePhoto?[a.livePhoto.id]:[])]));
 return [...new Map(pending.flatMap(a=>[a,...(a.livePhoto?[a.livePhoto]:[])]).filter(a=>!owned.has(a.id)).map(a=>[a.id,{...a,livePhoto:undefined}])).values()];
}
export function allMedia(data:AppData):Attachment[]{
 const owners:MediaOwner[]=[...data.records,...(data.reviewQueue||[]),...(data.reviewQueue||[]).flatMap(x=>x.proposedRecords||[]),...(data.lastBottleFeed?[data.lastBottleFeed.record]:[]),...(data.bottleHistory||[]).flatMap(h=>h.record?[h.record]:[])];
 return owners.flatMap(x=>(x.attachments||[]).flatMap(a=>[a,...(a.livePhoto?[a.livePhoto]:[])]));
}
export function withoutMedia<T extends MediaOwner>(owner:T,deleted:ReadonlySet<string>):T{
 if(!owner.attachments?.some(a=>deleted.has(a.id)||a.livePhoto&&deleted.has(a.livePhoto.id)))return owner;
 return {...owner,attachments:owner.attachments.filter(a=>!deleted.has(a.id)).map(a=>a.livePhoto&&deleted.has(a.livePhoto.id)?{...a,livePhoto:undefined}:a)};
}
export function withoutMediaRecords(records:CareRecord[],deleted:ReadonlySet<string>):CareRecord[]{
 return records.map(r=>withoutMedia(r,deleted)).filter(r=>validateRecord(r));
}
/** Tombstones prevent old chat drafts and voice receipts from restoring deleted media. */
export function applyMediaDeletions(data:AppData):AppData{
 if(!data.deletedMediaIds?.length)return data;
 const deleted=new Set(data.deletedMediaIds);
 return {...data,records:withoutMediaRecords(data.records,deleted),
  reviewQueue:data.reviewQueue?.map(r=>({...withoutMedia(r,deleted),proposedRecords:r.proposedRecords&&withoutMediaRecords(r.proposedRecords,deleted)})),
  lastBottleFeed:data.lastBottleFeed?{...data.lastBottleFeed,record:withoutMedia(data.lastBottleFeed.record,deleted)}:undefined,
  bottleHistory:data.bottleHistory?.map(h=>({...h,record:h.record?withoutMedia(h.record,deleted):undefined}))};
}
export function deleteAlbumMedia(data:AppData,ids:string[]):{data:AppData;removed:Attachment[]}{
 const all=allMedia(data),protectedIds=new Set(all.filter(a=>a.role==='source').map(a=>a.id));
 const selected=new Set(ids.filter(id=>!protectedIds.has(id)));
 const removed=[...new Map(data.records.flatMap(r=>r.attachments||[]).filter(a=>selected.has(a.id)&&a.type!=='audio').map(a=>[a.id,a])).values()];
 if(!removed.length)return {data,removed};
 return {data:applyMediaDeletions({...data,mediaDeletionPending:[...new Map([...(data.mediaDeletionPending||[]),...removed].map(a=>[a.id,a])).values()],deletedMediaIds:[...new Set([...(data.deletedMediaIds||[]),...removed.map(a=>a.id)])]}),removed};
}
export function withoutConversationMedia<T extends ConversationMedia>(chat:T,ids:string[]):T{
 const deleted=new Set(ids);if(!deleted.size)return chat;
 return {...chat,messages:chat.messages.map(m=>({...withoutMedia(m,deleted),acceptedRecords:m.acceptedRecords&&withoutMediaRecords(m.acceptedRecords,deleted)})),drafts:withoutMediaRecords(chat.drafts,deleted)};
}
