import {applyMediaDeletions} from './care/mediaDeletion';
import {seedNotebookReviews,validReview} from './review/queue';
import {validBottleSession} from './care/bottleFlow';
import {validReminder} from "./reminders/plan";
import {babyKey} from "./babyRepository";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppData, initialData, validateRecord } from "./domain";
const KEY = "baby-ai:v1";
export async function loadData(babyId: string): Promise<AppData> {
  const raw = await AsyncStorage.getItem(babyKey(babyId,"data"));
  if (!raw) return {...initialData,babyId};
  const data = JSON.parse(raw);
  if (
    (data.reminders !== undefined && (!Array.isArray(data.reminders) || !data.reminders.every(validReminder))) ||
    (data.bottleSession!==undefined&&!validBottleSession(data.bottleSession)) ||
    (data.reviewQueue!==undefined&&(!Array.isArray(data.reviewQueue)||!data.reviewQueue.every(validReview))) ||
    (data.deletedMediaIds!==undefined&&(!Array.isArray(data.deletedMediaIds)||!data.deletedMediaIds.every((id:unknown)=>typeof id==='string'))) ||
    (data.mediaDeletionPending!==undefined&&(!Array.isArray(data.mediaDeletionPending)||!data.mediaDeletionPending.every((a:unknown)=>validateRecord({id:'media-cleanup',kind:'note',at:'2026-01-01T00:00:00Z',note:'',sourceText:'',attachments:[a]})))) ||
    data.version !== 1 ||
    !Array.isArray(data.records) ||
    !data.records.every(validateRecord) ||
    typeof data.profile?.name !== "string" ||
    typeof data.profile?.birthday !== "string" ||
    !["zh", "en"].includes(data.settings?.language) ||
    !["peach", "sage", "night"].includes(data.settings?.theme) ||
    !["CN", "overseas"].includes(data.settings?.region)
  )
    throw new Error("STORAGE_INVALID");
  const current=applyMediaDeletions({...data,babyId});
  const migrated=seedNotebookReviews(current);
  if(migrated!==current)await persist(migrated,babyId);
  return migrated;
}
export async function persist(data: AppData, babyId: string) {
  await AsyncStorage.setItem(babyKey(babyId,"data"), JSON.stringify(data));
}

export type ChatMessage = { sleepStarted?:string; at?:string; acceptedRecords?: AppData["records"]; nursingStarted?: AppData["nursingSession"]; id: string; role: "user" | "assistant"; text: string; sources?: {id:string;title:string;url:string}[]; attachments?: import("./domain").Attachment[] };
export type Conversation = { pendingBottle?:import("./care/bottleFlow").BottleAction; pendingSleep?:string; pendingNursing?:AppData["nursingSession"]; messages: ChatMessage[]; drafts: AppData["records"]; input: string };
const CHAT_KEY = "baby-ai:conversation:v1";
export async function loadConversation(babyId: string): Promise<Conversation> {
  const raw = await AsyncStorage.getItem(babyKey(babyId,"chat"));
  if (!raw) return { messages: [], drafts: [], input: "" };
  const c = JSON.parse(raw);
  if (!Array.isArray(c.messages) || !c.messages.every((m: ChatMessage) => m && typeof m.id === "string" && ["user", "assistant"].includes(m.role) && typeof m.text === "string") || !Array.isArray(c.drafts) || !c.drafts.every(validateRecord)) throw new Error("CHAT_INVALID");
  return { ...c, input: typeof c.input === "string" ? c.input : "" };
}
let chatWrites = Promise.resolve();
export function persistConversation(value: Conversation, babyId: string) {
  const serialized = JSON.stringify(value);
  const write = chatWrites.catch(() => {}).then(() => AsyncStorage.setItem(babyKey(babyId,"chat"), serialized));
  chatWrites = write;
  return write;
}
