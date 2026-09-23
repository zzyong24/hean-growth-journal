import {Text,VStack,HStack,Link} from '@expo/ui/swift-ui';
import {font,foregroundStyle,widgetURL,containerBackground,padding,background,cornerRadius} from '@expo/ui/swift-ui/modifiers';
import {createWidget,type WidgetEnvironment} from 'expo-widgets';
type Props={name:string;summary:string;last:string;next:string;url:string;stamp:string;zh?:boolean;nursingURL?:string;nursing?:string};
const view=(props:Props,environment:WidgetEnvironment)=>{
 'widget';
 const zh=props.zh!==false;
 return <VStack modifiers={[widgetURL(props.url),containerBackground('#f7f5ea','widget')]}>
  <Text modifiers={[font({size:13,weight:'medium'}),foregroundStyle('#56745c')]}>{props.name}</Text>
  <Text modifiers={[font({size:20,weight:'bold'}),foregroundStyle('#33493a')]}>{zh?'快速记录':'Quick log'}</Text>
  {environment.widgetFamily!=='accessoryRectangular'&&<>
   <Text modifiers={[font({size:11}),foregroundStyle('#7b8177')]}>{environment.widgetFamily==='systemMedium'?(props.nursing||props.last):props.last}</Text>
   {environment.widgetFamily==='systemMedium'?<HStack>
    <Link destination={props.url} modifiers={[padding({all:12}),background('#dfe8d8'),cornerRadius(16)]}><Text modifiers={[font({size:14,weight:'semibold'}),foregroundStyle('#45614a')]}>{zh?'＋ 记一笔':'＋ Log'}</Text></Link>
    <Link destination={props.nursingURL||props.url} modifiers={[padding({all:12}),background('#f1dfd2'),cornerRadius(16)]}><Text modifiers={[font({size:14,weight:'semibold'}),foregroundStyle('#936247')]}>{zh?'亲喂计时':'Nursing timer'}</Text></Link>
   </HStack>:<Text modifiers={[padding({all:10}),background('#dfe8d8'),cornerRadius(16),font({size:15,weight:'semibold'}),foregroundStyle('#45614a')]}>{zh?'＋ 记一笔':'＋ Log'}</Text>}
  </>}
 </VStack>;
};
export default createWidget('BabyToday',view);
