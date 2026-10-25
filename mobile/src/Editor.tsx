import {recordGroups} from "./recordGroups";
import {CareDetailFields} from "./care/CareDetailFields";
import { AttachmentView } from "./AttachmentView";
import { AppTextInput } from "./controls";
import React, { useState, useEffect, useRef } from "react";
import { View, TextInput, Pressable } from "react-native";
import { Plus, Minus } from "lucide-react-native";
import { CareRecord, kinds, units, validateRecord } from "./domain";
import {
  Sheet,
  Field,
  Choice,
  Button,
  Txt,
  Heading,
  CareIcon,
  layout,
  useUI,
} from "./ui";
export function localDateTime(iso: string) {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}
export function Editor({
  record,
  isNew = false,
  onClose,
  onSave,
  onDelete,
  onAttach,
  visible = true,
  onDismiss,
  onPreview,
}: {
  isNew?: boolean;
  visible?: boolean;
  onDismiss?: () => void;
  onPreview: (a: NonNullable<CareRecord["attachments"]>[number]) => void;
  record: CareRecord;
  onClose: () => void;
  onSave: (r: CareRecord) => void;
  onDelete?: () => void;
  onAttach?: (kind: CareRecord['kind']) => void;
}) {
  const { t, c, lang } = useUI();
  const original = useRef(record);
  const [closing, setClosing] = useState(false);
  const [r, set] = useState(record);
  useEffect(() => {
    set((current) => ({ ...current, attachments: record.attachments }));
  }, [record.attachments]);
  const [removeID, setRemoveID] = useState<string | null>(null);
  const [amount, setAmount] = useState(record.value?.toString() || "");
  const [time, setTime] = useState(record.timePrecision==="day"?localDateTime(record.at).slice(0,10):localDateTime(record.at));
  const [error, setError] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [changing, setChanging] = useState(false);
  function save() {
    const date = new Date(time.length===10?time+"T12:00:00":time.replace(" ", "T"));
    const updated = {
      ...r,
      at: isNaN(date.getTime()) ? "" : date.toISOString(),
      value: amount.trim() ? Number(amount) : undefined,
      unit: units[r.kind],
    };
    if (
      !/^\d{4}-\d{2}-\d{2}( \d{2}:\d{2})?$/.test(time) ||
      isNaN(date.getTime()) ||
      localDateTime(date.toISOString()).slice(0,time.length) !== time ||
      !validateRecord(updated)
    ) {
      setError(true);
      return;
    }
    onSave(updated);
  }
  const dirty =
    JSON.stringify(r) !== JSON.stringify(original.current) ||
    amount !== (original.current.value?.toString() || "") ||
    time !== (original.current.timePrecision==="day"?localDateTime(original.current.at).slice(0,10):localDateTime(original.current.at));
  if (closing)
    return (
      <Sheet visible title={t.discardEdit} onClose={() => setClosing(false)}>
        <View style={{ gap: 12 }}>
          <Button label={t.keepEditing} onPress={() => setClosing(false)} />
          <Button label={t.discardChanges} secondary danger onPress={onClose} />
        </View>
      </Sheet>
    );
  return (
    <Sheet
      visible={visible}
      onDismiss={onDismiss}
      title={`${isNew ? (lang === "zh" ? "添加记录" : "Add record") : t.edit} · ${t[r.kind]}`}
      onClose={() => (dirty ? setClosing(true) : onClose())}
    >
      <Pressable
        accessibilityRole="button"
        onPress={() => setChanging(!changing)}
        style={{ alignSelf: "center", padding: 8 }}
      >
        <CareIcon kind={r.kind} size={78} />
        <Txt size={12} color={c.primary} style={{ textAlign: "center" }}>
          {t[r.kind]} ▾
        </Txt>
      </Pressable>
      {changing && (
        <View style={{gap:16, marginBottom:20}}>
          {recordGroups.map(group=><View key={group.en} style={{gap:8}}><Txt size={12} color={c.muted}>{lang === "zh" ? group.zh : group.en}</Txt><View style={layout.wrap}>
          {group.kinds.map((k) => (
            <Choice
              key={k}
              label={t[k]}
              selected={r.kind === k}
              onPress={() => {
                set({
                  ...r,
                  kind: k,
                  details: undefined,
                  side: k === "nursing" ? r.side : undefined,
                });
                if (k === "note" || k === "diaper") setAmount("");
                setChanging(false);
              }}
            />
          ))}
          </View></View>)}
        </View>
      )}
      {!["note", "diaper", "food", "medicine", "supplement"].includes(r.kind) && (
        <View style={{ alignItems: "center", marginBottom: 26, marginTop: 10 }}>
          <Txt color={c.muted} size={13}>
            {r.kind === "bottle" ? t.intake : t.value}
          </Txt>
          <View
            style={{
              flexDirection: "row",
              alignItems: "baseline",
              justifyContent: "center",
              gap: 7,
              marginTop: 5,
            }}
          >
            <AppTextInput
              accessibilityLabel={`${t.value} (${units[r.kind]})`}
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor={c.muted}
              style={{
                fontFamily: "BabySerif",
                fontSize: 64,
                color: c.ink,
                textAlign: "center",
                minWidth: 90,
                maxWidth: 240,
                padding: 0,
              }}
            />
            <Txt color={c.muted} size={22}>
              {units[r.kind]}
            </Txt>
          </View>
          {r.kind === "bottle" && (
            <View
              style={{
                marginTop: 13,
                backgroundColor: c.tint,
                borderRadius: 32,
                padding: 6,
                flexDirection: "row",
                alignItems: "center",
                gap: 32,
              }}
            >
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="-10 ml"
                onPress={() =>
                  setAmount(String(Math.max(0, Number(amount || 0) - 10)))
                }
                style={{ padding: 9 }}
              >
                <Minus size={24} color={c.primary} />
              </Pressable>
              <Txt>{amount || "0"} ml</Txt>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="+10 ml"
                onPress={() => setAmount(String(Number(amount || 0) + 10))}
                style={{ padding: 9 }}
              >
                <Plus size={24} color={c.primary} />
              </Pressable>
            </View>
          )}
        </View>
      )}
      <CareDetailFields record={{...r,value:amount.trim()?Number(amount):undefined}} onChange={set}/>
      {!!r.attachments?.length && (
        <View style={{ gap: 12, marginBottom: 20,flexDirection:"row",flexWrap:"wrap" }}>
          {r.attachments.map((a) => (
            <View key={a.id} style={{ gap: 8 }}>
              <AttachmentView attachment={a} onOpen={onPreview} />
              <Button
                label={t.removeMedia}
                small
                secondary
                onPress={() => setRemoveID(a.id)}
              />
              {removeID === a.id && (
                <View style={{ gap: 8 }}>
                  <Txt>{t.removeMedia}？</Txt>
                  <Button
                    label={t.removeMedia}
                    small
                    danger
                    onPress={() => {
                      set((current) => ({
                        ...current,
                        attachments: current.attachments?.filter(
                          (x) => x.id !== a.id,
                        ),
                      }));
                      setRemoveID(null);
                    }}
                  />
                  <Button
                    label={t.cancel}
                    small
                    secondary
                    onPress={() => setRemoveID(null)}
                  />
                </View>
              )}
            </View>
          ))}
        </View>
      )}
      {onAttach && (
        <Button
          label={r.kind==='note'?(lang==='zh'?'录制':'Capture'):t.addMedia}
          secondary
          small
          onPress={()=>onAttach(r.kind)}
          style={{ marginBottom: 20 }}
        />
      )}
      <Field
        label={t.time}
        dateMode={r.timePrecision==="day"?"date":"datetime"}
        value={time}
        onChange={setTime}
        placeholder={t.timeHint}
      />
      {r.kind === "nursing" && (
        <View style={{ gap: 8, marginBottom: 20 }}>
          <Txt size={14}>{t.side}</Txt>
          <View style={layout.wrap}>
            {(["left", "right", "both", undefined] as const).map((s) => (
              <Choice
                key={s || "none"}
                label={s ? t[s] : t.unspecified}
                selected={r.side === s}
                onPress={() => set({ ...r, side: s })}
              />
            ))}
          </View>
        </View>
      )}
      <Field
        label={t.notes}
        value={r.note}
        onChange={(note) => set({ ...r, note })}
        multiline
      />
      {r.sourceText && (
        <View style={{ marginBottom: 22, gap: 10 }}>
          <Txt size={14}>{t.originalText}</Txt>
          <View
            style={{ padding: 16, borderRadius: 16, backgroundColor: c.tint }}
          >
            <Txt size={13} color={c.muted}>
              {r.sourceText}
            </Txt>
          </View>
        </View>
      )}
      {error && (
        <Txt color="#B45B48" style={{ marginBottom: 12 }}>
          {t.invalid}
        </Txt>
      )}
      <Button label={isNew ? (lang === "zh" ? "保存记录" : "Save record") : t.saveChanges} onPress={save} />
      {onDelete && (
        <View style={{ marginTop: 14 }}>
          {deleting ? (
            <View style={{ gap: 10 }}>
              <Txt>{t.confirmDelete}</Txt>
              <Button label={t.delete} danger onPress={onDelete} />
            </View>
          ) : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t.delete}
              onPress={() => setDeleting(true)}
              style={{ padding: 12, alignItems: "center" }}
            >
              <Txt color={c.primary}>{t.delete}</Txt>
            </Pressable>
          )}
        </View>
      )}
    </Sheet>
  );
}
