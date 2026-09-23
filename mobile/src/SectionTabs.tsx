import React from "react";
import {View, Pressable} from "react-native";
import {Txt, useUI} from "./ui";
export function SectionTabs<T extends string>({value,onChange,items}:{value:T;onChange:(value:T)=>void;items:readonly {value:T;label:string}[]}) {
 const {c}=useUI();
 return <View style={{flexDirection:"row",backgroundColor:c.tint,borderRadius:16,padding:4,marginVertical:16,gap:4}}>{items.map(item=><Pressable key={item.value} accessibilityRole="tab" accessibilityState={{selected:value===item.value}} onPress={()=>onChange(item.value)} style={{flex:1,minHeight:44,alignItems:"center",justifyContent:"center",borderRadius:12,backgroundColor:value===item.value?c.surface:"transparent",paddingHorizontal:8}}><Txt size={14} weight={value===item.value?"600":"400"} color={value===item.value?c.primary:c.muted}>{item.label}</Txt></Pressable>)}</View>;
}
