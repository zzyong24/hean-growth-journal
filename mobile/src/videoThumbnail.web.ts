import {Attachment} from './domain';
import {attachmentURI,releaseURI} from './attachmentStorage.web';
export async function videoThumbnail(a:Attachment){
 const uri=await attachmentURI(a),video=document.createElement('video');
 try{return await new Promise<string>((resolve,reject)=>{
  const timer=setTimeout(()=>{video.src='';reject(new Error('VIDEO_TIMEOUT'))},10000);
  video.muted=true;video.preload='auto';video.onloadeddata=()=>{try{const c=document.createElement('canvas');c.width=320;c.height=320*video.videoHeight/video.videoWidth;c.getContext('2d')!.drawImage(video,0,0,c.width,c.height);clearTimeout(timer);resolve(c.toDataURL('image/jpeg',0.8));}catch(e){clearTimeout(timer);reject(e)}};video.onerror=()=>{clearTimeout(timer);reject(new Error('VIDEO_UNAVAILABLE'))};video.src=uri;
 });}finally{video.src='';releaseURI(uri);}
}
