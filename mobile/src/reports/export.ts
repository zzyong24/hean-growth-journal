import {renderPosterPNG} from './renderPNG';
import {File,Paths} from 'expo-file-system';import * as Library from 'expo-media-library/legacy';import * as Sharing from 'expo-sharing';
export async function exportReport(xml:string,height:number,ref:any,action:'save'|'share',name:string){
 const base64=await renderPosterPNG(ref);
 const file=new File(Paths.cache,name+'.png');file.write(base64,{encoding:'base64'});
 try{if(action==='save'){const p=await Library.requestPermissionsAsync(true);if(!p.granted)throw new Error('PHOTO_PERMISSION');await Library.saveToLibraryAsync(file.uri);}else{if(!await Sharing.isAvailableAsync())throw new Error('SHARE_UNAVAILABLE');await Sharing.shareAsync(file.uri,{mimeType:'image/png',UTI:'public.png'});}}finally{if(file.exists)file.delete();}
}
