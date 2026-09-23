import {NativeModules,Platform} from 'react-native';
import {AudioModule} from 'expo-audio';
import * as Picker from 'expo-image-picker';
import * as Library from 'expo-media-library/legacy';
export type CapturedAsset=Picker.ImagePickerAsset & {liveMovieURI?:string;capturedAt?:string};
export type CaptureResult=Picker.ImagePickerResult & {savedToLibrary?:boolean};
export async function capture(mode:'camera'|'video'):Promise<CaptureResult>{
 if(Platform.OS==='ios'&&mode==='camera'){
  if(!NativeModules.HeanCamera)throw new Error('CAMERA_UPDATE_REQUIRED');
  // Live Photos may include audio; denied microphone access still allows photography.
  await AudioModule.requestRecordingPermissionsAsync();
  return NativeModules.HeanCamera.capture();
 }
 const result=await Picker.launchCameraAsync({mediaTypes:mode==='video'?['videos']:['images'],quality:1,cameraType:Picker.CameraType.back,videoMaxDuration:60});
 if(result.canceled||Platform.OS==='web')return result;
 let saved=false;
 try{const p=await Library.requestPermissionsAsync(true);if(p.granted){for(const a of result.assets)await Library.saveToLibraryAsync(a.uri);saved=true;}}catch{}
 return {...result,savedToLibrary:saved};
}
