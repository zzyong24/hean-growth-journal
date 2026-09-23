import {writeLayoutDiagnostic} from "./layoutDiagnostic";
import {messageTime} from './messageTime';
import { TodayOverview } from "./AnalyticsView";
import { AttachmentView } from "./AttachmentView";
import { AppTextInput } from "./controls";
import React, { useEffect, useState, useRef } from "react";
import {
  View,
  ScrollView,
  useWindowDimensions,
  TextInput,
  Pressable,
  Image,
  ActivityIndicator, Linking,
} from "react-native";
import {
  Sparkles,
  Check,
  X,
  AudioLines,
  Square,
  Plus,
  Mic,
  ArrowUp,
  Moon,
  ArrowLeft,
  Clock,
  Camera,
  Video,
  Baby,
  Keyboard,
  MinusCircle,
} from "lucide-react-native";
import { AppData, CareRecord, Kind, statsForDay } from "./domain";
import { Capabilities, Media } from "./api";
import {
  Txt,
  Heading,
  Art,
  CareIcon,
  Button,
  IconButton,
  RecordRow,
  icons,
  layout,
  useUI,
} from "./ui";
type Props = {
  data: AppData;
  date: string;
  wide: boolean;
  age: number | null;
  onCancelAI: () => void;
  messages: { at?:string; sleepStarted?:string; acceptedRecords?: CareRecord[]; nursingStarted?: AppData["nursingSession"]; id: string; role: "user" | "assistant"; text: string; sources?: {id:string;title:string;url:string}[]; attachments?: NonNullable<CareRecord["attachments"]> }[];
  onPreview: (a:NonNullable<CareRecord["attachments"]>[number])=>void;
  caps: Capabilities;
  pendingSleep?:string;
  pendingNursing?:AppData["nursingSession"];
  drafts: CareRecord[];
  media: Media | null;
  recording: {
    isRecording: boolean;
    durationMillis: number;
    metering?: number;
  };
  input: string;
  busy: string;
  saving: boolean;
  recent: React.ReactNode;
  savedVersion: number;
  confirmDrafts: () => void;
  setDrafts: (r: CareRecord[]) => void;
  setEditor: (e: {
    record: CareRecord;
    mode: "draft" | "saved" | "new";
  }) => void;
  setMedia: (m: Media | null) => void;
  withConsent: (f: () => void) => void;
  runASR: (m: Media) => void;
  finishRecording: () => void;
  cancelRecording: () => void;
  setInput: (s: string) => void;
  setAttachments: (b: boolean) => void;
  beginRecording: (p: "speech" | "sound") => void;
  sendText: (s?: string) => void;
  newRecord: (k: Kind) => void;
  toggleSleep: () => void;
  cancelSleep: () => void;
  onTrends: () => void;
};
export function TodayView(p: Props) {
  const {
    data,
    wide,
    age,
    messages,
    onCancelAI,
    caps,
    drafts,
    media,
    recording,
    input,
    busy,
    saving,
    recent,
    confirmDrafts,
    setDrafts,
    setEditor,
    setMedia,
    withConsent,
    runASR,
    finishRecording,
    cancelRecording,
    setInput,
    setAttachments,
    beginRecording,
    sendText,
    newRecord,
    toggleSleep,
    cancelSleep,
    onTrends,
  } = p;
  const { c, t, lang } = useUI();
  const stats = statsForDay(data.records);
  const { height: screenHeight } = useWindowDimensions();
  const [visibleCount, setVisibleCount] = React.useState(30);
  const [waitingSeconds,setWaitingSeconds]=useState(0);
  useEffect(()=>{
    setWaitingSeconds(0);if(!busy)return;
    const started=Date.now();const timer=setInterval(()=>setWaitingSeconds(Math.floor((Date.now()-started)/1000)),1000);
    return()=>clearInterval(timer);
  },[busy]);
  const chatScroll = useRef<ScrollView>(null);

  const composerRef=useRef<View>(null);
  const measureComposer=()=>composerRef.current?.measureInWindow((x,y,width,height)=>writeLayoutDiagnostic({x,y,width,height,busy:!!busy}));
  useEffect(()=>{const timer=setTimeout(measureComposer,350);return()=>clearTimeout(timer);},[busy,input.length===0]);
  const [levels, setLevels] = useState<number[]>([]);
  useEffect(() => {
    if (recording.isRecording)
      setLevels((prev) => [
        ...prev.slice(-35),
        Math.max(0.06, Math.min(1, ((recording.metering ?? -60) + 60) / 60)),
      ]);
    else setLevels([]);
  }, [recording.durationMillis]);
  const composer = (
    <View
      style={{
        backgroundColor: c.surface,
        borderRadius: 22,
        borderWidth: 1,
        borderColor: c.line,
        padding: 6,
        flexShrink:0,
        boxShadow: "0 3px 12px #785b3710",
      }}
    >
      {media && (
        <View
          style={[
            layout.row,
            {
              paddingBottom: 14,
              marginBottom: 8,
              borderBottomWidth: 1,
              borderColor: c.line,
            },
          ]}
        >
          <Pressable accessibilityRole="button" accessibilityLabel={t.photoLabel} disabled={!media.attachment} onPress={()=>media.attachment&&p.onPreview(media.attachment)} style={{minWidth:52,minHeight:52,alignItems:"center",justifyContent:"center"}}>
          {media.type === "image" ? (
            <Image
              source={{ uri: media.uri }}
              style={{ width: 52, height: 52, borderRadius: 10 }}
            />
          ) : (
            media.type === "video" ? <Video size={28} color={c.primary}/> : <AudioLines size={26} color={c.primary} />
          )}
          </Pressable>
          <View style={{ flex: 1 }}>
            <Txt size={13}>
              {media.type === "image"
                ? t.photoLabel
                : media.type === "video"
                  ? t.videoLabel
                  : t.audioLabel}
            </Txt>
            <Txt size={10} color={c.muted}>
              {t.mediaLocal}
            </Txt>
            {media.type === "audio" && caps.asr && (
              <Pressable
                accessibilityRole="button"
                onPress={() => withConsent(() => runASR(media))}
              >
                <Txt size={12} color={c.primary}>
                  {t.useText}
                </Txt>
              </Pressable>
            )}
          </View>
          <IconButton
            label={t.remove}
            icon={X}
            onPress={() => setMedia(null)}
            disabled={!!busy}
          />
        </View>
      )}
      <View style={{flexDirection:"row",alignItems:"center",gap:2}}>
      <IconButton label={t.voice} icon={Mic} onPress={()=>beginRecording("speech")} disabled={!!busy}/>
      <View style={{flex:1,minWidth:0}}>
      <AppTextInput
        accessibilityLabel={t.placeholder}
        onFocus={()=>requestAnimationFrame(()=>chatScroll.current?.scrollToEnd({animated:true}))}
        value={input}
        onChangeText={setInput}
        placeholder={drafts.length ? (lang === "zh" ? "继续补充，或告诉我哪里需要修改…" : "Add details or tell me what to change…") : (lang==="zh"?"发消息，记下宝宝日常…":"Message about your baby…")}
        placeholderTextColor={c.muted}
        multiline
        maxLength={8000}
        editable={true}
        style={{
          fontSize: 16,
          lineHeight: 26,
          color: c.ink,
          minHeight: 36,
          borderWidth: 0,
          outlineWidth: 0,
          maxHeight: 88,
          textAlignVertical: "top",
          padding: 0,
        }}
      />
      </View>
      <IconButton label={t.attachment} icon={Plus} onPress={()=>setAttachments(true)} disabled={!!busy}/>
      {busy?<IconButton label={lang==="zh"?"停止回复":"Stop reply"} icon={Square} onPress={onCancelAI} active/>:(!!input.trim()||!!media)&&<IconButton label={t.send} icon={ArrowUp} onPress={()=>sendText()} active/>}
      </View>
    </View>
  );
  if (recording.isRecording)
    return (
      <View
        style={{
          maxWidth: 470,
          width: "100%",
          alignSelf: "center",
          gap: 26,
          paddingVertical: 8,
        }}
      >
        <View style={layout.between}>
          <IconButton
            label={t.cancel}
            icon={ArrowLeft}
            onPress={cancelRecording}
          />
          <Txt>{t.voice}</Txt>
          <View style={{ width: 44 }} />
        </View>
        <View style={{ alignItems: "center", gap: 9, marginTop: 20 }}>
          <Heading size={34}>{t.sayOnce}</Heading>
          <Txt color={c.muted} size={14} style={{ textAlign: "center" }}>
            {t.speechGuide}
          </Txt>
        </View>
        <View style={{ alignItems: "center", paddingVertical: 20, gap: 17 }}>
          <View
            style={{
              position: "relative",
              alignItems: "center",
              justifyContent: "center",
              height: 85,
              width: 190,
            }}
          >
            <Art
              name="botanical"
              size={70}
              style={{ position: "absolute", left: 0, top: 5, opacity: 0.65 }}
            />
            <Mic size={52} color={c.primary} strokeWidth={1.3} />
          </View>
          <View
            style={{
              height: 54,
              flexDirection: "row",
              gap: 3,
              alignItems: "center",
              justifyContent: "center",
              width: "100%",
            }}
          >
            {levels.map((value, i) => (
              <View
                key={i}
                style={{
                  width: 3,
                  height: Math.max(3, value * 54),
                  backgroundColor: c.primary,
                  borderRadius: 2,
                }}
              />
            ))}
          </View>
          <Txt size={43} color={c.primary} weight="300">
            {String(Math.floor(recording.durationMillis / 60000)).padStart(
              2,
              "0",
            )}
            :
            {String(Math.floor(recording.durationMillis / 1000) % 60).padStart(
              2,
              "0",
            )}
          </Txt>
          <Txt color={c.muted}>{t.recording}</Txt>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t.stop}
            onPress={finishRecording}
            style={{
              width: 76,
              height: 76,
              borderRadius: 38,
              backgroundColor: c.primary,
              alignItems: "center",
              justifyContent: "center",
              marginTop: 16,
            }}
          >
            <Square size={28} fill="#FFFCF7" color="#FFFCF7" />
          </Pressable>
          <Txt color={c.primary}>{t.stop}</Txt>
          <Txt color={c.muted} size={12}>
            {t.afterRecord}
          </Txt>
        </View>
        <Button
          label={t.typeInstead}
          icon={Keyboard}
          secondary
          onPress={cancelRecording}
        />
        <Txt color={c.muted} size={12} style={{ textAlign: "center" }}>
          {t.voiceOnly}
        </Txt>
      </View>
    );
  const draftCards = drafts.length || p.pendingNursing || p.pendingSleep ? (
    <View
      style={{
        backgroundColor: c.tint,
        borderRadius: 18,
        padding: 14,
        gap: 10,
        marginBottom: 16,
      }}
    >
      <Txt size={13} color={c.primary}>
        {lang === "zh" ? "尚未保存" : "Not saved"} · {drafts.length}
      </Txt>
      {p.pendingSleep&&<Txt>{lang==='zh'?'睡眠开始 · 等待保存':'Sleep start · Not saved'}</Txt>}
      {p.pendingNursing&&<Txt>{lang==='zh'?'亲喂开始 · 等待保存':'Nursing start · Not saved'}</Txt>}
      {drafts.map((r) => (
        <View key={r.id}>
          <Txt size={11} color={c.primary}>{r.targetRecordId ? (lang === "zh" ? "更新原记录" : "Update existing record") : (lang === "zh" ? "新增记录" : "New record")}</Txt>
          <RecordRow
            record={r}
            onPress={() => setEditor({ record: r, mode: "draft" })}
          />
          {r.attachments?.map((a) => (
            <AttachmentView key={a.id} attachment={a} compact />
          ))}
        </View>
      ))}
      <Txt size={12} color={c.muted}>
        {t.chatDraftHint}
      </Txt>
      <Button
        label={`${lang === "zh" ? "保存记录" : "Save records"} · ${drafts.length}`}
        onPress={confirmDrafts}
        disabled={saving || !!busy}
      />
      <Pressable
        accessibilityRole="button"
        onPress={() => setDrafts([])}
        style={{ padding: 10, alignItems: "center" }}
      >
        <Txt size={12} color={c.muted}>
          {t.discard}
        </Txt>
      </Pressable>
    </View>
  ) : null;
  return (
    <View style={{ flex:1,minHeight:0,position:"relative",overflow:"hidden" }}>
      <View style={{flexShrink:0}}>
        <View style={[layout.row, { gap:12,alignItems:"center" }]}>
          <View style={{width:112,flexDirection:"row",alignItems:"center",gap:6}}><Art name="baby" size={32} />
          <View style={{flex:1}}><Txt weight="500" size={16}>{data.profile.name}</Txt><Txt color={c.muted} size={12}>{age} {t.day}</Txt></View></View>
          <TodayOverview data={data} onOpen={onTrends} />
        </View>
        {data.sleepStart && <View style={[layout.between,{gap:8}]}>
          <Txt size={12} color={c.primary}>{t.sleeping} · {Math.floor((Date.now()-Date.parse(data.sleepStart))/60000)} {t.minutes}</Txt>
          <View style={{width:120}}><Button label={t.sleepEnd} small secondary onPress={toggleSleep} disabled={saving}/></View>
          <IconButton label={t.cancelSleep} icon={X} onPress={cancelSleep}/>
        </View>}
      </View>
      <View style={{flex:1,minHeight:0,marginTop:12,marginBottom:10,overflow:"hidden"}}>
        <ScrollView ref={chatScroll} onLayout={()=>requestAnimationFrame(()=>chatScroll.current?.scrollToEnd({animated:false}))} nestedScrollEnabled keyboardShouldPersistTaps="handled"
          style={{flex:1,minHeight:0}} contentContainerStyle={{gap:12,paddingBottom:4}}
          onContentSizeChange={()=>chatScroll.current?.scrollToEnd({animated:true})}>
          {!messages.length && <View style={{paddingVertical:20,gap:8}}>
            <Heading size={20}>{t.whatHappened}</Heading><Txt color={c.muted} size={13}>{t.tellMe}</Txt>
          </View>}
          {messages.length>visibleCount && <Pressable onPress={()=>setVisibleCount(n=>n+30)}><Txt color={c.primary}>{lang==="zh"?"查看更早对话":"Earlier messages"}</Txt></Pressable>}
          {messages.slice(-visibleCount).map(m=><View key={m.id} style={{alignSelf:m.role==="user"?"flex-end":"flex-start",padding:m.role==="user"?13:0,backgroundColor:m.role==="user"?c.tint:"transparent",borderRadius:17,width:m.role==="assistant"?"100%":undefined,maxWidth:m.role==="user"?"94%":"100%"}}>
            {m.role==="assistant"&&<Txt size={11} color={c.muted} style={{marginBottom:4}}>禾安成长日记</Txt>}
            {!!m.text&&<Txt selectable size={14}>{m.text}</Txt>}
            {!!(m.acceptedRecords?.length||m.nursingStarted||m.sleepStarted)&&<View style={{backgroundColor:c.tint,borderRadius:18,padding:16,gap:4,width:"100%"}}>
              <Txt size={13} color={c.primary}>✓ {lang==='zh'?'已采纳':'Accepted'} · {(m.acceptedRecords?.length||0)+(m.nursingStarted?1:0)+(m.sleepStarted?1:0)}</Txt>
              {m.acceptedRecords?.map((r,i)=><View key={r.id}><RecordRow receipt divider={i<(m.acceptedRecords?.length||0)-1||!!m.nursingStarted} record={r} onPress={()=>{const current=data.records.find(x=>x.id===r.id);if(current)setEditor({record:current,mode:'saved'})}}/></View>)}
              {m.sleepStarted&&<Txt size={14}>{lang==='zh'?'睡眠 · 已开始计时':'Sleep · Timer started'}</Txt>}
              {m.nursingStarted&&<Txt size={14}>{lang==='zh'?'亲喂':'Nursing'} · {m.nursingStarted.side==='right'?(lang==='zh'?'右侧':'Right'):(lang==='zh'?'左侧':'Left')} · {lang==='zh'?'已开始计时':'Timer started'}</Txt>}
            </View>}
            {m.sources?.map(source=><Pressable key={source.id} accessibilityRole="link" onPress={()=>Linking.openURL(source.url)}><Txt size={11} color={c.primary}>{source.title} ↗</Txt></Pressable>)}
            {m.attachments?.map(a=><AttachmentView key={a.id} attachment={a} compact onOpen={p.onPreview}/>)}
            {!!m.at&&<Txt size={10} color={c.muted} style={{marginTop:5,alignSelf:m.role==='user'?'flex-end':'flex-start'}}>{messageTime(m.at,data.settings.region==='CN'?'Asia/Shanghai':Intl.DateTimeFormat().resolvedOptions().timeZone)}</Txt>}
          </View>)}
          {!!busy&&<View style={{gap:8}}><Txt color={c.muted}>{busy}{waitingSeconds>0?` · ${waitingSeconds}s`:''}</Txt><Pressable onPress={onCancelAI}><Txt color={c.primary}>{lang==="zh"?"停止等待":"Stop waiting"}</Txt></Pressable></View>}
          {draftCards}
        </ScrollView>
      </View>
      <View ref={composerRef} collapsable={false} onLayout={measureComposer} style={{flexShrink:0,backgroundColor:c.bg,paddingTop:4}}>{composer}</View>
    </View>
  );
}
