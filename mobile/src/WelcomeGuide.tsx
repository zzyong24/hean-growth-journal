import React,{useState,useEffect} from 'react';
import {View,Linking,Platform} from 'react-native';
import {AppData,Settings} from './domain';
import {Sheet,Button,Txt,Art,useUI} from './ui';
import {permission} from './reminders/native';
export function VoiceSetup({data,onSettings,onNotice}:{data:AppData;onSettings:(s:Settings)=>void;onNotice:(s:string)=>void}){
 const zh=data.settings.language==='zh';
 return <View style={{gap:16}}>
 <Txt>{zh?'先在 iPhone 设置里开启 Siri 的语音唤醒。这里通过 Siri 或系统的人声快捷指令记一笔。':'Enable voice activation in iPhone Siri settings. Use Siri or Vocal Shortcuts to log.'}</Txt>
 <Button label={data.settings.voiceQuickRecord?(zh?'快速记录已开启 · 关闭':'Quick logging on · Disable'):(zh?'启用 Siri 快速记录':'Enable Siri quick logging')} onPress={()=>onSettings({...data.settings,voiceQuickRecord:!data.settings.voiceQuickRecord})}/>
 <Txt>{zh?'① 打开快捷指令，找到「禾安成长日记」的「宝宝记一笔」。新建快捷指令，添加这个动作，记录内容设为「每次询问」，名称填「宝宝记一笔」。':'① In Shortcuts, find 禾安成长日记 → 宝宝记一笔. Add the action to a shortcut named Baby log and set its text to Ask Each Time.'}</Txt>
 <Button secondary label={zh?'打开快捷指令':'Open Shortcuts'} onPress={()=>Platform.OS==='ios'?Linking.openURL('shortcuts://').catch(()=>onNotice(zh?'请在 iPhone 打开快捷指令 App':'Open Shortcuts on your iPhone')):onNotice(zh?'请在 iPhone 安装版中配置 Siri':'Configure Siri in the installed iPhone app')}/>
 <Txt>{zh?'② 说「嘿 Siri，宝宝记一笔」，听到询问后说「刚喝了90毫升，十分钟前换了尿布」。先测试一次，并在记录页核对结果。':'② Say “Hey Siri, Baby log”, then dictate “Drank 90 ml, changed a diaper ten minutes ago.” Test once and check the timeline.'}</Txt>
 <Txt>{zh?'③ 想用自己的短语：iPhone 设置 → 辅助功能 → 人声快捷指令，选择刚才的快捷指令，按系统提示录入「宝宝记一下」。锁屏是否需要解锁，以系统提示为准。':'③ For a custom phrase, open Settings → Accessibility → Vocal Shortcuts and select your shortcut. Follow the system prompts. Unlocking may be required.'}</Txt>
 <Txt>{zh?'明确事件会自动保存，含糊内容留待核对。AI 解析需要联网；失败不会算作已记录。':'Clear events save automatically; ambiguous input needs review. AI parsing needs connectivity; failed requests are not marked as saved.'}</Txt>
 </View>;
}
export function WelcomeGuide({data,visible,onClose,onUpdate}:{data:AppData;visible:boolean;onClose:()=>void;onUpdate:(fn:(d:AppData)=>AppData)=>Promise<boolean>}){
 const {lang,c}=useUI(),zh=lang==='zh';const [step,setStep]=useState(0),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false);
 useEffect(()=>{if(visible){setStep(0);setNotice('')}},[visible]);
 async function finish(){setBusy(true);if(await onUpdate(d=>({...d,settings:{...d.settings,onboardingVersion:1}})))onClose();else setNotice(zh?'未能保存，请重试':'Could not save. Try again.');setBusy(false)}
 return <Sheet visible={visible} title={(zh?['一句话，记住小日常','不用点开 App，也能记','把提醒和概况放在手边']:['Capture little days','Log with your voice','Keep care close'])[step]} onClose={finish}>
 <View style={{gap:18}}><Txt size={12} color={c.muted}>{step+1} / 3</Txt>
 {step===0?<><View style={{alignItems:'center'}}><Art name="baby" size={90}/></View><Txt>{zh?'试着说：「刚喝了90毫升奶，换了尿布。」明确的事件会自动保存，不用再点确认；一句话可以整理多条记录；说「上一顿改成75毫升」可以纠正上一条。':'Try “Drank 90 ml and changed a diaper.” One message can capture multiple events. Say “Change the last feed to 75 ml” to correct it.'}</Txt><Txt>{zh?'文字或录音都可以，也能带上照片、视频。拍下纸质记录，AI 会帮你整理补录；模糊的数字需要核对。':'Type, speak, or attach photos and videos. Photograph a paper log to import it; unclear numbers need review.'}</Txt><Txt>{zh?'今天负责对话，记录查看时间线、趋势和海报；创作保存艺术照，宝宝管理档案和成长相册。':'Today is for chat. Records holds your timeline, trends and posters. Create keeps portraits; Baby holds profiles and the growth album.'}</Txt></>:step===1?<VoiceSetup data={data} onSettings={settings=>{void onUpdate(d=>({...d,settings}))}} onNotice={setNotice}/>:<><Txt>{zh?'在「记录 → 时间线 → 日历提醒」设置每天或间隔提醒。通知权限由你决定，现在也可以跳过。':'Set daily or interval reminders in Records → Timeline → Calendar reminders. Permission is optional.'}</Txt><Button secondary label={zh?'允许通知':'Allow notifications'} onPress={async()=>{try{const ok=await permission(true);setNotice(ok?(zh?'通知已允许，可在日历中添加提醒':'Notifications allowed. Add reminders in the calendar.'):(zh?'暂未允许，可稍后在系统设置中开启':'Not allowed. You can enable it in system settings later.'))}catch{setNotice(zh?'请稍后在系统设置中开启通知':'Enable notifications in system settings later.')}}}/><Txt>{zh?'小组件：长按桌面空白处 → 编辑 → 添加小组件 → 搜索「禾安成长日记」。锁屏长按后也可以自定添加。':'Widgets: long press the Home Screen → Edit → Add Widget → 禾安成长日记. You can also customize the Lock Screen.'}</Txt></>}
 {!!notice&&<Txt color={c.primary}>{notice}</Txt>}
 <Button disabled={busy} label={step===2?(zh?'开始记录':'Start logging'):(zh?'下一步':'Next')} onPress={()=>step===2?finish():(setNotice(''),setStep(step+1))}/>
 {step>0&&<Button secondary label={zh?'上一步':'Back'} onPress={()=>{setNotice('');setStep(step-1)}}/>}
 {step<2&&<Button secondary disabled={busy} label={zh?'稍后再看':'Later'} onPress={finish}/>}
 </View></Sheet>;
}
