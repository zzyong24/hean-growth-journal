import {File,Paths} from 'expo-file-system';
import {createVideoPlayer} from 'expo-video';
import {ImageManipulator,SaveFormat} from 'expo-image-manipulator';
import {Attachment} from './domain';
import {attachmentURI} from './attachmentStorage';
let queue:Promise<unknown>=Promise.resolve();
const pending=new Map<string,Promise<string>>();
export function videoThumbnail(a:Attachment):Promise<string>{
 const file=new File(Paths.cache,`hean-video-${a.id}.jpg`);
 if(file.exists)return Promise.resolve(file.uri);
 const existing=pending.get(a.id);if(existing)return existing;
 const task=queue.catch(()=>{}).then(async()=>{
  const player=createVideoPlayer(null);
  try{
   await player.replaceAsync(await attachmentURI(a));
   const frame=(await player.generateThumbnailsAsync([0],{maxWidth:480,maxHeight:480}))[0];
   if(!frame)throw new Error('NO_VIDEO_FRAME');
   const context=ImageManipulator.manipulate(frame);
   try{const rendered=await context.renderAsync();try{const saved=await rendered.saveAsync({format:SaveFormat.JPEG,compress:0.8});const source=new File(saved.uri);source.move(file);return file.uri;}finally{rendered.release();}}finally{context.release();}
  }finally{player.release();pending.delete(a.id);}
 });
 pending.set(a.id,task);queue=task;return task;
}
