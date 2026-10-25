import {allMedia,applyMediaDeletions,conversationMedia,deleteAlbumMedia,unownedMedia,withoutConversationMedia} from './src/care/mediaDeletion';
import {useKeyboardLayout} from "./src/useKeyboardLayout";
import {aiFailure} from './src/aiFailure';
import {PageBody} from "./src/PageBody";
import {capture, type CapturedAsset, type CaptureResult} from "./src/capture";
import {commitAutomaticRecords} from "./src/automaticRecord";
import {WelcomeGuide} from "./src/WelcomeGuide";
import {Linking} from "react-native";
import {observeNotification} from "./src/reminders/native";
import {syncReminders} from "./src/reminders/service";
import {syncWidget} from "./src/widgetSync";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {createBabyRepository, babyKey, BabyIndex} from "./src/babyRepository";
import * as babyStorage from "./src/storage";
import {dictationAttachment} from "./src/speechAttachment";
import {BottleSessionCard} from './src/care/BottleSessionCard';
import {applyBottleAction,type BottleAction} from './src/care/bottleFlow';
import {ReviewCenter} from './src/review/ReviewCenter';
import {enqueueReview,pendingReviews,resolveReview,type ReviewEntry} from './src/review/queue';
import {attachmentURI,releaseURI} from './src/attachmentStorage';
import {recordVersion} from './src/domain';
import {NursingTimer} from "./src/care/NursingTimer";
import * as PhotoLibrary from "expo-media-library/legacy";
import {eventTime} from "./src/eventTime";
import {CreationScreen} from "./src/CreationScreen";
import { configureVoice, readVoiceReceipts, clearVoiceStorage } from "./src/voiceStorage";
import {syncAssistant} from "./src/assistantSync";
import { applyReceipts } from "./src/voiceInbox";
import { AppState } from "react-native";
import {
  storeAttachment,
  deleteAttachments,
  clearAttachments,
} from "./src/attachmentStorage";
import { AttachmentView, MediaViewer } from "./src/AttachmentView";
import { useFonts } from "expo-font";
import { SectionTabs } from "./src/SectionTabs";
import { ReportScreen } from "./src/reports/ReportScreen";
import { AnalyticsView } from "./src/AnalyticsView";
import { Journal } from "./src/Journal";
import { TodayView } from "./src/TodayView";
import React, { useState, useEffect, useRef } from "react";
import {
  View,
  TextInput,
  ScrollView,
  Pressable,
  Platform,
  KeyboardAvoidingView,
  Keyboard,
  useWindowDimensions,
  Image,
  ActivityIndicator,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import {
  useAudioRecorder,
  useAudioRecorderState,
  RecordingPresets,
  AudioModule,
  setAudioModeAsync,
} from "expo-audio";
import * as ImagePicker from "expo-image-picker";
import {
  Home,
  NotebookPen,
  Baby,
  Settings as SettingsIcon,
  Plus,
  ArrowUp,
  Mic,
  Square,
  Camera,
  ImagePlus,
  Video,
  AudioLines,
  X,
  Check,
  Sparkles,
  ArrowRight,
  Clock,
  Sun,
  ChevronRight,
  Moon,
} from "lucide-react-native";
import {
  AppData,
  CareRecord,
  Kind,
  initialData,
  mergeRecords,
  statsForDay,
  uid,
  units,
  ageDays,
} from "./src/domain";

import { copy, themes } from "./src/i18n";
import {
  UIContext,
  Wordmark,
  Heading,
  Art,
  Txt,
  Card,
  Button,
  IconButton,
  Choice,
  Sheet,
  RecordRow,
  BrandMark,
  icons,
  layout,
} from "./src/ui";
import { Editor } from "./src/Editor";
import { ProfileForm, BabyScreen, SettingsScreen } from "./src/Screens";
import {
  Capabilities,
  Media,
  getStatus,
  interpret,
  transcribe,
  observe,
} from "./src/api";
import { prepareImage } from "./src/prepareImage";
import { readMedia } from "./src/media";
type Message = {
  at?: string;
  sleepStarted?:string; acceptedRecords?: CareRecord[]; nursingStarted?: AppData["nursingSession"];
  sources?: {id:string;title:string;url:string}[];
  attachments?: import("./src/domain").Attachment[]; id: string; role: "user" | "assistant"; text: string };
function AppBody({babyId,babyIds,onSwitch,onAdd,entry,entryAction}:{entryAction:string;entry:number;babyId:string;babyIds:string[];onSwitch:(id:string)=>Promise<void>;onAdd:()=>Promise<void>}) {
  const loadData=()=>babyStorage.loadData(babyId);
  const loadConversation=()=>babyStorage.loadConversation(babyId);
  const persist=(value:AppData)=>babyStorage.persist({...value,babyId},babyId);
  const persistConversation=(value:babyStorage.Conversation)=>babyStorage.persistConversation(withoutConversationMedia(value,dataRef.current.deletedMediaIds||[]),babyId);
  const [babyCards,setBabyCards]=useState<{id:string;name:string}[]>([]);
  const [switching,setSwitching]=useState(false);
  const switchLock=useRef(false);
  async function changeBaby(id?:string){
    if(switchLock.current||requestLock.current||saveLock.current||voiceSyncLock.current||pickerLock.current||recording.isRecording||busy){setNotice(lang === "zh" ? "请等当前操作完成后再切换宝宝" : "Finish the current action before switching babies");return;}
    switchLock.current=true;setSwitching(true);
    try {await persistConversation(conversationRef.current);if(id)await onSwitch(id);else await onAdd();}catch{setNotice(t.saveError);switchLock.current=false;setSwitching(false);}
  }

  const [fontsLoaded, fontError] = useFonts({
    BabySerif: require("./assets/fonts/BabySerif.ttf"),
  });
  const [data, setData] = useState<AppData>(initialData);
  const dataRef = useRef(data);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [recordSection, setRecordSection] = useState<"timeline" | "trends" | "report" | "review">("timeline");
  const [tab, setTab] = useState<"today" | "records" | "baby" | "settings" | "creation">(
    "today",
  );
  useEffect(()=>{if(entry){setTab(entryAction==="nursing"?"records":"today");if(entryAction==="nursing")setRecordSection("timeline")}},[entry,entryAction]);
  const [input, setInput] = useState("");
  const [drafts, setDrafts] = useState<CareRecord[]>([]);
  const [pendingBottle,setPendingBottle]=useState<BottleAction>();
  const [reviewEditing,setReviewEditing]=useState<string>();
  const [pendingSleep,setPendingSleep]=useState<string>();
  const [pendingNursing,setPendingNursing]=useState<AppData["nursingSession"]>();
  const [messages, setMessages] = useState<Message[]>([]);
  const conversationRef = useRef({ messages, drafts, input, pendingNursing, pendingSleep, pendingBottle });
  conversationRef.current = { messages, drafts, input, pendingNursing, pendingSleep, pendingBottle };
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState("");
  const [saving, setSaving] = useState(false);
  const saveLock = useRef(false);
  const requestLock = useRef(false);
  const aiAbort = useRef<AbortController | null>(null);
  const finishLock = useRef(false);
  const [caps, setCaps] = useState<Capabilities>({
    text: false,
    asr: false,
    omni: false,
  });
  const [editor, setEditor] = useState<{
    record: CareRecord;
    mode: "draft" | "saved" | "new";
  } | null>(null);
  const [editorHidden,setEditorHidden]=useState(false);
  const [previewAttachment,setPreviewAttachment]=useState<NonNullable<CareRecord["attachments"]>[number]|null>(null);
  const editorAction=useRef<null|(()=>void)>(null);
  function afterEditorHidden(action:()=>void){if(Platform.OS==="ios"){editorAction.current=action;setEditorHidden(true);}else{setEditorHidden(true);action();}}
  function openPreview(a:NonNullable<CareRecord["attachments"]>[number]){if(editor)afterEditorHidden(()=>setPreviewAttachment(a));else setPreviewAttachment(a);}
  const [guideOpen,setGuideOpen]=useState(false);
  const [profileEdit, setProfileEdit] = useState(false);
  const [cancelSleepOpen, setCancelSleepOpen] = useState(false);
  const [sleepDraftStart, setSleepDraftStart] = useState<string | null>(null);
  const [attachmentTarget, setAttachmentTarget] = useState<
    "composer" | "editor"
  >("composer");
  const [attachments, setAttachments] = useState(false);
  const speechAttachment = useRef<Media|null>(null);
  const [media, setMedia] = useState<Media | null>(null);
  const [recordPurpose, setRecordPurpose] = useState<"speech" | "sound">(
    "speech",
  );
  const [filter, setFilter] = useState<Kind | "all">("all");
  const [onlyToday, setOnlyToday] = useState(false);
  const [consent, setConsent] = useState(false);
  const pendingAction = useRef<null | (() => void)>(null);
  const consentGiven = useRef(false);
  const [, tick] = useState(0);
  const scroll = useRef<ScrollView>(null);
  const {keyboardOpen,inset:keyboardPadding}=useKeyboardLayout();
  const recorder = useAudioRecorder({
    ...RecordingPresets.HIGH_QUALITY,
    isMeteringEnabled: true,
  });
  const recording = useAudioRecorderState(recorder, 150);
  const { width } = useWindowDimensions();
  const wide = width >= 900;
  const c = themes[data.settings.theme],
    t = copy(data.settings.language),
    lang = data.settings.language;
  useEffect(()=>{Promise.all(babyIds.map(async id=>({id,name:(await babyStorage.loadData(id)).profile.name || (lang === "zh" ? "新宝宝" : "New baby")}))).then(setBabyCards).catch(()=>setNotice(t.saveError));},[babyIds,data.profile.name,lang]);
  async function load() {
    try {
      const d = await loadData();
      dataRef.current = d;
      setData(d);
      const chat = withoutConversationMedia(await loadConversation(),d.deletedMediaIds||[]);
      setMessages(chat.messages);setPendingNursing(chat.pendingNursing);setPendingSleep(chat.pendingSleep);setPendingBottle(chat.pendingBottle);
      setDrafts(chat.drafts);
      setInput(chat.input);
      setReady(true);
      setLoadError(false);
    } catch {
      setLoadError(true);
    }
  }
  useEffect(() => {
    if (ready) persistConversation({ messages, drafts, input, pendingNursing, pendingSleep, pendingBottle }).catch(() => setNotice(t.saveError));
  }, [ready, messages, drafts, input,pendingNursing,pendingSleep,pendingBottle]);
  const pickerAction = useRef<null | (() => void)>(null);
  const pickerLock = useRef(false);
  function closeAttachmentsThen(action: () => void) {
    if (pickerAction.current || pickerLock.current) return;
    if (Platform.OS === "ios") pickerAction.current = action;
    setAttachments(false);
    if (Platform.OS !== "ios") action();
  }
  const voiceSyncLock = useRef(false);
  async function syncVoice() {
    if (!ready || voiceSyncLock.current || saveLock.current || requestLock.current) return;
    voiceSyncLock.current = true;
    try {
      const receipts = await readVoiceReceipts(babyId);
      try {receipts.push(...await syncAssistant(dataRef.current));} catch {if(dataRef.current.settings.assistantSync)setNotice(lang==='zh'?'小聆同步暂未连通，云端回执会保留，联网后重试。':'Assistant sync unavailable; receipts stay queued for retry.');}
      const result = applyReceipts(dataRef.current, receipts);
      if (result.incoming.length) {
        const previous = conversationRef.current;
        const messageIds = new Set(previous.messages.map(m=>m.id));
        const draftIds = new Set(previous.drafts.map(r=>r.id));
        const nextMessages = [...previous.messages,...result.incoming.flatMap(r=>[
          {id:`voice-${r.id}-user`,role:"user" as const,text:r.text,at:r.capturedAt},
          {id:`voice-${r.id}-${r.status}`,role:"assistant" as const,text:r.reply || (r.status === "saved" ? "语音记录已保存。" : "请核对这笔语音记录。")}
        ]).filter(m=>!messageIds.has(m.id))];
        const nextDrafts = previous.drafts;
        // Persist the conversation first: interruption cannot mark a review receipt
        // processed before its draft is durable. Replays deduplicate by stable IDs.
        await persistConversation({...previous,messages:nextMessages,drafts:nextDrafts});
        setMessages(nextMessages); setDrafts(nextDrafts);
        const saved=await update(current => applyReceipts(current, receipts).data);
        if(saved)try{await syncAssistant(dataRef.current);}catch{ /* replay is safe until the acknowledgement reaches the server */ }
      }
    } catch { setNotice(t.saveError); }
    finally { voiceSyncLock.current = false; }
  }
  useEffect(() => {
    if (!ready) return;
    try {syncWidget(data);} catch {}
    syncReminders().catch(()=>{});
    configureVoice(data).catch(() => setNotice(t.saveError));
  }, [ready,data]);
  useEffect(() => {
    if (!ready) return;
    syncVoice();
    const timer = setInterval(syncVoice, 5000);
    const sub = AppState.addEventListener("change", state => { if (state === "active") {syncVoice();syncReminders().catch(()=>{});try{syncWidget(dataRef.current)}catch{}} });
    return () => { clearInterval(timer); sub.remove(); };
  }, [ready]);
  async function refresh(show = false) {
    try {
      setCaps(await getStatus());
    } catch {
      if (show) setNotice(t.connectionError);
    }
  }
  useEffect(() => {
    load();
    refresh();
    const timer = setInterval(() => {
      tick((x) => x + 1);
      refresh();
    }, 30000);
    const onFocus = () => refresh();
    if (Platform.OS === "web") window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(timer);
      if (Platform.OS === "web") window.removeEventListener("focus", onFocus);
    };
  }, []);
  useEffect(() => {
    if (notice) {
      const timer = setTimeout(() => setNotice(""), 6500);
      return () => clearTimeout(timer);
    }
  }, [notice]);
  useEffect(() => {
    if (recording.isRecording && recording.durationMillis >= 60000)
      finishRecording();
  }, [recording.durationMillis]);
  async function update(fn: (current: AppData) => AppData) {
    if (saveLock.current) return false;
    saveLock.current = true;
    setSaving(true);
    try {
      const next = applyMediaDeletions({...fn(dataRef.current),babyId});
      await persist(next);
      dataRef.current = next;
      setData(next);
      return true;
    } catch (error) {
      setNotice(error instanceof Error && error.message === "STALE_RECORD_UPDATE"
        ? (lang === "zh" ? "原记录已发生变化，请重新告诉我需要修改的内容。" : "The original record changed. Please send your correction again.") : t.saveError);
      return false;
    } finally {
      saveLock.current = false;
      setSaving(false);
    }
  }
  async function removeAlbumMedia(ids:string[]):Promise<boolean>{
    if(requestLock.current||saveLock.current||voiceSyncLock.current){setNotice(lang==='zh'?'请等当前保存或同步完成后再删除。':'Wait for the current save or sync to finish.');return false;}
    requestLock.current=true;
    try{
      let removed:import('./src/domain').Attachment[]=[];
      if(!await update(d=>{const result=deleteAlbumMedia(d,ids);removed=result.removed;return result.data}))return false;
      const pending=dataRef.current.mediaDeletionPending||[];
      const chat=withoutConversationMedia(conversationRef.current,dataRef.current.deletedMediaIds||[]);
      conversationRef.current=chat;setMessages(chat.messages);setDrafts(chat.drafts);
      await persistConversation(chat);
      // Shared photos and Live Photo clips are removed only when no profile owns them.
      const owners=allMedia(dataRef.current).concat(conversationMedia(chat));
      for(const id of babyIds.filter(id=>id!==babyId)){const other=await babyStorage.loadData(id),otherChat=await babyStorage.loadConversation(id);owners.push(...allMedia(other),...conversationMedia(withoutConversationMedia(otherChat,other.deletedMediaIds||[])));}
      await deleteAttachments(unownedMedia(pending,owners));
      const completed=new Set(pending.map(a=>a.id));
      if(!await update(d=>({...d,mediaDeletionPending:d.mediaDeletionPending?.filter(a=>!completed.has(a.id))})))return false;
      setNotice(lang==='zh'?`已从禾安删除 ${removed.length||pending.length} 项。`:`Deleted ${removed.length||pending.length} items from Hean.`);return true;
    }catch{setNotice(lang==='zh'?'相册内容已移除，文件清理尚未完成。可在成长相册重试清理。':'Album items removed; file cleanup is pending. Retry from Growing memories.');return false;}finally{requestLock.current=false;}
  }
  function addMessage(role: Message["role"], text: string) {
    setMessages((prev) => [...prev, { id: uid(), role, text, at:new Date().toISOString() }]);
  }
  function withConsent(action: () => void) { consentGiven.current = true; action(); }
  function newRecord(kind: Kind) {
    if(kind==='note'){void pick('camera','observation');return;}
    setEditor({
      mode: "new",
      record: {
        id: uid(),
        kind,
        at: new Date().toISOString(),
        note: "",
        sourceText: "",
        unit: units[kind],
        ...(["weight", "height", "head"].includes(kind) ? {value: [...dataRef.current.records].filter(r=>r.kind===kind).sort((a,b)=>b.at.localeCompare(a.at))[0]?.value} : {}),
      },
    });
  }
  function closeEditor() {
    if (editor) {
      const owned = new Set(
        [...dataRef.current.records, ...drafts, ...messages,...(dataRef.current.reviewQueue||[])].flatMap((r) =>
          (r.attachments || []).map((a) => a.id),
        ),
      );
      deleteAttachments(
        (editor.record.attachments || []).filter((a) => !owned.has(a.id)),
      ).catch(() => {});
    }
    setEditor(null);setReviewEditing(undefined);
  }
  function changeDrafts(next: CareRecord[]) {
    const owned = new Set(
      [...dataRef.current.records, ...next, ...messages,...(dataRef.current.reviewQueue||[])].flatMap((r) =>
        (r.attachments || []).map((a) => a.id),
      ),
    );
    deleteAttachments(
      drafts
        .flatMap((r) => r.attachments || [])
        .filter((a) => !owned.has(a.id)),
    ).catch(() => {});
    setDrafts(next);
    if (!next.some((r) => r.kind === "sleep")) setSleepDraftStart(null);
  }
  async function saveEditor(record: CareRecord) {
    if (!editor) return;
    if (editor.mode === "draft") {
      setDrafts((rs) => rs.map((r) => (r.id === record.id ? record : r)));
      setEditor(null);
      return;
    }
    if (
      await update((d) => ({
        ...d,
        records: mergeRecords(d.records, [record]),
        reviewQueue:reviewEditing?(d.reviewQueue||[]).map(item=>item.id===reviewEditing?{...item,reason:item.reason.replace('识别结果尚未保存，请逐条核对后保存。','本条记录已保存，请继续核对其余内容。'),recordIds:[...new Set([...(item.recordIds||[]),record.id])],proposedRecords:(item.proposedRecords||[]).filter(r=>r.id!==record.id)}:item):d.reviewQueue,
      }))
    ) {
      const previous = data.records.find((r) => r.id === record.id);
      await deleteAttachments(
        [
          ...(previous?.attachments || []),
          ...(editor.record.attachments || []),
        ].filter((a) => !record.attachments?.some((b) => b.id === a.id) && !dataRef.current.records.some(r=>r.id!==record.id&&r.attachments?.some(b=>b.id===a.id)) && !(dataRef.current.reviewQueue||[]).some(r=>r.attachments?.some(b=>b.id===a.id))),
      ).catch(() => {});
      setEditor(null);
      if(reviewEditing)setDrafts(rs=>rs.filter(r=>r.id!==record.id));setReviewEditing(undefined);setNotice(t.saved);
    }
  }

  async function captureReview(id:string,at:string,text:string,result:Awaited<ReturnType<typeof interpret>>|undefined,saved:boolean,attachments?:CareRecord["attachments"]){
    if(saved&&!result?.reviewReasons?.length)return;
    await update(d=>enqueueReview(d,{id:'request-review-'+id,at,origin:'request',title:saved?'记录待补充':'记录未完成',sourceText:text,reason:result?.reviewReasons?.join('；')||(saved?'请核对原始内容。':'原始内容已保留，请补录或重新识别。'),attachments,recordIds:saved?result?.drafts.map(r=>r.id):[],proposedRecords:saved?[]:result?.drafts,bottleAction:saved?undefined:result?.bottleAction,sleepStart:saved?undefined:result?.sleepStart,nursingStart:saved?undefined:result?.nursingStart}));
  }
  function editReviewRecord(item:ReviewEntry,proposal?:CareRecord){
    const existing=proposal&&dataRef.current.records.find(r=>r.id===(proposal.targetRecordId||proposal.id));
    const record:CareRecord=proposal?{...proposal,...(existing?{id:existing.id,targetRecordId:existing.id,baseVersion:recordVersion(existing)}:{targetRecordId:undefined,baseVersion:undefined}),attachments:proposal.attachments||item.attachments}:{id:uid(),kind:'bottle',at:item.at,...(item.origin==='notebook'?{timePrecision:'day' as const}:{}),unit:'ml',note:'',sourceText:item.sourceText,attachments:item.attachments};
    setReviewEditing(item.id);setEditor({record,mode:existing?'saved':'new'});
  }
  async function applyReviewAction(item:ReviewEntry){
    if(!item.bottleAction&&!item.sleepStart&&!item.nursingStart)return;
    if(await update(d=>{const next=commitAutomaticRecords(d,[],item.nursingStart,item.sleepStart,item.bottleAction);return {...next,reviewQueue:(next.reviewQueue||[]).map(x=>x.id===item.id?{...x,bottleAction:undefined,sleepStart:undefined,nursingStart:undefined,reason:'操作已保存，请核对后标记完成。'}:x)}})){
      if(JSON.stringify(pendingBottle)===JSON.stringify(item.bottleAction))setPendingBottle(undefined);
      if(pendingSleep===item.sleepStart)setPendingSleep(undefined);
      if(JSON.stringify(pendingNursing)===JSON.stringify(item.nursingStart))setPendingNursing(undefined);
      setNotice(t.saved);
    }
  }
  async function retryReview(item:ReviewEntry,clarification:string){
    if(requestLock.current||saveLock.current)return;
    requestLock.current=true;setBusy(t.working);aiAbort.current=new AbortController();const uris:string[]=[];
    try{
      let source=item.sourceText;const images:{data:string;capturedAt?:string}[]=[];
      for(const a of item.attachments||[]){if(a.type==='video')continue;const uri=await attachmentURI(a);uris.push(uri);if(a.type==='audio'){const m=await readMedia(uri,'audio',a.mime);source+='\n'+await transcribe(m,aiAbort.current.signal);}else{const photo=await prepareImage(uri);images.push({data:photo.data,capturedAt:a.capturedAt});}}
      const sourceIds=new Set((item.attachments||[]).filter(a=>a.role==='source').map(a=>a.id));
      const existing=dataRef.current.records.filter(r=>item.recordIds?.includes(r.id)||r.attachments?.some(a=>sourceIds.has(a.id)));
      const retryRecords=[...existing,...dataRef.current.records.filter(r=>!existing.some(x=>x.id===r.id)).sort((a,b)=>Date.parse(b.at)-Date.parse(a.at))].slice(0,80);
      const text=`请核对这条历史记录。原始事件日期时间：${item.at}。原文：${source}\n待核对原因：${item.reason}\n用户补充：${clarification||'无'}\n关联的现有记录已放入 records；请优先核对同页或同日记录。\n不要重复创建已存在的记录；有修正请明确 targetRecordId，只提取可以确定的信息。`;
      const result=await interpret(dataRef.current,text,[],[],aiAbort.current.signal,undefined,images,[],item.at,retryRecords);
      const proposals=result.drafts.map(r=>({...r,sourceText:source,attachments:r.attachments?.length?r.attachments:item.attachments}));
      const saved=await update(d=>({...d,reviewQueue:(d.reviewQueue||[]).map(x=>x.id===item.id?{...x,proposedRecords:proposals,bottleAction:result.bottleAction,sleepStart:result.sleepStart,nursingStart:result.nursingStart,reason:[...(result.reviewReasons||[]),result.reply,'识别结果尚未保存，请逐条核对后保存。'].join('\n')}:x)}));
      if(saved)setNotice(lang==='zh'?'识别完成，请逐条查看待确认结果。':'Results ready. Review each record before saving.');
    }catch(error){setNotice(aiFailure(error,lang));}finally{uris.forEach(releaseURI);aiAbort.current=null;requestLock.current=false;setBusy('');}
  }

  const [savedVersion, setSavedVersion] = useState(0);
  async function saveAutomatic(records: CareRecord[],nursing?:AppData["nursingSession"],sleepStart?:string,bottleAction?:BottleAction) {
    if (!records.length&&!nursing&&!sleepStart&&!bottleAction) { setDrafts([]); return true; }
    setPendingNursing(nursing);setPendingSleep(sleepStart);setPendingBottle(bottleAction);
    setDrafts(records);
    if (!await update(d => commitAutomaticRecords(d,records,nursing,sleepStart,bottleAction))) return false;
    setDrafts([]);
    setPendingNursing(undefined);setPendingSleep(undefined);setPendingBottle(undefined);
    setSleepDraftStart(null);
    setMessages(ms=>[...ms,{id:uid(),role:"assistant",text:"",at:new Date().toISOString(),acceptedRecords:records,nursingStarted:nursing,sleepStarted:sleepStart}]);
    setSavedVersion(n=>n+1);
    setNotice(t.saved);
    return true;
  }
  async function confirmDrafts() {
    if (await saveAutomatic(drafts,pendingNursing,pendingSleep,pendingBottle)) addMessage("assistant",t.saved);
  }
  function savedReply(records: CareRecord[],action?:BottleAction):string {
    if(action&&lang==='zh')return (records.length?savedReply(records)+' ':'')+(action.type==='start'?`已开始这顿奶：准备 ${action.session.preparedMl} ml，喝完告诉我实际量或剩余量。`:action.type==='finish'?`这顿奶已保存：实际喝下 ${action.record.value} ml，剩余 ${Number(action.record.details?.preparedMl)-action.record.value!} ml。`:action.type==='undo'?'已撤销上一顿奶的完成记录，恢复到进行中。':'已取消这顿奶，未计入奶量。');
    const summary=records.map(r=>`${t[r.kind]}${r.value !== undefined ? ` ${r.value} ${r.unit || ""}` : r.kind === "note" ? `：${r.note}` : ""}`).join(lang === "zh" ? "、" : ", ");
    return lang === "zh" ? `已保存：${summary}。` : `Saved: ${summary}.`;
  }
  async function sendText(text = input, attached: Media | null = media) {
    if (requestLock.current || saveLock.current || (!text.trim() && !attached)) return;
    if (attached) {
      requestLock.current = true;
      setBusy(t.working);
      let stage: "read" | "analyze" = "read";
      const attemptId=uid(),attemptAt=new Date().toISOString();
      let original:CareRecord["attachments"];
      try {
        const attachment = attached.attachment || {...await storeAttachment(
          attached.uri,
          attached.type,
          attached.mime,
        ),capturedAt:attached.capturedAt,livePhoto:attached.livePhoto};
        original=[attachment];
        const messageId=attached.messageId||uid();
        setMedia({...attached,attachment,messageId});
        setInput("");
        setMessages(ms=>ms.some(m=>m.id===messageId)?ms.map(m=>m.id===messageId?{...m,text:text||t.photoLabel,attachments:[attachment]}:m):[...ms,{id:messageId,role:"user",text:text||t.photoLabel,at:new Date().toISOString(),attachments:[attachment]}]);
        if(attached.type === "image") {
          aiAbort.current=new AbortController();
          const photo=attached.data?attached:await prepareImage(attached.uri);
          const replyId=uid();const show=(text:string)=>setMessages(ms=>ms.some(m=>m.id===replyId)?ms.map(m=>m.id===replyId?{...m,text}:m):[...ms,{id:replyId,role:"assistant",text,at:new Date().toISOString()}]);
          stage="analyze";
          const result=await interpret(dataRef.current,text|| (lang==="zh"?"请理解这张图片并整理需要记录的宝宝日常。如果是手写记录，请逐条提取清晰的事件。":"Understand this image and organize baby events. Extract clear entries from handwritten logs."),messages,drafts,aiAbort.current.signal,show,[{data:photo.data,capturedAt:attached.capturedAt}]);
          const records=result.drafts.map(r=>drafts.some(d=>d.id===r.id)?r:({...r,attachments:[...(r.attachments||[]),attachment]}));
          const saved=await saveAutomatic(records,result.nursingStart,result.sleepStart,result.bottleAction);await captureReview(attemptId,attemptAt,text,result,saved,original);show(records.length||result.bottleAction ? (saved ? savedReply(records,result.bottleAction) : (lang === "zh" ? "记录未保存，可以重试保存。" : "Not saved. Retry saving.")) : result.reply);if(records.length)setMedia(null);setInput("");return;
        }
        aiAbort.current=new AbortController();
        stage="analyze";
        const result=await interpret(dataRef.current,text||t.photoLabel,messages,drafts,aiAbort.current.signal,undefined,[],[{type:attachment.type,capturedAt:attachment.capturedAt}]);
        const records=result.drafts.map(r=>({...r,attachments:[...(r.attachments||[]),attachment]}));
        const saved=await saveAutomatic(records,result.nursingStart,result.sleepStart,result.bottleAction);await captureReview(attemptId,attemptAt,text,result,saved,original);if(saved)addMessage("assistant",records.length||result.bottleAction?savedReply(records,result.bottleAction):result.reply);
        setMedia(null);
        setInput("");
      } catch (error) {
        if(!aiAbort.current?.signal.aborted)await captureReview(attemptId,attemptAt,text,undefined,false,original);
        const code=error instanceof Error?error.message:"";
        setInput(text);
        setNotice(code.includes("TOO_LARGE")?t.tooLarge:stage === "analyze"
          ? (lang==="zh"?"图片分析未完成，原图已保留，可以重试。":"Image analysis did not finish. Your image is kept for retry.") : t.fileError);
      } finally {
        aiAbort.current = null;
        requestLock.current = false;
        setBusy("");
      }
      return;
    }
    await runAI(text, false);
  }

  async function runAI(text: string, withMedia: boolean) {
    if (requestLock.current) return;
    requestLock.current = true;
    setBusy(withMedia ? t.observing : t.working);
    const attemptId=uid(),attemptAt=new Date().toISOString();
    addMessage("user", text || t.audioLabel);
    setInput("");
    try {
      if (withMedia && media) {
        const reply = await observe(dataRef.current, text, media);
        addMessage("assistant", reply);
        setMedia(null);
      } else {
        aiAbort.current = new AbortController();
        const replyId = uid();
        const showReply=(text:string)=>setMessages(current=>current.some(m=>m.id===replyId)?current.map(m=>m.id===replyId?{...m,text}:m):[...current,{id:replyId,role:"assistant",text,at:new Date().toISOString()}]);
        const result = await interpret(dataRef.current, text, messages, drafts, aiAbort.current.signal, showReply);
        const saved = await saveAutomatic(result.drafts,result.nursingStart,result.sleepStart,result.bottleAction);
        await captureReview(attemptId,attemptAt,text,result,saved);
        showReply(result.drafts.length||result.bottleAction ? (saved ? savedReply(result.drafts,result.bottleAction) : (lang === "zh" ? "记录未保存，内容已保留，可重试保存。" : "Not saved. Your records are kept; retry saving.")) : result.reply);
        setMessages(ms=>ms.map(m=>m.id===replyId?{...m,sources:result.sources}:m));
      }
      setInput("");
    } catch (error) {
      if(!aiAbort.current?.signal.aborted)await captureReview(attemptId,attemptAt,text,undefined,false);
      addMessage("assistant", aiAbort.current?.signal.aborted ? (lang === "zh" ? "已停止。你可以修改后再次发送。" : "Stopped. You can edit and send again.") : aiFailure(error,lang));
      setInput(text);
      if(!aiAbort.current?.signal.aborted)setNotice(aiFailure(error,lang));
    } finally {
      aiAbort.current = null;
      requestLock.current = false;
      setBusy("");
    }
  }
  async function beginRecording(purpose: "speech" | "sound") {
    if (recording.isRecording || requestLock.current) return;
    if (purpose === "speech" && !consentGiven.current) {
      withConsent(() => beginRecording(purpose));
      return;
    }
    speechAttachment.current = dictationAttachment(media);
    setAttachments(false);
    try {
      const permission = await AudioModule.requestRecordingPermissionsAsync();
      if (!permission.granted) {
        setNotice(t.permission);
        return;
      }
      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });
      setRecordPurpose(purpose);
      await recorder.prepareToRecordAsync();
      recorder.record();
    } catch {
      setNotice(t.permission);
    }
  }
  async function finishRecording() {
    if (requestLock.current || finishLock.current) return;
    finishLock.current = true;
    try {
      await recorder.stop();
      await setAudioModeAsync({ allowsRecording: false });
      if (!recorder.uri) return;
      const m = await readMedia(
        recorder.uri,
        "audio",
        Platform.OS === "web" ? "audio/webm" : "audio/mp4",
      );
      if (recordPurpose !== "speech") setMedia(m);
      if (recordPurpose === "speech") {
        withConsent(() => runASR(m));
      } else {
        await sendText(input, m);
      }
    } catch (e) {
      setNotice(
        (e as Error).message === "TOO_LARGE" ? t.tooLarge : t.fileError,
      );
    } finally {
      finishLock.current = false;
    }
  }
  const [failedSpeech,setFailedSpeech] = useState<Media|null>(null);
  async function runASR(m: Media) {
    if (requestLock.current) return;
    requestLock.current = true;
    setBusy(t.transcribing);
    setFailedSpeech(null);
    let recognized = "";
    const speechAt=m.capturedAt||new Date().toISOString();
    const controller=new AbortController();aiAbort.current=controller;
    try {
      const text = await transcribe(m,controller.signal);
      if (text.trim()) {
        recognized = input.trim() ? input + " " + text : text;
        setInput(recognized);
        setMedia(speechAttachment.current);
      } else setNotice(t.noSpeech);
    } catch {
      setFailedSpeech(m);
      if(!controller.signal.aborted)try{const attachment=m.attachment||await storeAttachment(m.uri,'audio',m.mime);await update(d=>enqueueReview(d,{id:'audio-review-'+attachment.id,origin:'audio',at:speechAt,title:'语音识别未完成',sourceText:input,reason:'原录音已保留，可播放后手动补录，或重新识别。',attachments:[attachment]}));}catch{setNotice(t.fileError);}
      if(!aiAbort.current?.signal.aborted)setNotice(t.connectionError);
    } finally {
      aiAbort.current = null;
      requestLock.current = false;
      setBusy("");
    }
    if (recognized&&!controller.signal.aborted) await sendText(recognized, speechAttachment.current);
  }
  async function cancelRecording() {
    try {
      await recorder.stop();
      await setAudioModeAsync({ allowsRecording: false });
    } catch {
      setNotice(t.fileError);
    }
  }
  async function captureTime(asset:CapturedAsset){if(asset.capturedAt&&Number.isFinite(Date.parse(asset.capturedAt)))return asset.capturedAt;if(Platform.OS==="web"||!asset.assetId)return undefined;try{const info=await PhotoLibrary.getAssetInfoAsync(asset.assetId,{shouldDownloadFromNetwork:false});return Number.isFinite(info.creationTime)&&info.creationTime>0?new Date(info.creationTime).toISOString():undefined;}catch{return undefined;}}
  async function pick(mode: "camera" | "library" | "video", target: 'composer'|'editor'|'observation'=attachmentTarget) {
    if (pickerLock.current) return;
    pickerLock.current = true;
    try {
      let result: CaptureResult;
      if (mode === "library") {
        if (Platform.OS === "ios") {
          const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (!permission.granted) { setNotice(t.permission); return; }
        }
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ["images", "videos"],
          allowsMultipleSelection: true,
          selectionLimit: target === "editor" ? Math.max(1,9-(editor?.record.attachments?.length||0)) : 9,
          quality: 0.65,
        });
      } else {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          setNotice(t.permission);
          return;
        }
        result = await capture(mode);
      }
      if (!result.canceled) {
        const assets=result.assets as CapturedAsset[];
        if(result.savedToLibrary===false)setNotice(lang==="zh"?"已保留在应用中，但未能保存到系统相册，请检查照片权限和存储空间。":"Kept in the app, but could not save to Photos. Check permission and storage.");
        const existing=target === "editor" ? editor?.record.attachments||[] : [];
        if(assets.length+existing.length>9||assets.some(a=>a.type!=="video"&&(a.fileSize||0)>30*1024*1024)){setNotice(t.tooLarge);return;}
        if(target !== "composer" || assets.length>1){
          const added:NonNullable<CareRecord["attachments"]>=[];
          try{for(const a of assets){const type=a.type==="video"?"video":"image";const uri=Platform.OS==="ios"&&type==="video"&&a.assetId?`ph://${a.assetId}`:a.uri;added.push({...await storeAttachment(uri,type,a.mimeType||(type==="video"?(/\.mov(?:$|\?)/i.test(a.uri)?"video/quicktime":"video/mp4"):"image/jpeg"),a.fileName||""),capturedAt:await captureTime(a),livePhoto:a.liveMovieURI?await storeAttachment(a.liveMovieURI,"video","video/quicktime","Live.mov"):undefined});}}
          catch(e){await deleteAttachments(added);throw e;}
          if(target === "editor")setEditor(e=>e?{...e,record:{...e.record,attachments:[...(e.record.attachments||[]),...added]}}:e);
          else if(target === 'observation')setEditor({mode:'new',record:{id:uid(),kind:'note',at:added[0]?.capturedAt||new Date().toISOString(),note:'',sourceText:'',attachments:added}});
          else setEditor({mode:"new",record:{id:uid(),kind:"note",...eventTime(input,dataRef.current.profile,added.find(a=>a.capturedAt)?.capturedAt),note:input,sourceText:input,attachments:added}});
        }else{
          const a=assets[0],type=a.type==="video"?"video":"image";
          const uri=Platform.OS==="ios"&&type==="video"&&a.assetId?`ph://${a.assetId}`:a.uri;
          const prepared=type==="image"?await prepareImage(uri):{uri,mime:a.mimeType||(/\.mov(?:$|\?)/i.test(a.uri)?"video/quicktime":"video/mp4"),data:""};
          const livePhoto=a.liveMovieURI?await storeAttachment(a.liveMovieURI,"video","video/quicktime","Live.mov"):undefined;
          const capturedAt=await captureTime(a);
          const attachment={...await storeAttachment(prepared.uri,type,prepared.mime,a.fileName||""),capturedAt,livePhoto};
          setMedia({...prepared,type,capturedAt,livePhoto,attachment});
        }
      }
    } catch (e) {
      setNotice(
        (e as Error).message === "TOO_LARGE" ? t.tooLarge : t.fileError,
      );
    } finally { pickerLock.current = false; setEditorHidden(false); }
  }
  async function toggleSleep() {
    if (data.sleepStart) {
      const minutes = Math.floor(
        (Date.now() - Date.parse(data.sleepStart)) / 60000,
      );
      if (minutes < 1) {
        setNotice(t.sleepTimerError);
        return;
      }
      if (drafts.length) {
        setNotice(t.draftsFirst);
        return;
      }
      const draft: CareRecord = {
        id: uid(),
        kind: "sleep",
        at: new Date().toISOString(),
        value: minutes,
        unit: "min",
        note: "",
        sourceText: "",
      };
      if(await saveAutomatic([draft])) addMessage("assistant",lang === "zh" ? `已保存这次完整睡眠，共 ${minutes} 分钟。` : `Saved this sleep: ${minutes} minutes.`);
      setTab("today");
    } else
      await update((d) => ({ ...d, sleepStart: new Date().toISOString() }));
  }
  const stats = statsForDay(data.records);
  const records = data.records.filter(
    (r) =>
      (filter === "all" || r.kind === filter) &&
      (!onlyToday ||
        new Date(r.at).toDateString() === new Date().toDateString()),
  );
  const age = ageDays(data.profile,new Date(),data.settings.region==='CN'?'Asia/Shanghai':Intl.DateTimeFormat().resolvedOptions().timeZone);
  const date = new Date().toLocaleDateString(
    lang === "zh" ? "zh-CN" : "en-US",
    { month: "long", day: "numeric", weekday: "long" },
  );
  const provider = { c, t, lang };
  const focused = tab === "today" && recording.isRecording;
  useEffect(() => {
    scroll.current?.scrollTo({ y: 0, animated: false });
  }, [tab, focused, messages.length > 0]);
  useEffect(()=>{Keyboard.dismiss();},[tab]);
  if (!ready || (!fontsLoaded && !fontError))
    return (
      <UIContext.Provider value={provider}>
        <SafeAreaView
          style={{
            flex: 1,
            backgroundColor: c.bg,
            alignItems: "center",
            justifyContent: "center",
            padding: 30,
          }}
        >
          {loadError ? (
            <>
              <Txt>{t.loadError}</Txt>
              <Button label={t.retry} onPress={load} />
            </>
          ) : (
            <ActivityIndicator color={c.primary} />
          )}
        </SafeAreaView>
      </UIContext.Provider>
    );
  if (!data.profile.name)
    return (
      <UIContext.Provider value={provider}>
        <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{
              flexGrow: 1,
              alignItems: "center",
              justifyContent: "center",
              padding: 28,
            }}
          >
            <View style={{ width: "100%", maxWidth: 430 }}>
              <View style={[layout.between, { marginBottom: 30 }]}>
                <Wordmark />
                <Choice
                  label={lang === "zh" ? "English" : "简体中文"}
                  selected={false}
                  onPress={() =>
                    update((d) => ({
                      ...d,
                      settings: {
                        ...d.settings,
                        language: lang === "zh" ? "en" : "zh",
                      },
                    }))
                  }
                />
              </View>
              {babyIds.length>1&&<Button secondary label={lang==="zh"?"返回已有宝宝":"Back to existing baby"} onPress={()=>changeBaby(babyIds.find(id=>id!==babyId))}/>}
              <ProfileForm
                profile={data.profile}
                onSave={(profile) => update((d) => ({ ...d, profile, records:d.profile.name?d.records:mergeRecords(d.records,(["weight","height"] as const).map(kind=>({id:uid(),kind,value:kind==="weight"?profile.initialWeight:profile.initialHeight,unit:units[kind],at:new Date().toISOString(),note:"",sourceText:""}))) }))}
              />
              <Txt size={12} color={c.muted} style={{ marginTop: 24 }}>
                {t.localPrivacy}
              </Txt>
              {!!notice && <Txt color={c.primary}>{notice}</Txt>}
            </View>
          </ScrollView>
        </SafeAreaView>
      </UIContext.Provider>
    );
  const header = (
    <View style={[layout.between, { marginBottom: 12 }]}>
      {wide ? (
        <Txt size={13} color={c.muted}>
          {date}
        </Txt>
      ) : (
        <Wordmark />
      )}
    </View>
  );
  const nav = (
    <View
      style={{
        flexDirection: wide ? "column" : "row",
        justifyContent: "space-around",
        gap: wide ? 12 : 0,
        padding: wide ? 12 : 8,
        backgroundColor: c.surface,
        borderTopWidth: wide ? 0 : 1,
        borderColor: c.line,
        borderRadius: wide ? 24 : 0,
      }}
    >
      {(
        [
          { key: "today", icon: Sun },
          { key: "records", icon: NotebookPen },
          { key: "creation", icon: Sparkles },
          { key: "baby", icon: Baby },
        ] as const
      ).map(({ key, icon: Icon }) => (
        <Pressable
          accessibilityRole="tab"
          accessibilityLabel={t[key]}
          accessibilityState={{ selected: tab === key }}
          key={key}
          onPress={() => setTab(key)}
          style={{
            alignItems: "center",
            justifyContent: wide ? "flex-start" : "center",
            flexDirection: wide ? "row" : "column",
            gap: wide ? 12 : 3,
            minHeight: wide ? 52 : 54,
            paddingHorizontal: wide ? 18 : 14,
            borderRadius: 16,
            backgroundColor: wide && tab === key ? c.tint : "transparent",
          }}
        >
          <Icon
            size={21}
            color={tab === key ? c.primary : c.muted}
            strokeWidth={tab === key ? 2 : 1.6}
          />
          <Txt
            size={wide ? 14 : 12}
            color={tab === key ? c.primary : c.muted}
            weight={tab === key ? "600" : "400"}
          >
            {t[key]}
          </Txt>
        </Pressable>
      ))}
    </View>
  );
  const recent = (
    <View style={{ gap: 8 }}>
      <View style={layout.between}>
        <Heading size={19}>{t.recent}</Heading>
        <Pressable
          accessibilityRole="button"
          onPress={() => setTab("records")}
          style={{ padding: 10 }}
        >
          <Txt size={13} color={c.muted}>
            {t.seeAll} →
          </Txt>
        </Pressable>
      </View>
      {data.records.length ? (
        data.records.slice(0, wide ? 3 : 2).map((r) => (
          <View key={r.id}>
            <RecordRow
              key={r.id}
              record={r}
              onPress={() => setEditor({ record: r, mode: "saved" })}
            />
            {r.attachments?.map((a) => (
              <AttachmentView key={a.id} attachment={a} compact onOpen={openPreview} />
            ))}
          </View>
        ))
      ) : (
        <Txt color={c.muted} style={{ paddingVertical: 20 }}>
          {t.noData}
        </Txt>
      )}
    </View>
  );
  return (
    <UIContext.Provider value={provider}>
      <SafeAreaView
        style={{ flex: 1, backgroundColor: c.bg }}
        edges={["top", "left", "right", "bottom"]}
      >
        <StatusBar style={data.settings.theme === "night" ? "light" : "dark"} />
        <View
          style={{ flex: 1,marginBottom:keyboardPadding }}
        >
          <View
            style={{
              flex: 1,
              flexDirection: "row",
              width: "100%",
              maxWidth: focused ? 540 : 1220,
              alignSelf: "center",
            }}
          >
            {wide && !focused && (
              <View
                style={{
                  width: 200,
                  padding: 18,
                  paddingTop: 30,
                  justifyContent: "space-between",
                }}
              >
                <View style={{ gap: 35 }}>
                  <View style={[layout.row, { paddingLeft: 16 }]}>
                    <Wordmark />
                  </View>
                  {nav}
                </View>
                <Txt size={12} color={c.muted} style={{ padding: 16 }}>
                  {t.tagline}
                </Txt>
              </View>
            )}
            <PageBody fixed={tab==="today"} wide={wide} scrollRef={scroll}>
              {!focused && header}
              {tab === "today" ? (
                <View style={{flex:1,minHeight:0}}>
                {failedSpeech && <Button label={lang === "zh" ? "重试语音识别" : "Retry voice recognition"} disabled={!!busy} onPress={()=>runASR(failedSpeech)}/>}
                <View style={{flexDirection:'row',gap:8,alignItems:'center'}}><BottleSessionCard compact data={data} onUpdate={update} disabled={!!busy||saving}/><Button small secondary label={lang==='zh'?`待核对 ${pendingReviews(data).length}`:`Review ${pendingReviews(data).length}`} onPress={()=>{setTab('records');setRecordSection('review')}}/></View>
                <TodayView
                  {...{
                    data,
                    date,
                    wide,
                    age,
                    messages,pendingNursing,pendingSleep,pendingBottle,
                    onCancelAI: () => aiAbort.current?.abort(),
                    caps,
                    drafts,
                    media,
                    recording,
                    input,
                    busy,
                    saving,
                    recent,
                    confirmDrafts,
                    savedVersion,
                    setDrafts: changeDrafts,
                    setEditor,
                    setMedia,
                    onPreview: openPreview,
                    withConsent,
                    runASR,
                    finishRecording,
                    cancelRecording,
                    setInput,
                    setAttachments: (open: boolean) => {
                      setAttachmentTarget("composer");
                      setAttachments(open);
                    },
                    cancelSleep: () => setCancelSleepOpen(true),
                    onTrends: () => { setRecordSection("trends"); setTab("records"); },
                    beginRecording,
                    sendText,
                    newRecord,
                    toggleSleep,
                  }}
                />
                </View>
              ) : tab === "records" ? (
                <View style={{width:"100%",maxWidth:790,alignSelf:"center"}}>
                  <Heading size={29}>{lang === "zh" ? "记录" : "Records"}</Heading>
                  <SectionTabs value={recordSection} onChange={setRecordSection} items={[{value:"timeline",label:lang === "zh" ? "时间线" : "Timeline"},{value:"trends",label:lang === "zh" ? "日常趋势" : "Daily trends"},{value:"report",label:lang === "zh" ? "成长分享" : "Share report"},{value:"review",label:lang === "zh" ? "待核对" : "Review"}]}/>
                  {recordSection === "review" ? <ReviewCenter data={data} busy={!!busy||saving} onPreview={openPreview} onEdit={(r,item)=>{setReviewEditing(item.id);setEditor({record:{...r,targetRecordId:r.id,baseVersion:recordVersion(r)},mode:'saved'})}} onAdd={editReviewRecord} onRetry={retryReview} onApply={applyReviewAction} onResolve={item=>update(d=>resolveReview(d,item.id))}/> : recordSection === "report" ? <ReportScreen data={data}/> : recordSection === "trends" ? <AnalyticsView data={data} onEdit={r=>setEditor({record:r,mode:"saved"})} onAsk={text=>{setTab("today");sendText(text,null);}}/> : <Journal data={data} onUpdate={update} timer={<><BottleSessionCard data={data} onUpdate={update} disabled={!!busy||saving}/><NursingTimer data={data} onUpdate={update}/></>}
                  records={data.records}
                  onEdit={(r) => setEditor({ record: r, mode: "saved" })}
                  onPreview={openPreview}
                  onNew={(kind = "note") => newRecord(kind)}
                />}
                </View>
              ) : tab === "baby" ? (
                <BabyScreen onPreview={openPreview} onDeleteMedia={removeAlbumMedia}
                  data={data}
                  onSettings={() => setTab("settings")}
                  onNew={newRecord}
                  onEdit={(r) => setEditor({ record: r, mode: "saved" })}
                />
              ) : tab === "creation" ? <CreationScreen babyId={babyId}/> : (
                <>
                  <Pressable onPress={()=>setTab("baby")}><Txt color={c.primary}>{lang === "zh" ? "← 宝宝" : "← Baby"}</Txt></Pressable>
                  <SettingsScreen onGuide={()=>setGuideOpen(true)} onUpdate={update}
                    babies={babyCards} activeBaby={babyId} switching={switching}
                    onSwitchBaby={id=>changeBaby(id)} onAddBaby={()=>changeBaby()}
                    onProfile={()=>setProfileEdit(true)}
                    data={data}
                    caps={caps}
                    onRefresh={() => refresh(true)}
                    onNotice={setNotice}
                    onSettings={(settings) =>
                      update((d) => ({ ...d, settings }))
                    }
                    onClear={async () => {
                      if (await update(() => initialData)) {
                        await clearVoiceStorage(babyId);
                        await deleteAttachments(data.records.flatMap(r=>r.attachments||[]).concat(messages.flatMap(m=>m.attachments||[]),drafts.flatMap(r=>r.attachments||[]),(data.reviewQueue||[]).flatMap(r=>r.attachments||[]))).catch(() =>
                          setNotice(t.fileError),
                        );
                        setMessages([]);
                        setDrafts([]);
                        setMedia(null);
                        setInput("");
                        setTab("today");
                      }
                    }}
                  />
                </>
              )}
            </PageBody>
          </View>
          {!wide && !focused && !keyboardOpen && nav}
          {!!notice && (
            <Pressable
              accessibilityRole="alert"
              onPress={() => setNotice("")}
              style={{
                position: "absolute",
                bottom: tab==="today" ? undefined : wide ? 25 : 90,
                top: tab==="today" ? 8 : undefined,
                left: 20,
                right: 20,
                alignSelf: "center",
                maxWidth: 800,
                backgroundColor: c.ink,
                padding: 16,
                borderRadius: 16,
              }}
            >
              <Txt color={c.bg} size={13}>
                {notice}
              </Txt>
            </Pressable>
          )}
        </View>
        <WelcomeGuide key={babyId} data={data} visible={guideOpen||!data.settings.onboardingVersion} onClose={()=>setGuideOpen(false)} onUpdate={update}/>
        {editor && (
          <Editor
            key={editor.record.id}
            isNew={editor.mode === "new"}
            record={editor.record}
            visible={!editorHidden}
            onDismiss={()=>{const f=editorAction.current;editorAction.current=null;f?.();}}
            onPreview={openPreview}
            onClose={closeEditor}
            onAttach={(kind) => {
              setAttachmentTarget("editor");
              afterEditorHidden(()=>kind==='note'?void pick('camera','editor'):setAttachments(true));
            }}
            onSave={saveEditor}
            onDelete={
              editor.mode === "saved"
                ? async () => {
                    if (
                      await update((d) => ({
                        ...d,
                        records: d.records.filter(
                          (r) => r.id !== editor.record.id,
                        ),
                      }))
                    ) {
                      await deleteAttachments(
                        (editor.record.attachments || []).filter(a=>![...dataRef.current.records,...(dataRef.current.reviewQueue||[])].some(r=>r.attachments?.some(x=>x.id===a.id))),
                      ).catch(() => {});
                      setEditor(null);
                      setNotice(t.deleted);
                    }
                  }
                : undefined
            }
          />
        )}
        <Sheet
          visible={cancelSleepOpen}
          title={t.cancelSleepTitle}
          onClose={() => setCancelSleepOpen(false)}
        >
          <Txt color={c.muted} style={{ marginBottom: 20 }}>
            {t.cancelSleepHint}
          </Txt>
          <View style={{ gap: 12 }}>
            <Button
              label={t.continueSleep}
              onPress={() => setCancelSleepOpen(false)}
            />
            <Button
              label={t.discardSleep}
              danger
              secondary
              onPress={async () => {
                if (await update((d) => ({ ...d, sleepStart: undefined }))) {
                  setCancelSleepOpen(false);
                  if (sleepDraftStart)
                    setDrafts((rs) => rs.filter((r) => r.kind !== "sleep"));
                  setSleepDraftStart(null);
                }
              }}
            />
          </View>
        </Sheet>
        <Sheet
          visible={profileEdit}
          title={t.baby}
          onClose={() => setProfileEdit(false)}
        >
          <ProfileForm
            profile={data.profile}
            onSave={async (profile) => {
              if (await update((d) => ({ ...d, profile })))
                setProfileEdit(false);
            }}
          />
        </Sheet>
        <Sheet
          visible={attachments}
          title={t.attachment}
          onDismiss={() => { const action = pickerAction.current; pickerAction.current = null; if(action)action();else setEditorHidden(false); }}
          onClose={() => {setAttachments(false);if(Platform.OS!=="ios")setEditorHidden(false);}}
        >
          <View style={{ gap: 12 }}>
            <Txt color={c.muted} size={13}>
              {t.attachmentHint}
            </Txt>
            <Button
              label={t.camera}
              icon={Camera}
              secondary
              onPress={() => closeAttachmentsThen(() => pick("camera"))}
            />
            <Button
              label={t.library}
              icon={ImagePlus}
              secondary
              onPress={() => closeAttachmentsThen(() => pick("library"))}
            />
            <Button
              label={t.video}
              icon={Video}
              secondary
              onPress={() => closeAttachmentsThen(() => pick("video"))}
            />
            {attachmentTarget === "composer" && (
              <Button
                label={t.sound}
                icon={AudioLines}
                secondary
                onPress={() => closeAttachmentsThen(() => beginRecording("sound"))}
              />
            )}
          </View>
        </Sheet>
        <Sheet
          visible={consent}
          title={t.aiConsentTitle}
          onClose={() => {
            setConsent(false);
            pendingAction.current = null;
          }}
        >
          <Txt color={c.muted} style={{ marginBottom: 20 }}>
            {t.aiConsentBody}
          </Txt>
          <Button
            label={t.consent}
            onPress={() => {
              consentGiven.current = true;
              setConsent(false);
              pendingAction.current?.();
              pendingAction.current = null;
            }}
          />
        </Sheet>
        <MediaViewer onDelete={!editor&&previewAttachment&&previewAttachment.role!=="source"&&data.records.some(r=>r.attachments?.some(a=>a.id===previewAttachment.id))?async a=>removeAlbumMedia([a.id]):undefined} attachment={previewAttachment} onClose={()=>{setPreviewAttachment(null);if(Platform.OS!=="ios")setEditorHidden(false);}} onDismiss={()=>setEditorHidden(false)}/>
      </SafeAreaView>
    </UIContext.Provider>
  );
}
const babyRepository=createBabyRepository(AsyncStorage);
function BabyHost(){
 const [entry,setEntry]=useState(0);
 const [entryAction,setEntryAction]=useState("record");
 const [index,setIndex]=useState<BabyIndex|null>(null),[error,setError]=useState(false);
 const load=()=>babyRepository.loadIndex().then(setIndex).catch(()=>setError(true));
 useEffect(()=>{load();const open=async(url:string|null)=>{if(!url?.startsWith('babyai://record?'))return;try{const id=new URL(url).searchParams.get('babyId');if(id){setIndex(await babyRepository.activate(id));setEntryAction(new URL(url).searchParams.get("action")==="nursing"?"nursing":"record");setEntry(n=>n+1);}}catch{}};Linking.getInitialURL().then(open);const stop=observeNotification(id=>open(`babyai://record?babyId=${encodeURIComponent(id)}`));const sub=Linking.addEventListener('url',e=>open(e.url));return()=>{sub.remove();stop()}},[]);
 if(!index)return <View style={{flex:1,justifyContent:"center",alignItems:"center"}}><Txt>{error?"宝宝档案读取失败":"正在打开宝宝档案…"}</Txt>{error&&<Button label="重试" onPress={load}/>}</View>;
 return <AppBody entryAction={entryAction} entry={entry} key={index.active} babyId={index.active} babyIds={index.ids} onSwitch={async id=>{setIndex(await babyRepository.activate(id))}} onAdd={async()=>{setIndex(await babyRepository.add(uid()))}}/>;
}
export default function App() {
  return (
    <SafeAreaProvider>
      <BabyHost />
    </SafeAreaProvider>
  );
}
