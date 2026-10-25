import type {BottleSession,BottleFinish} from '../care/bottleFlow.ts';
import type {ReviewEntry} from '../review/queue.ts';
import { validDetails, eliminationSummary, type CareDetails } from "../care/details.ts";
export type Kind =
  | "bottle"
  | "nursing"
  | "diaper"
  | "sleep"
  | "temperature"
  | "weight"
  | "height"
  | "head" | "pumping" | "food" | "medicine" | "supplement"
  | "note";
export type Attachment = {
  sourceAssetId?: string;
  role?: "source" | "memory";
  livePhoto?: Attachment;
  capturedAt?: string;
  assetId?: string;
  id: string;
  type: "image" | "video" | "audio";
  mime: string;
  name: string;
};
export type CareRecord = {
  details?: CareDetails;
  targetRecordId?: string;
  baseVersion?: string;
  timePrecision?: "day" | "exact";
  id: string;
  kind: Kind;
  at: string;
  value?: number;
  unit?: string;
  side?: "left" | "right" | "both";
  note: string;
  sourceText: string;
  attachments?: Attachment[];
};
export type Profile = {
  sex?: "male" | "female";
  initialWeight?: number;
  initialHeight?: number;
  name: string;
  birthday: string;
  birthTime?: string;
  bornAt?: string;
  birthTimezone?: string;
};
export type Settings = {
  onboardingVersion?: number;
  voiceQuickRecord?: boolean;
  assistantSync?: boolean;
  language: "zh" | "en";
  theme: "peach" | "sage" | "night";
  region: "CN" | "overseas";
};
export type AppData = {
  mediaDeletionPending?: Attachment[];
  deletedMediaIds?: string[];
  bottleSession?: BottleSession;
  lastBottleFeed?: BottleFinish;
  bottleHistory?: {session:BottleSession;record?:CareRecord;status:string;at:string}[];
  reviewQueue?: ReviewEntry[];
  reminders?: import("../reminders/plan").Reminder[];
  babyId?: string;
  nursingSession?: {at:string;side:"left"|"right"};
  voiceReceiptIds?: string[];
  voiceReceiptConflicts?: string[];
  version: 1;
  profile: Profile;
  settings: Settings;
  records: CareRecord[];
  sleepStart?: string;
};
export const kinds: Kind[] = [
  "head", "pumping", "food", "medicine", "supplement",
  "bottle",
  "nursing",
  "diaper",
  "sleep",
  "temperature",
  "weight",
  "height",
  "note",
];
export const units: Record<Kind, string> = {
  head:"cm", pumping:"ml", food:"", medicine:"", supplement:"",
  bottle: "ml",
  nursing: "min",
  diaper: "",
  sleep: "min",
  temperature: "°C",
  weight: "kg",
  height: "cm",
  note: "",
};
export const initialData: AppData = {
  version: 1,
  profile: { name: "", birthday: "" },
  settings: { language: "zh", theme: "peach", region: "CN" },
  records: [],
};
export function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
export function validBirthday(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + "T00:00:00Z");
  const today = new Date();
  const currentDate = Date.UTC(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  return (
    Number.isFinite(date.getTime()) &&
    date.toISOString().slice(0, 10) === value &&
    date.getTime() <= currentDate &&
    date.getUTCFullYear() >= 2020
  );
}
export function validateRecord(r: any): boolean {
  if (
    !r ||
    !kinds.includes(r.kind) ||
    typeof r.id !== "string" ||
    !r.id ||
    typeof r.at !== "string" ||
    !Number.isFinite(Date.parse(r.at)) ||
    typeof r.note !== "string" ||
    typeof r.sourceText !== "string"
  )
    return false;
  if (r.value !== undefined && (!Number.isFinite(r.value) || r.value < 0))
    return false;
  if (!validDetails(r.details)) return false;
  if (r.kind!=="diaper" && (r.details?.urinationCount!==undefined || r.details?.diaperChangeCount!==undefined)) return false;
  if (r.details?.preparedMl !== undefined && (r.kind !== 'bottle' || Number(r.details.preparedMl) < r.value)) return false;
  if (["food","medicine","supplement"].includes(r.kind)&&!r.details?.item?.trim()) return false;
  if (r.kind === 'bottle' && r.details?.preparedMl !== undefined
    ? !(Number(r.details.preparedMl)>0 && Number.isFinite(r.value))
    : !["diaper", "note", "food", "medicine", "supplement"].includes(r.kind) && !(Number(r.value) > 0))
    return false;
  if (r.side !== undefined && !["left", "right", "both"].includes(r.side))
    return false;
  if (
    r.attachments !== undefined &&
    (!Array.isArray(r.attachments) ||
      r.attachments.length > 9 ||
      !r.attachments.every(
        (a: any) =>
          a &&
          typeof a.id === "string" &&
          /^[a-zA-Z0-9_-]+$/.test(a.id) &&
          ["image", "video", "audio"].includes(a.type) &&
          typeof a.mime === "string" &&
          a.mime.startsWith(a.type + "/") &&
          typeof a.name === "string" &&
          a.name.length <= 255 &&
          (a.livePhoto === undefined || (a.type === "image" && a.livePhoto?.type === "video" && typeof a.livePhoto.id === "string" && /^[a-zA-Z0-9_-]+$/.test(a.livePhoto.id) && a.livePhoto.mime === "video/quicktime" && typeof a.livePhoto.name === "string" && a.livePhoto.name.length <= 255 && a.livePhoto.livePhoto === undefined)),
      ))
  )
    return false;
  if (
    r.kind === "note" &&
    !r.note.trim() &&
    !r.sourceText.trim() &&
    !r.attachments?.length
  )
    return false;
  return r.note.length <= 4000 && r.sourceText.length <= 8000;
}
export function recordVersion(r: CareRecord) {
  return JSON.stringify([r.id,r.kind,r.at,r.value,r.note,r.side,r.timePrecision,r.attachments,r.details]);
}
export function mergeRecords(current: CareRecord[], incoming: CareRecord[]) {
  if (!incoming.every(validateRecord)) throw new Error("INVALID_RECORD");
  for (const r of incoming) {
    if (r.targetRecordId) {
      const target=current.find(x=>x.id===r.targetRecordId);
      if(!target||r.id!==target.id||recordVersion(target)!==r.baseVersion) throw new Error("STALE_RECORD_UPDATE");
    }
  }
  incoming=incoming.map(({targetRecordId,baseVersion,...r})=>r);
  return [
    ...new Map(
      [...current, ...incoming].map((r) => [
        r.id,
        { ...r, unit: units[r.kind] },
      ]),
    ).values(),
  ].sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
}
export function parseLocal(
  text: string,
  now = new Date().toISOString(),
): CareRecord[] {
  if (/^[\d\s.,，。!?！？]+$/.test(text.trim())) return [];

  if (/[?？]|多少|为什么|怎么|是否|how |should |what |why /i.test(text))
    return [];
  return text
    .split(/[，,。;；\n]|然后|\band then\b/i)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((part) => {
      let at = now;
      const relative = part.match(
        /(\d+)\s*(分钟|小时|minutes?|hours?)\s*(前|ago)/i,
      );
      if (relative)
        at = new Date(
          Date.parse(now) -
            Number(relative[1]) *
              (/小时|hour/i.test(relative[2]) ? 3600000 : 60000),
        ).toISOString();
      const r: CareRecord = {
        id: uid(),
        kind: "note",
        at,
        note: part,
        sourceText: text,
      };
      // Local mode intentionally leaves uncertain language untouched for manual review.
      if (
        /剩|还剩|left over|remaining|没|未|不想|didn.t|did not|明天|后天|打算|准备|计划|will |plan |昨天|前天|\d+[点:：]|yesterday|tomorrow/i.test(
          part,
        )
      )
        return r;
      const n = part.match(
        /(?:亲喂|母乳|nurs\w*|breast\w*).*?(\d+(?:\.\d+)?)\s*(分钟|min)/i,
      );
      const milk = part.match(/(\d+(?:\.\d+)?)\s*(毫升|ml)/i);
      const sl = part.match(
        /(?:睡了|睡觉|slept|sleep).*?(\d+(?:\.\d+)?)\s*(小时|分钟|hours?|min\w*)/i,
      );
      const temp = part.match(
        /(?:体温|temperature|temp).*?(\d+(?:\.\d+)?)\s*(?:度|°?c)?/i,
      );
      const weight = part.match(/(\d+(?:\.\d+)?)\s*(公斤|千克|kg)/i);
      const height = part.match(/(\d+(?:\.\d+)?)\s*(厘米|cm)/i);
      if (n) {
        r.kind = "nursing";
        r.value = Number(n[1]);
        r.side = /左|left/i.test(part)
          ? "left"
          : /右|right/i.test(part)
            ? "right"
            : undefined;
      } else if (milk && /喝|吃|drank|drunk|consumed|finished/i.test(part)) {
        r.kind = "bottle";
        r.value = Number(milk[1]);
      } else if (/尿布|尿了|拉了|大便|diaper|poop|peed/i.test(part)) {
        r.kind = "diaper";
      } else if (sl) {
        r.kind = "sleep";
        r.value = Number(sl[1]) * (/小时|hour/i.test(sl[2]) ? 60 : 1);
      } else if (temp) {
        r.kind = "temperature";
        r.value = Number(temp[1]);
      } else if (weight) {
        r.kind = "weight";
        r.value = Number(weight[1]);
      } else if (height) {
        r.kind = "height";
        r.value = Number(height[1]);
      }
      r.unit = units[r.kind];
      if (!validateRecord(r)) {
        r.kind = "note";
        delete r.value;
        r.unit = "";
      }
      return r;
    });
}
export function statsForDay(records: CareRecord[], day = new Date()) {
  const rs = records.filter(
    (r) => new Date(r.at).toDateString() === day.toDateString(),
  );
  return {
    count: rs.length,
    milk: rs
      .filter((r) => r.kind === "bottle")
      .reduce((s, r) => s + (r.value || 0), 0),
    bottles: rs.filter((r) => r.kind === "bottle").length,
    nursing: rs
      .filter((r) => r.kind === "nursing")
      .reduce((s, r) => s + (r.value || 0), 0),
    diapers: eliminationSummary(rs).changes.total,
    urinations: eliminationSummary(rs).urinations.total,
    sleep: rs
      .filter((r) => r.kind === "sleep")
      .reduce((s, r) => s + (r.value || 0), 0),
  };
}
/** Display age by calendar date, birthday is day one; not elapsed 24-hour periods. */
export function ageDays(profile: Profile, now=new Date(), timeZone=Intl.DateTimeFormat().resolvedOptions().timeZone) {
  if (!validBirthday(profile.birthday)) return null;
  const parts=new Intl.DateTimeFormat('en-US',{timeZone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
  const part=(type:string)=>Number(parts.find(p=>p.type===type)?.value);
  const today=Date.UTC(part('year'),part('month')-1,part('day'));
  const birth=Date.parse(profile.birthday+'T00:00:00Z');
  return Math.max(0,Math.round((today-birth)/86400000)+1);
}

export function validBirthTime(time: string) {
  return /^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(time);
}
