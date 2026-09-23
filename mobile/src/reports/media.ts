import {Attachment} from '../domain';
import {attachmentURI,releaseURI} from '../attachmentStorage';
import {ImageManipulator,SaveFormat} from 'expo-image-manipulator';
import {createVideoPlayer} from 'expo-video';
import {File} from 'expo-file-system';
export async function reportImage(a:Attachment){
 const uri=await attachmentURI(a);let player:ReturnType<typeof createVideoPlayer>|undefined;
 try{
 let source:any=uri;
 if(a.type==='video'){player=createVideoPlayer(null);await player.replaceAsync(uri);source=(await player.generateThumbnailsAsync([0],{maxWidth:960,maxHeight:960}))[0];}
 const context=ImageManipulator.manipulate(source);context.resize({width:960});
 const rendered=await context.renderAsync();const result=await rendered.saveAsync({format:SaveFormat.JPEG,compress:0.8,base64:true});
 const data='data:image/jpeg;base64,'+result.base64;new File(result.uri).delete();rendered.release();context.release();return {data,width:result.width,height:result.height};
 }finally{player?.release();releaseURI(uri);}
}
