import {File,Paths} from 'expo-file-system';
import {Dimensions,Keyboard} from 'react-native';
const samples:unknown[]=[];
/** Numeric layout only; no messages, baby identifiers or media. Local, never uploaded. */
export function writeLayoutDiagnostic(frame:{x:number;y:number;width:number;height:number;busy:boolean}) {
 try {
  samples.push({at:new Date().toISOString(),...frame,window:Dimensions.get('window'),screen:Dimensions.get('screen'),keyboard:Keyboard.metrics()});
  if(samples.length>80)samples.shift();
  new File(Paths.cache,'composer-layout.json').write(JSON.stringify(samples));
 } catch { /* Diagnostics must never disrupt input. */ }
}
