import React from 'react';
import {ScrollView,View} from 'react-native';
/** Chat has a bounded viewport; document pages have their own scroll surface. */
export function PageBody({fixed,wide,scrollRef,children}:{fixed:boolean;wide:boolean;scrollRef:React.RefObject<ScrollView|null>;children:React.ReactNode}){
 if(fixed)return <View style={{flex:1,minHeight:0,padding:wide?32:16,paddingBottom:8}}>{children}</View>;
 return <ScrollView ref={scrollRef} keyboardShouldPersistTaps="handled" style={{flex:1}} contentContainerStyle={{padding:wide?32:22,paddingBottom:32}}>{children}</ScrollView>;
}
