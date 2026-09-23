import React, { useState } from "react";
import { View, Text, Pressable, Platform, TextInput, TextInputProps, Modal } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useUI } from "./themeContext";

export function AppTextInput(props: TextInputProps) { return <TextInput {...props} />; }
const pad = (n: number) => String(n).padStart(2, "0");
const dateText = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const timeText = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

function NativePicker({ value, onChange, label, mode, maxDate, withSeconds }: {
  value: string; onChange: (s: string) => void; label: string;
  mode: "date" | "time" | "datetime"; maxDate?: string; withSeconds?: boolean;
}) {
  const { c, lang } = useUI();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(new Date());
  const parse = () => {
    const d = mode === "time" ? new Date(`2000-01-01T${value || "12:00"}:00`)
      : new Date(value ? value.replace(" ", "T") + (value.length === 10 ? "T12:00:00" : "") : Date.now());
    return Number.isNaN(d.getTime()) ? new Date() : d;
  };
  const commit = (d: Date) => {
    onChange(mode === "time" ? timeText(d) : dateText(d) + (mode === "datetime" ? ` ${timeText(d)}${withSeconds ? ":"+pad(d.getSeconds()) : ""}` : ""));
    setOpen(false);
  };
  return <View>
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={() => { setDraft(parse()); setOpen(!open); }} style={{ minHeight: 44, justifyContent: "center" }}>
      <Text style={{ color: c.ink, fontSize: 16 }}>{value || (lang === "zh" ? "请选择" : "Select")}</Text>
    </Pressable>
    {open && <Modal transparent animationType="slide" onRequestClose={() => setOpen(false)}>
      <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.28)" }}>
      <Pressable accessibilityLabel={lang === "zh" ? "取消选择" : "Cancel selection"} onPress={() => setOpen(false)} style={{ flex: 1 }} />
      <View style={{ backgroundColor: c.surface, padding: 20, paddingBottom: 40, borderTopLeftRadius: 24, borderTopRightRadius: 24 }}>
      <Text style={{ color: c.ink, fontSize: 18, fontWeight: "600" }}>{label}</Text>
      <DateTimePicker value={draft} mode={mode === "datetime" && Platform.OS !== "ios" ? "date" : mode}
        style={{ width: "100%", height: 216 }} display="spinner" locale={lang === "zh" ? "zh-CN" : "en-US"} textColor={c.ink}
        maximumDate={maxDate ? new Date(`${maxDate}T23:59:59`) : undefined}
        onDismiss={() => setOpen(false)}
        onValueChange={(_, d) => { if (Platform.OS === "ios") setDraft(d); else commit(d); }} />
      {withSeconds && <View style={{flexDirection:"row",alignItems:"center",gap:16}}><Text style={{color:c.ink}}>{lang==="zh"?"秒（0–59）":"Seconds (0–59)"}</Text><TextInput accessibilityLabel={lang==="zh"?"出生秒数":"Birth seconds"} keyboardType="number-pad" maxLength={2} value={pad(draft.getSeconds())} onChangeText={v=>{if(/^\d{0,2}$/.test(v)&&Number(v)<60){const d=new Date(draft);d.setSeconds(Number(v));setDraft(d);}}} style={{color:c.ink,fontSize:18,padding:12,minWidth:64,borderWidth:1,borderColor:c.line,borderRadius:12}}/></View>}
      {Platform.OS === "ios" && <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 24 }}>
        <Pressable accessibilityRole="button" onPress={() => setOpen(false)} style={{ paddingVertical: 12 }}><Text style={{ color: c.ink }}>{lang === "zh" ? "取消" : "Cancel"}</Text></Pressable>
        <Pressable accessibilityRole="button" onPress={() => commit(draft)} style={{ paddingVertical: 12 }}><Text style={{ color: c.ink, fontWeight: "700" }}>{lang === "zh" ? "确定" : "Done"}</Text></Pressable>
      </View>}
    </View></View></Modal>}
  </View>;
}
export function DateControl(props: { value: string; onChange: (s: string) => void; label: string; withTime?: boolean; withSeconds?: boolean; maxDate?: string }) {
  if (Platform.OS !== "ios") return <TextInput accessibilityLabel={props.label} value={props.value} onChangeText={props.onChange} placeholder={props.withTime ? "YYYY-MM-DD HH:mm" : "YYYY-MM-DD"} />;
  return <NativePicker {...props} mode={props.withTime ? "datetime" : "date"} />;
}
export function TimeControl(props: { value: string; onChange: (s: string) => void; label: string }) {
  return <NativePicker {...props} mode="time" />;
}
export function WebSheet(_props: { title: string; onClose: () => void; children: React.ReactNode }) { return null; }
export function WebButton(_props: any) { return null; }
