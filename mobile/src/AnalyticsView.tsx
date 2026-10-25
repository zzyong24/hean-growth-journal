import React, { useState } from "react";
import { View, Pressable, ScrollView, useWindowDimensions } from "react-native";
import { AppData, CareRecord } from "./domain";
import {
  dayAnalytics, periodAnalytics, feedingSummary,
  weekAnalytics,
  dayBounds,
  trendQuestion,
  Metric,
} from "./analytics";
import { Txt, Heading, Choice, Button, RecordRow, layout, useUI } from "./ui";
export function TodayOverview({
  data,
  onOpen,
}: {
  data: AppData;
  onOpen: () => void;
}) {
  const { c, lang } = useUI();
  const zh = lang === "zh";
  const d = dayAnalytics(data.records, new Date());
  const last = data.records
    .filter(
      (r) =>
        ["bottle", "nursing"].includes(r.kind) &&
        Date.parse(r.at) <= Date.now(),
    )
    .sort((a, b) => Date.parse(b.at) - Date.parse(a.at))[0];
  const mins = last
    ? Math.floor((Date.now() - Date.parse(last.at)) / 60000)
    : null;
  return <Pressable accessibilityRole="button" accessibilityLabel={zh?"今日概览，查看趋势":"Today summary, view trends"} onPress={onOpen} style={{flex:1,minWidth:0,backgroundColor:c.tint,borderRadius:16,padding:10,gap:5}}>
    <View style={layout.between}><Txt size={11} color={c.primary}>{zh?"今天":"Today"}</Txt><Txt size={11} color={c.primary}>↗</Txt></View>
    <View style={{flexDirection:"row",gap:6}}>
      {[{label:zh?"瓶喂":"Milk",value:d.milk,unit:"ml"},{label:zh?"睡眠":"Sleep",value:d.sleep===null?null:Math.round(d.sleep/6)/10,unit:"h"},{label:zh?"换尿布":"Changes",value:d.diapers,unit:zh?"次":""}].map(m=><View key={m.label} style={{flex:1,minWidth:0,gap:2}}><Txt size={11} color={c.muted}>{m.label}</Txt><Txt size={15} weight="500">{m.value??"—"}<Txt size={10}> {m.unit}</Txt></Txt></View>)}
    </View>
    {mins!==null&&<Txt size={10} color={c.muted}>{zh?"距上次喂养 ":"Last feed "}{mins<60?`${mins} min`:`${Math.floor(mins/60)}h ${mins%60}m`}</Txt>}
  </Pressable>;

}
export function AnalyticsView({
  data,
  onEdit,
  onAsk,
}: {
  data: AppData;
  onEdit: (r: CareRecord) => void;
  onAsk: (text: string) => void;
}) {
  const { c, lang } = useUI();
  const zh = lang === "zh";
  const [metric, setMetric] = useState<Metric>("milk");
  const [selected, setSelected] = useState(6);
  const {width:screenWidth}=useWindowDimensions();
  const [period,setPeriod]=useState<7|30>(7);
  const week = periodAnalytics(data.records,period);
  const summary=feedingSummary(data.records,period);
  const day = week[selected];
  const bounds = dayBounds(day.date);
  const max = Math.max(1, ...week.map((d) => d[metric] || 0));
  const labels = {
    milk: zh ? "瓶喂奶量" : "Bottle milk",
    nursing: zh ? "亲喂时长" : "Nursing",
    sleep: zh ? "睡眠时长" : "Sleep",
    diapers: zh ? "换尿布次数" : "Diaper changes",
    urinations: zh ? "小便次数" : "Urinations",
  };
  const unit =
    metric === "milk"
      ? "ml"
      : (metric === "diapers" || metric === "urinations")
        ? zh
          ? "次"
          : "times"
        : zh
          ? "分钟"
          : "min";
  const fmt = (d: Date) =>
    d.toLocaleDateString(zh ? "zh-CN" : "en-US", {
      month: "numeric",
      day: "numeric",
    });
  return (
    <View style={{ gap: 16, marginBottom: 32 }}>
      <Txt size={12} color={c.muted}>
        {zh
          ? `近 ${period} 天`
          : `Last ${period} days`}
      </Txt>
      <View style={{flexDirection:"row",gap:8}}>{([7,30] as const).map(n=><Choice key={n} label={`${n}${zh?"天":" days"}`} selected={period===n} onPress={()=>{setPeriod(n);setSelected(n-1);}}/>)}</View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 6 }}
      >
        {(Object.keys(labels) as Metric[]).map((k) => (
          <Choice
            key={k}
            label={labels[k]}
            selected={metric === k}
            onPress={() => setMetric(k)}
          />
        ))}
      </ScrollView>
      <Txt size={11} color={c.muted}>
        {labels[metric]} · {unit}
        {(metric==='diapers'||metric==='urinations')&&(zh?' · 仅统计明确记录的次数，未填不算零次':' · Explicit counts only; missing is not zero')}
      </Txt>
      <ScrollView horizontal showsHorizontalScrollIndicator={period===30}>
      <View
        style={{
          width:Math.max(Math.min(screenWidth-56,640),period*38),
          flexDirection: "row",
          gap: 7,
          height: 180,
          alignItems: "flex-end",
          paddingTop: 12,
        }}
      >
        {week.map((d, i) => (
          <Pressable
            key={i}
            accessibilityRole="button"
            accessibilityLabel={`${fmt(d.date)} ${d[metric] === null ? (zh ? "未记录" : "Unrecorded") : Math.round(d[metric]! * 10) / 10 + " " + unit}`}
            accessibilityState={{ selected: selected === i }}
            onPress={() => setSelected(i)}
            style={{
              flex: 1,
              alignItems: "center",
              gap: 8,
              height: "100%",
              justifyContent: "flex-end",
              backgroundColor: selected === i ? c.tint : "transparent",
              borderRadius: 10,
              paddingBottom: 8,
            }}
          >
            <Txt size={11} color={c.muted}>
              {d[metric] === null ? "—" : Math.round(d[metric]! * 10) / 10}
            </Txt>
            <View
              style={{
                height:
                  d[metric] === null
                    ? 3
                    : Math.max(4, (d[metric]! / max) * 105),
                width: "65%",
                maxWidth: 36,
                borderRadius: 6,
                backgroundColor: d[metric] === null ? c.line : c.primary,
                opacity: selected === i ? 1 : 0.55,
              }}
            />
            <Txt size={11}>{fmt(d.date)}</Txt>
          </Pressable>
        ))}
      </View>
      </ScrollView>

      {metric === "milk" && <View style={{flexDirection:"row",flexWrap:"wrap",gap:18}}>{[[zh?"记录次数":"Feeds",summary.count],[zh?"实际喝下 ml":"Consumed ml",summary.total],[zh?"每次平均":"Average ml",summary.average],[zh?"单次最多":"Max ml",summary.max],[zh?"单次最少":"Min ml",summary.min]].map(([label,value])=><View key={String(label)}><Txt size={11} color={c.muted}>{label}</Txt><Txt size={20}>{typeof value==="number"?Math.round(value*10)/10:"—"}</Txt></View>)}</View>}

      {metric==='milk'&&<View style={{gap:6,padding:14,backgroundColor:c.tint,borderRadius:12}}>
        <Txt>{zh?'冲泡与剩余':'Prepared and leftover'}</Txt>
        <Txt>{summary.preparedCount?(zh?`冲泡 ${summary.prepared} ml · 剩余 ${summary.leftover} ml · 剩余比例 ${Math.round((summary.leftoverRate||0)*100)}%`:`Prepared ${summary.prepared} ml · Left ${summary.leftover} ml · ${Math.round((summary.leftoverRate||0)*100)}% left`):(zh?'还没有同时记录冲泡量和实际喝下量。':'No feeds with both prepared and consumed amounts yet.')}</Txt>
        <Txt size={11} color={c.muted}>{zh
          ? `已统计 ${summary.preparedCount} 次记录。${summary.count>summary.preparedCount?`另有 ${summary.count-summary.preparedCount} 次剩余量待补充。`:''}剩余量不等于已丢弃量。`
          : `Based on ${summary.preparedCount} feeds. ${summary.count>summary.preparedCount?`${summary.count-summary.preparedCount} feeds need leftover details. `:''}Leftover does not mean discarded.`}</Txt>
      </View>}
      <Button
        label={zh ? "问问 AI：有什么变化？" : "Ask AI about this period"}
        secondary
        onPress={() => onAsk(zh?`最近${period}天的${labels[metric]}有什么变化？`:`How has ${labels[metric]} changed in the last ${period} days?`)}
      />
      <View
        style={{
          borderTopWidth: 1,
          borderColor: c.line,
          paddingTop: 20,
          gap: 14,
        }}
      >
        <Heading size={20}>
          {fmt(day.date)} · {zh ? "24 小时节奏" : "24-hour timeline"}
        </Heading>
        <View
          style={{
            flexDirection: "row",
            marginLeft: 46,
            justifyContent: "space-between",
          }}
        >
          {[0, 6, 12, 18, 24].map((h) => (
            <Txt key={h} size={10} color={c.muted}>
              {h}:00
            </Txt>
          ))}
        </View>
        {(["bottle", "nursing", "sleep", "diaper"] as const).map((kind) => (
          <View
            key={kind}
            style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
          >
            <Txt size={11} style={{ width: 38 }}>
              {kind === "bottle"
                ? zh
                  ? "瓶喂"
                  : "Bottle"
                : kind === "nursing"
                  ? zh
                    ? "亲喂"
                    : "Nurse"
                  : kind === "sleep"
                    ? zh
                      ? "睡眠"
                      : "Sleep"
                    : zh
                      ? "尿布"
                      : "Diaper"}
            </Txt>
            <View
              style={{
                flex: 1,
                height: 32,
                backgroundColor: c.tint,
                borderRadius: 8,
                position: "relative",
              }}
            >
              {day.rows
                .filter((r) => r.kind === kind)
                .map((r) => {
                  const end = Math.min(+bounds.end, Date.parse(r.at));
                  const start =
                    kind === "sleep"
                      ? Math.max(
                          +bounds.start,
                          Date.parse(r.at) - (r.value || 0) * 60000,
                        )
                      : end;
                  const left = Math.min(
                    98,
                    ((start - +bounds.start) / (+bounds.end - +bounds.start)) *
                      100,
                  );
                  return (
                    <Pressable
                      key={r.id}
                      accessibilityRole="button"
                      accessibilityLabel={`${labels[kind === "bottle" ? "milk" : kind === "diaper" ? "diapers" : kind]} ${new Date(r.at).toLocaleTimeString(zh ? "zh-CN" : "en-US", { hour: "2-digit", minute: "2-digit" })}`}
                      onPress={() => onEdit(r)}
                      style={{
                        position: "absolute",
                        left: `${left}%`,
                        top: 4,
                        height: 24,
                        minWidth: 6,
                        width:
                          kind === "sleep"
                            ? `${Math.max(1, ((end - start) / (+bounds.end - +bounds.start)) * 100)}%`
                            : 7,
                        backgroundColor: c.primary,
                        borderRadius: 4,
                      }}
                    />
                  );
                })}
            </View>
          </View>
        ))}
        {day.rows.length ? (
          day.rows
            .slice()
            .sort((a, b) => Date.parse(a.at) - Date.parse(b.at))
            .map((r) => (
              <RecordRow key={r.id} record={r} onPress={() => onEdit(r)} />
            ))
        ) : (
          <Txt color={c.muted}>
            {zh ? "这一天还没有记录。" : "No records for this day."}
          </Txt>
        )}
      </View>
    </View>
  );
}
