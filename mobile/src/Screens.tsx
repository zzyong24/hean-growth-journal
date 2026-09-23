import {ProviderSettings} from './providers/ProviderSettings';
import {exportCSV} from './exportCSV';
import {configureVoice} from './voiceStorage';
import {VoiceSetup} from "./WelcomeGuide";

import {SectionTabs} from "./SectionTabs";
import {GrowthAlbum} from "./care/GrowthAlbum";
import {BirthArt} from "./BirthArt";
import { birthFacts } from "./birthFacts";
import { exportAttachments } from "./attachmentStorage";
import React, { useState } from "react";
import { View, Pressable, Platform, Share, Linking, ScrollView } from "react-native";
import {
  Download,
  Trash2,
  ChevronRight,
  Check,
  RefreshCw,
  Shield,
  Globe,
  MapPin,
  Plus,
} from "lucide-react-native";
import Svg, { Path, Circle, Line, Text as SvgText } from "react-native-svg";
import {
  AppData,
  Profile,
  Settings,
  validBirthday,
  validBirthTime,
  ageDays,
  CareRecord,
} from "./domain";
import { Capabilities } from "./api";
import {
  Button,
  Choice,
  Field,
  Txt,
  Art,
  Wordmark,
  Heading,
  Sheet,
  layout,
  useUI,
} from "./ui";
import { themes } from "./i18n";
export function ProfileForm({
  profile,
  onSave,
  onClose,
}: {
  profile: Profile;
  onSave: (p: Profile) => void;
  onClose?: () => void;
}) {
  const { t, c } = useUI();
  const [name, setName] = useState(profile.name);
  const [sex,setSex]=useState<"male"|"female"|undefined>(profile.sex);
  const [weight,setWeight]=useState("");
  const [height,setHeight]=useState("");
  const [birthday, setBirthday] = useState(profile.birthday);
  const [birthTime, setBirthTime] = useState(profile.birthTime || "");
  const [error, setError] = useState(false);
  return (
    <View style={{ gap: 8 }}>
      <Heading size={27} style={{ textAlign: "center", marginTop: 15 }}>
        {t.profileIntro}
      </Heading>
      <Txt
        color={c.muted}
        size={14}
        style={{ textAlign: "center", marginTop: 5 }}
      >
        {t.profileDesc}
      </Txt>
      <View style={{ alignItems: "center", marginVertical: 14 }}>
        <Art name="baby" size={190} />
      </View>
      <Field
        label={t.babyName}
        value={name}
        onChange={setName}
        placeholder={t.nameHint}
      />
      <View style={{flexDirection:"row",gap:12,marginBottom:16}}>{(["male","female"] as const).map(value=><Choice key={value} label={value==="male"?(t.settings==="设置"?"男孩":"Boy"):(t.settings==="设置"?"女孩":"Girl")} selected={sex===value} onPress={()=>setSex(value)}/>)}</View>
      {!profile.name&&<View style={{flexDirection:"row",gap:12}}><View style={{flex:1}}><Field label={t.weight+" (kg)"} value={weight} onChange={setWeight} number/></View><View style={{flex:1}}><Field label={t.height+" (cm)"} value={height} onChange={setHeight} number/></View></View>}
      <Field
        label={`${t.birthday} · ${t.birthTime}`}
        dateMode="datetime"
        withSeconds
        maxDate={new Date().toLocaleDateString("en-CA")}
        value={birthday + (birthTime ? ` ${birthTime}` : "")}
        onChange={(value) => {
          const [date, time = ""] = value.split(" ");
          setBirthday(date);
          setBirthTime(time);
        }}
      />
      <Txt
        color={c.muted}
        size={12}
        style={{ textAlign: "center", marginTop: -12, marginBottom: 24 }}
      >
        {t.editLater}
      </Txt>
      {error && <Txt color="#B45B48">{t.invalidProfile}</Txt>}
      <Button
        label={profile.name ? t.saveChanges : t.start}
        onPress={() => {
          if (
            !name.trim() ||
            !sex ||
            (!profile.name && (!(Number(weight)>0&&Number(weight)<=50)||!(Number(height)>=20&&Number(height)<=150))) ||
            name.trim().length > 40 ||
            !validBirthday(birthday) ||
            !validBirthTime(birthTime) ||
            Date.parse(`${birthday}T${birthTime}`) > Date.now()
          ) {
            setError(true);
            return;
          }
          onSave({
            ...profile,
            sex,
            ...(!profile.name?{initialWeight:Number(weight),initialHeight:Number(height)}:{}),
            name: name.trim(),
            birthday,
            birthTime,
            bornAt:
              profile.birthday === birthday &&
              profile.birthTime === birthTime &&
              profile.bornAt
                ? profile.bornAt
                : new Date(`${birthday}T${birthTime}`).toISOString(),
            birthTimezone:
              profile.birthday === birthday &&
              profile.birthTime === birthTime &&
              profile.birthTimezone
                ? profile.birthTimezone
                : Intl.DateTimeFormat().resolvedOptions().timeZone,
          });
        }}
      />
      {onClose && <Button label={t.cancel} onPress={onClose} secondary />}
    </View>
  );
}
function MeasurementChart({
  records,
  kind,
}: {
  records: CareRecord[];
  kind: "weight" | "height" | "head";
}) {
  const { c, t } = useUI();
  const [width, setWidth] = useState(340);
  const rs = records
    .filter((r) => r.kind === kind && r.value !== undefined)
    .sort((a,b) => Date.parse(a.at)-Date.parse(b.at));
  const max = Math.max(
    kind === "weight" ? 5 : 60,
    Math.ceil(Math.max(...rs.map((r) => r.value || 0), 1) * 1.15),
  );
  const h = 200,
    left = 35,
    right = 15,
    top = 18,
    bottom = 36;
  const points = rs.map((r, i) => ({
    x:
      left +
      (rs.length === 1 || rs[0].at === rs.at(-1)!.at ? 0.5 : (Date.parse(r.at)-Date.parse(rs[0].at))/(Date.parse(rs.at(-1)!.at)-Date.parse(rs[0].at))) * (width - left - right),
    y: top + (1 - (r.value || 0) / max) * (h - top - bottom),
    r,
  }));
  const ticks = Array.from({ length: 5 }, (_, i) => (i * max) / 4);
  return (
    <View
      onLayout={(e) => setWidth(Math.max(200, e.nativeEvent.layout.width))}
      style={{ marginTop: 16 }}
    >
      {!rs.length ? (
        <View
          style={{
            height: 180,
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
          }}
        >
          <Art name="botanical" size={65} />
          <Txt color={c.muted} size={13}>
            {t.growthHint}
          </Txt>
        </View>
      ) : (
        <Svg width="100%" height={h} viewBox={`0 0 ${width} ${h}`}>
          {ticks.map((n) => {
            const y = top + (1 - n / max) * (h - top - bottom);
            return (
              <React.Fragment key={n}>
                <Line
                  x1={left}
                  x2={width - right}
                  y1={y}
                  y2={y}
                  stroke={c.line}
                  strokeDasharray="3,3"
                />
                <SvgText
                  x={left - 8}
                  y={y + 4}
                  fill={c.muted}
                  textAnchor="end"
                  fontSize={10}
                >
                  {Number(n.toFixed(1))}
                </SvgText>
              </React.Fragment>
            );
          })}
          {points.length > 1 && (
            <Path
              d={points
                .map((p, i) => `${i ? "L" : "M"}${p.x},${p.y}`)
                .join(" ")}
              stroke={c.primary}
              strokeWidth={1.6}
              fill="none"
            />
          )}
          {points.map(({ x, y, r }) => (
            <React.Fragment key={r.id}>
              <Circle cx={x} cy={y} r={4.2} fill={c.primary} />
              <SvgText
                x={x}
                y={y - 12}
                fill={c.ink}
                textAnchor="middle"
                fontSize={12}
              >
                {r.value}
              </SvgText>
              <SvgText
                x={x}
                y={h - 10}
                fill={c.muted}
                textAnchor="middle"
                fontSize={10}
              >{`${new Date(r.at).getMonth() + 1}/${new Date(r.at).getDate()}`}</SvgText>
            </React.Fragment>
          ))}
        </Svg>
      )}
    </View>
  );
}
export function BabyScreen({
  data,
  onPreview,
  onSettings,
  onNew,
  onEdit,
}: {
  data: AppData;
  onPreview: (a:NonNullable<CareRecord["attachments"]>[number])=>void;
  onSettings: () => void;
  onNew: (k: "weight" | "height" | "head") => void;
  onEdit: (r: CareRecord) => void;
}) {
  const { t, c } = useUI();
  const [section, setSection] = useState<"growth" | "album">("growth");
  const [kind, setKind] = useState<"weight" | "height" | "head">("weight");
  const [range, setRange] = useState<30 | 90 | 0>(90);
  const [measurementLimit, setMeasurementLimit] = useState(30);
  const measurements = data.records.filter(r => r.kind === kind).sort((a,b) => Date.parse(b.at)-Date.parse(a.at));
  const visibleMeasurements = measurements.filter(r => !range || Date.parse(r.at) >= Date.now()-range*86400000);
  const delta = measurements.length > 1 ? measurements[0].value! - measurements[1].value! : null;
  const days = ageDays(data.profile,new Date(),data.settings.region==='CN'?'Asia/Shanghai':Intl.DateTimeFormat().resolvedOptions().timeZone);
  const facts = birthFacts(data.profile.birthday, data.settings.language);
  return (
    <View style={{ maxWidth: 680, width: "100%", alignSelf: "center" }}>
      <Pressable accessibilityRole="button" accessibilityLabel={t.settings} onPress={onSettings} style={{alignSelf:"flex-end",padding:10}}><Txt size={13} color={c.muted}>{t.settings}</Txt></Pressable>
      <View style={{flexDirection:"row",alignItems:"center",gap:8,marginVertical:12}}>
        <View style={{width:82,gap:14,alignItems:"center"}}>{facts&&<><View style={{alignItems:"center"}}><BirthArt index={facts.animalIndex} size={64}/><Txt size={12}>{facts.animal}</Txt></View><View style={{alignItems:"center"}}><BirthArt index={12+facts.signIndex} size={64}/><Txt size={12}>{facts.sign}</Txt></View></>}</View>
        <View style={{flex:1,alignItems:"center",gap:8}}><Art name="baby" size={110}/><Txt size={24} weight="600">{data.profile.name}</Txt><Txt color={c.muted}>{days} {t.day}</Txt></View>
        <View style={{width:82,gap:10}}>{(["weight","height","head"] as const).map(k=>{const latest=[...data.records].filter(r=>r.kind===k).sort((a,b)=>b.at.localeCompare(a.at))[0];return <Pressable key={k} accessibilityRole="button" accessibilityLabel={t[k]} onPress={()=>{setSection("growth");setKind(k);onNew(k);}} style={{alignItems:"center",paddingVertical:4}}><Txt size={12} color={c.muted}>{t[k]}</Txt><Txt size={23}>{latest?.value??"—"}</Txt><Txt size={11} color={c.muted}>{k==="weight"?"kg":"cm"}</Txt></Pressable>})}</View>
      </View>
      <View style={{gap:6,paddingVertical:16,marginBottom:20,borderTopWidth:1,borderBottomWidth:1,borderColor:c.line}}><Txt size={12} color={c.muted}>{data.settings.language==="zh"?"阳历":"Gregorian"} · {data.profile.birthday} {data.profile.birthTime||""}</Txt><Txt size={12} color={c.muted}>{data.settings.language==="zh"?"农历":"Lunar"} · {facts?.lunar||"—"}</Txt></View>
      <SectionTabs value={section} onChange={setSection} items={[{value:"growth",label:data.settings.language==="zh"?"生长":"Growth"},{value:"album",label:data.settings.language==="zh"?"相册":"Album"}]}/>
      {section === "album" ? <GrowthAlbum data={data} onPreview={onPreview}/> : <>
      <View style={{flexDirection:"row",gap:8}}>{(["weight","height","head"] as const).map(k=><Choice key={k} label={t[k]} selected={kind===k} onPress={()=>{setKind(k);setMeasurementLimit(30)}}/>)}</View>
      <View style={{ flexDirection: "row", gap: 8, marginTop: 16 }}>
        {([30,90,0] as const).map(days => <Choice key={days} label={days ? `${days}${data.settings.language === "zh" ? "天" : " days"}` : data.settings.language === "zh" ? "全部" : "All"} selected={range === days} onPress={() => setRange(days)} />)}
      </View>
      <Txt color={c.muted} size={13} style={{ marginTop: 12 }}>{delta === null ? (data.settings.language === "zh" ? "记录两次测量后，可查看前后变化" : "Add two measurements to compare") : `${data.settings.language === "zh" ? "较上次测量" : "Since last measurement"} ${delta > 0 ? "+" : ""}${Math.round(delta*100)/100} ${kind === "weight" ? "kg" : "cm"}`}</Txt>
      <MeasurementChart records={visibleMeasurements} kind={kind} />
      <Heading size={18} style={{ marginTop: 22, marginBottom: 12 }}>{data.settings.language === "zh" ? "测量历史" : "Measurements"}</Heading>
      {visibleMeasurements.slice(0,measurementLimit).map(r => <Pressable key={r.id} accessibilityRole="button" onPress={() => onEdit(r)} style={{ paddingVertical: 14, borderBottomWidth: 1, borderColor:c.line, flexDirection:"row",justifyContent:"space-between" }}><Txt>{new Date(r.at).toLocaleString(data.settings.language === "zh" ? "zh-CN" : "en-US", {year:"numeric",month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"})}</Txt><Txt>{r.value} {r.unit} ›</Txt></Pressable>)}
      {visibleMeasurements.length > measurementLimit && <Button secondary label={data.settings.language === "zh" ? "查看更多测量" : "More measurements"} onPress={() => setMeasurementLimit(n => n + 30)} />}      </>}
    </View>
  );
}
export function SettingsScreen({
  data,
  onSettings,
  onClear,
  caps,
  onRefresh,
  onNotice,
  onGuide, onProfile, babies, activeBaby, switching, onSwitchBaby, onAddBaby, onUpdate,
}: {
  onUpdate:(fn:(d:AppData)=>AppData)=>Promise<boolean>;
  babies:{id:string;name:string}[];activeBaby:string;switching:boolean;onSwitchBaby:(id:string)=>void;onAddBaby:()=>void;
  onGuide: () => void;
  onProfile: () => void;
  data: AppData;
  onSettings: (s: Settings) => void;
  onClear: () => void;
  caps: Capabilities;
  onRefresh: () => void;
  onNotice: (s: string) => void;
}) {
  const { t, c } = useUI();
  const [sheet, setSheet] = useState<
    "language" | "region" | "privacy" | "clear" | null
  >(null);
  const [ai, setAI] = useState(false);
  const [providers,setProviders]=useState(false);
  const [voiceGuide, setVoiceGuide] = useState(false);
  const [widgetGuide,setWidgetGuide]=useState(false);
  const setting = (patch: Partial<Settings>) =>
    onSettings({ ...data.settings, ...patch });
  async function exportData() {
    try {
      const text = JSON.stringify(
        {
          ...data,
          mediaFiles: await exportAttachments(
            data.records.flatMap((r) => r.attachments || []),
          ),
        },
        null,
        2,
      );
      if (Platform.OS === "web") {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(
          new Blob([text], { type: "application/json" }),
        );
        a.download = `baby-ai-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(a.href);
      } else await Share.share({ message: text, title: "禾安成长日记" });
      onNotice(t.exported);
    } catch {
      onNotice(t.saveError);
    }
  }
  const row = (
    label: string,
    value: string,
    Icon: any,
    onPress: () => void,
    danger = false,
  ) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 18,
        gap: 15,
        borderBottomWidth: 1,
        borderColor: c.line,
      }}
    >
      <Icon size={21} strokeWidth={1.4} color={c.primary} />
      <Txt size={16} color={danger ? c.primary : c.ink} style={{ flex: 1 }}>
        {label}
      </Txt>
      {!!value && (
        <Txt size={13} color={c.muted}>
          {value}
        </Txt>
      )}
      <ChevronRight size={17} color={c.muted} strokeWidth={1.4} />
    </Pressable>
  );
  return (
    <View style={{ maxWidth: 660, width: "100%", alignSelf: "center" }}>
      <Heading size={28} style={{marginVertical:20}}>{t.settingsTitle}</Heading>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:12,paddingVertical:12,marginBottom:20}}>
        {babies.map(b=><Pressable key={b.id} accessibilityRole="button" accessibilityLabel={`${data.settings.language==="zh"?"切换宝宝":"Switch baby"} ${b.name}`} accessibilityState={{selected:b.id===activeBaby}} disabled={switching||b.id===activeBaby} onPress={()=>onSwitchBaby(b.id)} style={{width:190,minHeight:120,padding:18,borderRadius:22,backgroundColor:b.id===activeBaby?c.tint:c.surface,borderWidth:1,borderColor:b.id===activeBaby?c.primary:c.line,gap:8}}><Art name="baby" size={48}/><Txt weight="600">{b.name}</Txt>{b.id===activeBaby&&<Txt size={11} color={c.primary}>{data.settings.language==="zh"?"当前宝宝":"Current baby"}</Txt>}</Pressable>)}
        <Pressable accessibilityRole="button" accessibilityLabel={data.settings.language==="zh"?"添加新宝宝":"Add baby"} disabled={switching} onPress={onAddBaby} style={{width:190,minHeight:120,padding:18,borderRadius:22,backgroundColor:c.tint,alignItems:"center",justifyContent:"center",gap:10}}><Plus size={28} color={c.primary}/><Txt color={c.primary}>{data.settings.language==="zh"?"添加新宝宝":"Add baby"}</Txt></Pressable>
      </ScrollView>
      <Heading size={18}>{data.settings.language==="zh"?"宝宝与记录":"Baby & logging"}</Heading>
      {row(data.settings.language==="zh"?"宝宝档案":"Baby profile",data.profile.name,Check,onProfile)}
      {row(data.settings.language==="zh"?"新手引导":"Getting started", "", RefreshCw,onGuide)}
      {row(data.settings.language==="zh"?"Siri 快速记录":"Siri quick logging", "", RefreshCw,()=>setVoiceGuide(true))}
      {row(data.settings.language==="zh"?"桌面与锁屏小组件":"Home & Lock Screen widgets", "", Plus,()=>setWidgetGuide(true))}
      <Sheet visible={widgetGuide} title={data.settings.language==="zh"?"添加小组件":"Add a widget"} onClose={()=>setWidgetGuide(false)}><Txt>{data.settings.language==="zh"?"长按 iPhone 桌面空白处 → 编辑 → 添加小组件 → 搜索 禾安成长日记。锁屏长按 → 自定 → 添加小组件。小组件显示 App 当前宝宝最近同步的概况，点击后进入该宝宝的记录对话。":"Long press the Home Screen → Edit → Add Widget → 禾安成长日记. On the Lock Screen, choose Customize → Add Widgets. Shows the current baby’s last synced summary; tap to log."}</Txt></Sheet>
      <Sheet visible={voiceGuide} title={data.settings.language === "zh" ? "不用打开 App，也能记一笔" : "Log without opening the app"} onClose={() => setVoiceGuide(false)}>
        <VoiceSetup data={data} onSettings={onSettings} onNotice={onNotice}/>
      </Sheet>

      <Heading size={18} style={{marginTop:28,marginBottom:16}}>{data.settings.language==="zh"?"外观与语言":"Appearance & language"}</Heading>
      <Heading size={20} style={{ marginBottom: 18 }}>
        {t.theme}
      </Heading>
      <View style={{ flexDirection: "row", gap: 15, marginBottom: 35 }}>
        {(["peach", "sage", "night"] as const).map((k) => {
          const theme = themes[k],
            selected = data.settings.theme === k;
          return (
            <Pressable
              key={k}
              accessibilityRole="button"
              accessibilityLabel={t[k]}
              accessibilityState={{ selected }}
              onPress={() => setting({ theme: k })}
              style={{ flex: 1, alignItems: "center", gap: 10 }}
            >
              <View
                style={{
                  width: "100%",
                  height: 128,
                  maxWidth: 150,
                  borderRadius: 16,
                  borderWidth: selected ? 2 : 1,
                  borderColor: selected ? c.primary : c.line,
                  backgroundColor: theme.bg,
                  padding: 10,
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <Txt
                  size={12}
                  color={theme.primary}
                  weight="600"
                  style={{ alignSelf: "flex-start" }}
                >
                  禾安成长日记
                </Txt>
                <Art name="baby" size={65} />
                <View style={{ flexDirection: "row", gap: 12 }}>
                  <Globe size={11} color={theme.primary} />
                  <Shield size={11} color={theme.muted} />
                  <MapPin size={11} color={theme.muted} />
                </View>
                {selected && (
                  <View
                    style={{
                      position: "absolute",
                      right: -5,
                      top: -6,
                      backgroundColor: c.primary,
                      borderRadius: 20,
                      padding: 4,
                      borderWidth: 2,
                      borderColor: c.bg,
                    }}
                  >
                    <Check size={14} color="#fff" />
                  </View>
                )}
              </View>
              <Txt size={14}>{t[k]}</Txt>
            </Pressable>
          );
        })}
      </View>

      {row(
        t.language,
        data.settings.language === "zh" ? "简体中文" : "English",
        Globe,
        () => setSheet("language"),
      )}
      <Heading size={20} style={{ marginTop:28, marginBottom: 4 }}>
        {t.data}
      </Heading>
      {row("模型与连接", "", Globe, ()=>setProviders(true))}
      {providers&&<ProviderSettings onClose={()=>setProviders(false)} onSaved={()=>{onRefresh();configureVoice(data).catch(()=>onNotice("语音快捷配置未更新，请重新打开 App"));}}/>}
      {row("导出事件流 CSV", "当前宝宝", Download, ()=>exportCSV(data).catch(()=>onNotice(t.saveError)))}
      {row(t.export, "", Download, exportData)}
      {row(t.privacyTitle, "", Shield, () => setSheet("privacy"))}
      {row(data.settings.language==="zh"?"清空当前宝宝数据":"Clear this baby’s data", "", Trash2, () => setSheet("clear"), true)}
      <Txt size={12} color={c.muted} style={{ marginTop: 12 }}>
        {t.yourData}
      </Txt>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t.model}
        onPress={() => setAI(!ai)}
        style={[layout.between, { marginTop: 25, paddingVertical: 14 }]}
      >
        <Txt color={c.muted} size={12}>
          {t.model}
        </Txt>
        <ChevronRight size={15} color={c.muted} />
      </Pressable>
      {ai && (
        <View style={{ gap: 12, paddingVertical: 10 }}>
          {[
            ["GPT", caps.text],
            ["Qwen ASR", caps.asr],
            ["Qwen Omni", caps.omni],
          ].map(([name, ok]) => (
            <View key={String(name)} style={layout.between}>
              <Txt size={13}>{name}</Txt>
              <Txt size={11} color={c.muted}>
                {ok ? t.connected : t.unconfigured}
              </Txt>
            </View>
          ))}
          <Button
            label={t.retry}
            secondary
            small
            icon={RefreshCw}
            onPress={onRefresh}
          />
        </View>
      )}
      <Txt
        color={c.muted}
        size={11}
        style={{ textAlign: "center", marginVertical: 25 }}
      >
        {t.about}
      </Txt>
      <Sheet
        visible={sheet === "language"}
        title={t.language}
        onClose={() => setSheet(null)}
      >
        <View style={{ gap: 12 }}>
          <Choice
            label="简体中文"
            selected={data.settings.language === "zh"}
            onPress={() => {
              setting({ language: "zh" });
              setSheet(null);
            }}
          />
          <Choice
            label="English"
            selected={data.settings.language === "en"}
            onPress={() => {
              setting({ language: "en" });
              setSheet(null);
            }}
          />
        </View>
      </Sheet>

      <Sheet
        visible={sheet === "privacy"}
        title={t.privacyTitle}
        onClose={() => setSheet(null)}
      >
        <Txt color={c.muted} style={{ marginBottom: 22 }}>
          {t.privacy}
        </Txt>
        <Button label={t.privacyContinue} onPress={() => setSheet(null)} />
      </Sheet>
      <Sheet
        visible={sheet === "clear"}
        title={t.clearTitle}
        onClose={() => setSheet(null)}
      >
        <Txt color={c.muted} style={{ marginBottom: 20 }}>
          {data.settings.language==="zh"?"仅清空当前宝宝的档案、记录和对话，其他宝宝不受影响。":"Clears this baby’s profile, records and conversation only. Other babies are unaffected."}
        </Txt>
        <Button
          label={t.clear}
          danger
          onPress={() => {
            setSheet(null);
            onClear();
          }}
        />
      </Sheet>
    </View>
  );
}
