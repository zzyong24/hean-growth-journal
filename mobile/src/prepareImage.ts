import {ImageManipulator,SaveFormat} from 'expo-image-manipulator';
import {imagePayload} from './imagePayload';
export async function prepareImage(uri:string){
 const context=ImageManipulator.manipulate(uri);
 const original=await context.renderAsync();
 const largest=Math.max(original.width,original.height);
 if(largest>2400)context.resize(original.width>=original.height?{width:2400,height:null}:{height:2400,width:null});
 const rendered=await context.renderAsync();
 const result=await rendered.saveAsync({format:SaveFormat.JPEG,compress:0.9,base64:true});
 return {uri:result.uri,mime:'image/jpeg',data:imagePayload(result.base64||'')};
}
