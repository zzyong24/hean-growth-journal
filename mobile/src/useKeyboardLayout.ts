import {useEffect,useState} from 'react';
import {Dimensions,Keyboard,Platform} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {keyboardInset} from './keyboardInset';
export function useKeyboardLayout(){
 const safe=useSafeAreaInsets();const [inset,setInset]=useState(0);
 useEffect(()=>{
  const frame=Keyboard.addListener(Platform.OS==='ios'?'keyboardWillChangeFrame':'keyboardDidShow',e=>setInset(keyboardInset(Dimensions.get('screen').height,e.endCoordinates.screenY,safe.bottom)));
  const hide=Keyboard.addListener(Platform.OS==='ios'?'keyboardWillHide':'keyboardDidHide',()=>setInset(0));
  return()=>{frame.remove();hide.remove()};
 },[safe.bottom]);
 return {keyboardOpen:inset>0,inset:Platform.OS==='ios'?inset:0};
}
