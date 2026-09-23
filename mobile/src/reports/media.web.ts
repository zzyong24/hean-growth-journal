import {Attachment} from '../domain';import {attachmentURI,releaseURI} from '../attachmentStorage';
export async function reportImage(a:Attachment){
 const uri=await attachmentURI(a);let video:HTMLVideoElement|undefined;
 try{
 let source:CanvasImageSource;
 if(a.type==='video'){
 video=document.createElement('video');video.muted=true;video.preload='auto';video.src=uri;
 await new Promise<void>((resolve,reject)=>{const t=setTimeout(()=>reject(new Error('VIDEO_TIMEOUT')),10000);video!.onloadeddata=()=>{clearTimeout(t);resolve()};video!.onerror=()=>{clearTimeout(t);reject(new Error('VIDEO_UNAVAILABLE'))}});source=video;
 }else{const img=new Image();await new Promise<void>((resolve,reject)=>{img.onload=()=>resolve();img.onerror=reject;img.src=uri});source=img;}
 const width=video?video.videoWidth:(source as HTMLImageElement).naturalWidth,height=video?video.videoHeight:(source as HTMLImageElement).naturalHeight;
 const canvas=document.createElement('canvas');canvas.width=Math.min(width,960);canvas.height=height*canvas.width/width;canvas.getContext('2d')!.drawImage(source,0,0,canvas.width,canvas.height);return {data:canvas.toDataURL('image/jpeg',0.8),width:canvas.width,height:canvas.height};
 }finally{if(video){video.pause();video.removeAttribute('src');video.load();}releaseURI(uri);}
}
