import {ReminderScreen} from './reminders/ReminderScreen';
import {remindersOnDate} from './reminders/plan';
import {AppData} from './domain';
import {recordGroups} from "./recordGroups";
import {monthDays,shiftMonth} from "./calendar";
import { AttachmentView } from "./AttachmentView";
import React, { useState, useRef } from "react";
import { View, Pressable, ScrollView, Platform } from "react-native";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Plus,
} from "lucide-react-native";
import { CareRecord, Kind, kinds } from "./domain";
import {
  Art,
  CareIcon,
  Heading,
  Txt,
  Choice,
  RecordRow,
  Button,
  Field,
  Sheet,
  layout,
  useUI,
} from "./ui";
export const dateKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export function Journal({
  timer,
  data,onUpdate,
  records,
  onEdit,
  onNew,
  onPreview,
}: {
  data:AppData;
  onUpdate:(fn:(d:AppData)=>AppData)=>Promise<boolean>;
  timer?: React.ReactNode;
  records: CareRecord[];
  onEdit: (r: CareRecord) => void;
  onNew: (kind?: Kind) => void;
  onPreview: (attachment: NonNullable<CareRecord["attachments"]>[number]) => void;
}) {
  const { c, t, lang } = useUI();
  const [kind, setKind] = useState<Kind | "all">("all");
  const [day, setDay] = useState<string | null>(null);
  const [anchor, setAnchor] = useState(new Date());
  const [calendar, setCalendar] = useState(false);
  const [date, setDate] = useState(dateKey(new Date()));
  const [invalid, setInvalid] = useState(false);
  const [adding,setAdding]=useState(false);
  const selectedKind=useRef<Kind|null>(null);
  function choose(k:Kind){selectedKind.current=k;setAdding(false);if(Platform.OS!=="ios"){selectedKind.current=null;onNew(k)}}
  const days = monthDays(anchor);
  const filtered = records.filter(
    (r) =>
      (kind === "all" || r.kind === kind) &&
      (day ? dateKey(new Date(r.at)) === day : new Date(r.at).getFullYear() === anchor.getFullYear() && new Date(r.at).getMonth() === anchor.getMonth()),
  );
  function moveWeek(step: number) { setAnchor(shiftMonth(anchor,step)); setDay(null); }
  return (
    <View style={{ maxWidth: 790, width: "100%", alignSelf: "center" }}>
      <View style={[layout.between,{marginBottom:16}]}><Txt size={13} style={{flex:1,marginRight:12}} color={c.muted}>{lang === "zh" ? "日常与瞬间，都在这里" : "Daily care and little moments"}</Txt><View style={{width:112}}><Button small label={lang === "zh" ? "添加记录" : "Add record"} icon={Plus} onPress={()=>setAdding(true)}/></View></View>
      {timer}
      <View style={[layout.between, { marginBottom: 20 }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t.calendar}
          onPress={() => {
            setCalendar(true);
            setDate(day || dateKey(new Date()));
            setInvalid(false);
          }}
          style={[
            layout.row,
            {
              borderWidth: 1,
              borderColor: c.line,
              borderRadius: 13,
              paddingVertical: 8,
              paddingHorizontal: 12,
            },
          ]}
        >
          <Txt size={17}>
            {anchor.toLocaleDateString(lang === "zh" ? "zh-CN" : "en-US", {
              year: "numeric",
              month: "long",
            })}
          </Txt>
          <CalendarDays size={18} color={c.muted} />
        </Pressable>
        <View style={layout.row}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={lang === "zh" ? "上个月" : "Previous month"}
            onPress={() => moveWeek(-1)}
            style={{ padding: 10 }}
          >
            <ChevronLeft size={20} color={c.muted} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={lang === "zh" ? "下个月" : "Next month"}
            onPress={() => moveWeek(1)}
            style={{ padding: 10 }}
          >
            <ChevronRight size={20} color={c.muted} />
          </Pressable>
        </View>
      </View>
      <View style={{flexDirection:"row",flexWrap:"wrap",marginBottom:16,maxWidth:420,alignSelf:"center",width:"100%"}}>
        {(lang === "zh" ? ["一","二","三","四","五","六","日"] : ["M","T","W","T","F","S","S"]).map((label,i)=><View key={`label-${i}`} style={{width:"14.2857%",alignItems:"center",paddingVertical:4}}><Txt size={11} color={c.muted}>{label}</Txt></View>)}
        {days.map((d,i)=>d ? <Pressable key={dateKey(d)} accessibilityRole="button" accessibilityLabel={dateKey(d)} accessibilityState={{selected:day===dateKey(d)}} onPress={()=>setDay(day===dateKey(d)?null:dateKey(d))} style={{width:"14.2857%",minHeight:36,justifyContent:"center",alignItems:"center",backgroundColor:day===dateKey(d)?c.tint:"transparent",borderRadius:10}}><Txt size={13} color={day===dateKey(d)?c.primary:c.ink}>{d.getDate()}</Txt><View style={{flexDirection:"row",gap:3}}><View style={{height:3,width:3,borderRadius:2,backgroundColor:records.some(r=>dateKey(new Date(r.at))===dateKey(d))?c.primary:"transparent"}} /><View style={{height:4,width:4,borderRadius:2,backgroundColor:remindersOnDate(data.reminders||[],dateKey(d)).length?"#b57c41":"transparent"}} /></View></Pressable> : <View key={`empty-${i}`} style={{width:"14.2857%",height:36}} />)}
      </View>
      <View
        style={[
          layout.between,
          { paddingBottom: 12, borderBottomWidth: 1, borderColor: c.line },
        ]}
      >
        <Choice
          label={lang === "zh" ? "整月" : "Whole month"}
          selected={!day}
          onPress={() => setDay(null)}
        />
        <Choice
          label={t.todayOnly}
          selected={day === dateKey(new Date())}
          onPress={() => {
            setDay(dateKey(new Date()));
            setAnchor(new Date());
          }}
        />
      </View>
      <View style={{flexDirection:"row",gap:14,paddingTop:8}}><Txt size={11} color={c.primary}>{lang==="zh"?"● 记录":"● Records"}</Txt><Txt size={11} color="#b57c41">{lang==="zh"?"● 提醒":"● Reminders"}</Txt></View>
      <View style={{paddingVertical:16}}><ReminderScreen data={data} onUpdate={onUpdate} date={day||dateKey(anchor)} dates={day?[day]:days.filter((d):d is Date=>!!d).map(dateKey)}/></View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 4, paddingVertical: 16 }}
      >
        {(["all",...recordGroups.flatMap(group=>group.kinds)] as const).map((k) => (
          <Choice
            key={k}
            label={t[k]}
            selected={kind === k}
            onPress={() => setKind(k)}
          />
        ))}
      </ScrollView>
      <View>
        {filtered.length ? (
          filtered.map((r, i) => (
            <View key={r.id}>
              {!day &&
                (i === 0 ||
                  dateKey(new Date(r.at)) !==
                    dateKey(new Date(filtered[i - 1].at))) && (
                  <Txt size={12} color={c.muted} style={{ marginTop: 20 }}>
                    {new Date(r.at).toLocaleDateString(
                      lang === "zh" ? "zh-CN" : "en-US",
                      { month: "long", day: "numeric", year: "numeric" },
                    )}
                  </Txt>
                )}
              <View style={{borderBottomWidth:1,borderColor:c.line,paddingBottom:r.attachments?.length?14:0}}>
              <RecordRow record={r} divider={false} onPress={() => onEdit(r)} />
              {!!r.attachments?.length&&<View style={{flexDirection:"row",flexWrap:"wrap",gap:8,paddingLeft:4}}>{r.attachments.map((a)=><View key={a.id} style={{width:r.attachments!.length===1?"48%":"31%",maxWidth:180}}><AttachmentView attachment={a} fluid onOpen={onPreview}/></View>)}</View>}
              </View>
            </View>
          ))
        ) : (
          <View style={{ alignItems: "center", paddingVertical: 40, gap: 10 }}>
            <Art name="baby" size={115} />
            <Txt color={c.muted}>{t.historyEmpty}</Txt>
          </View>
        )}
      </View>

      <Sheet visible={adding} title={lang==="zh"?"添加记录":"Add record"} onClose={()=>{selectedKind.current=null;setAdding(false)}} onDismiss={()=>{const k=selectedKind.current;selectedKind.current=null;if(k)onNew(k)}}>
        <View style={{flexDirection:"row",flexWrap:"wrap",paddingVertical:8}}>
          {(["note",...recordGroups.flatMap(g=>g.kinds).filter(k=>k!=="note")] as Kind[]).map(k=><Pressable key={k} accessibilityRole="button" accessibilityLabel={k==="note"?(lang==="zh"?"观察 / 瞬间":"Observation / moment"):t[k]} onPress={()=>choose(k)} style={{width:"25%",alignItems:"center",gap:9,paddingVertical:14}}><View style={{width:54,height:54,borderRadius:20,backgroundColor:c.tint,alignItems:"center",justifyContent:"center"}}><CareIcon kind={k} size={40}/></View><Txt size={12}>{k==="note"?(lang==="zh"?"观察 / 瞬间":"Moment"):t[k]}</Txt></Pressable>)}
        </View>
      </Sheet>
      <Sheet
        visible={calendar}
        title={t.calendar}
        onClose={() => setCalendar(false)}
      >
        <Field
          label={t.time}
          placeholder="YYYY-MM-DD"
          value={date}
          dateMode="date"
          onChange={setDate}
        />
        {invalid && <Txt color={c.primary}>{t.invalid}</Txt>}
        <Button
          label={t.done}
          onPress={() => {
            const d = new Date(date + "T12:00:00");
            if (
              !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
              isNaN(d.getTime()) ||
              dateKey(d) !== date
            ) {
              setInvalid(true);
              return;
            }
            setDay(date);
            setAnchor(d);
            setCalendar(false);
          }}
        />
      </Sheet>
    </View>
  );
}
