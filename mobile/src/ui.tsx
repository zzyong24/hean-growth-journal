import {formattedDetails} from "./care/details";
import {
  AppTextInput,
  DateControl,
  WebSheet,
  WebButton,
  TimeControl,
} from "./controls";
import React from "react";
import {
  View,
  Text,
  Pressable,
  TextInput,
  StyleSheet,
  ViewStyle,
  TextStyle,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
} from "react-native";
import {
  Baby,
  Milk,
  Heart,
  Moon,
  Droplets,
  Thermometer,
  Ruler,
  Weight,
  NotebookPen,
  X,
  ChevronRight,
} from "lucide-react-native";
import { CareRecord, Kind } from "./domain";
export {UIContext,useUI} from "./themeContext";
import {useUI} from "./themeContext";
export const icons = {
  head:Ruler, pumping:Milk, food:NotebookPen, medicine:NotebookPen, supplement:NotebookPen,
  bottle: Milk,
  nursing: Heart,
  diaper: Droplets,
  sleep: Moon,
  temperature: Thermometer,
  weight: Weight,
  height: Ruler,
  note: NotebookPen,
};
const art = {
  baby: require("../assets/illustrations/baby.png"),
  botanical: require("../assets/illustrations/botanical.png"),
  bottle: require("../assets/illustrations/bottle.png"),
  diaper: require("../assets/illustrations/diaper.png"),
  nursing: require("../assets/illustrations/nursing.png"),
};
export function Art({
  name,
  size = 70,
  height,
  style,
}: {
  name: keyof typeof art;
  size?: number;
  height?: number;
  style?: any;
}) {
  return (
    <Image
      source={art[name]}
      resizeMode="contain"
      style={[{ width: size, height: height || size }, style]}
    />
  );
}
export {CareGlyph as CareIcon} from "./CareGlyph";
import {CareGlyph as CareIcon} from "./CareGlyph";
export function Txt({
  children,
  size = 15,
  color,
  weight = "400",
  style,
  ...props
}: {
  children?: React.ReactNode;
  size?: number;
  color?: string;
  weight?: TextStyle["fontWeight"];
  style?: TextStyle;
  [key: string]: any;
}) {
  const { c } = useUI();
  return (
    <Text
      {...props}
      style={[
        {
          color: color || c.ink,
          fontSize: size,
          lineHeight: size * 1.55,
          fontWeight: weight,
          fontFamily:
            Platform.OS === "web"
              ? '"PingFang SC", "Microsoft YaHei", -apple-system, sans-serif'
              : undefined,
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}
export function Heading({
  children,
  size = 28,
  style,
}: {
  children: React.ReactNode;
  size?: number;
  style?: TextStyle;
}) {
  const { c } = useUI();
  return (
    <Text
      style={[
        {
          fontFamily: "BabySerif",
          fontSize: size,
          color: c.ink,
          lineHeight: size * 1.5,
          letterSpacing: 0.1,
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}
export function Wordmark({ size = 23 }: { size?: number }) {
  const { c } = useUI();
  return <Image accessibilityLabel="禾安成长日记" source={require('../assets/brand/hean-wordmark.png')} resizeMode="contain" style={{width:size*6.4,height:size*2.14,alignSelf:'flex-start',tintColor:c.ink}}/>;
}
export function Button({
  label,
  onPress,
  icon: Icon,
  secondary = false,
  disabled = false,
  small = false,
  danger = false,
  style,
}: {
  label: string;
  onPress: () => void;
  icon?: any;
  secondary?: boolean;
  disabled?: boolean;
  small?: boolean;
  danger?: boolean;
  style?: ViewStyle;
}) {
  const { c } = useUI();
  if (Platform.OS === "web")
    return (
      <WebButton
        {...{ label, onPress, secondary, disabled, small, danger, style }}
        icon={
          Icon ? (
            <Icon
              size={18}
              strokeWidth={1.6}
              color={secondary ? c.primary : "#FFFDF9"}
            />
          ) : undefined
        }
      />
    );
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed, hovered }: any) => [
        {
          minHeight: small ? 44 : 52,
          borderRadius: small ? 15 : 17,
          backgroundColor: secondary ? c.tint : danger ? "#A44738" : c.primary,
          paddingHorizontal: small ? 14 : 20,
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "row",
          gap: 9,
          opacity: disabled ? 0.45 : pressed ? 0.78 : 1,
          transform: [{ translateY: hovered ? -1 : 0 }],
        },
        style,
      ]}
    >
      {Icon && (
        <Icon
          size={18}
          strokeWidth={1.6}
          color={secondary ? c.primary : "#FFFDF9"}
        />
      )}
      <Txt
        weight="500"
        size={small ? 13 : 16}
        color={secondary ? c.primary : "#FFFDF9"}
      >
        {label}
      </Txt>
    </Pressable>
  );
}
export function IconButton({
  label,
  icon: Icon,
  onPress,
  active = false,
  disabled = false,
}: {
  label: string;
  icon: any;
  onPress: () => void;
  active?: boolean;
  disabled?: boolean;
}) {
  const { c } = useUI();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: active ? c.primary : c.tint,
        opacity: disabled ? 0.45 : pressed ? 0.7 : 1,
      })}
    >
      <Icon
        size={22}
        strokeWidth={1.6}
        color={active ? "#FFFDF9" : c.primary}
      />
    </Pressable>
  );
}
export function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  const { c } = useUI();
  return (
    <View
      style={[
        { backgroundColor: c.surface, borderRadius: 22, padding: 20 },
        style,
      ]}
    >
      {children}
    </View>
  );
}
export function Field({
  label,
  value,
  onChange,
  placeholder,
  number = false,
  multiline = false,
  dateMode,
  withSeconds,
  maxDate,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  number?: boolean;
  multiline?: boolean;
  dateMode?: "date" | "datetime" | "time";
  withSeconds?: boolean;
  maxDate?: string;
}) {
  const { c } = useUI();
  return (
    <View style={{ gap: 9, marginBottom: 22 }}>
      <Txt size={15} weight="500">
        {label}
      </Txt>
      {dateMode === "time" ? (
        <TimeControl value={value} onChange={onChange} label={label} />
      ) : dateMode ? (
        <DateControl
          label={label}
          value={value}
          onChange={onChange}
          withTime={dateMode === "datetime"}
          withSeconds={withSeconds}
          maxDate={maxDate}
        />
      ) : (
        <AppTextInput
          accessibilityLabel={label}
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor={c.muted}
          keyboardType={number ? "decimal-pad" : "default"}
          multiline={multiline}
          style={{
            backgroundColor: "transparent",
            borderColor: c.line,
            borderWidth: 1,
            borderRadius: 13,
            padding: 15,
            fontSize: 16,
            color: c.ink,
            minHeight: multiline ? 86 : 52,
            textAlignVertical: multiline ? "top" : "center",
          }}
        />
      )}
    </View>
  );
}
export function Sheet({
  visible,
  title,
  onClose,
  onDismiss,
  children,
}: {
  visible: boolean;
  title: string;
  onClose: () => void;
  onDismiss?: () => void;
  children: React.ReactNode;
}) {
  const { c, t } = useUI();
  if (Platform.OS === "web")
    return visible ? (
      <WebSheet title={title} onClose={onClose}>
        {children}
      </WebSheet>
    ) : null;
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      onDismiss={onDismiss}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#26312865",
          padding: 14,
        }}
      >
        <View
          accessibilityViewIsModal
          style={{
            width: "100%",
            maxWidth: 460,
            maxHeight: "96%",
            backgroundColor: c.bg,
            borderRadius: 26,
            overflow: "hidden",
            boxShadow: "0 24px 100px #17251f22",
          }}
        >
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              padding: 22,
              paddingBottom: 12,
            }}
          >
            <Heading size={22} style={{ flex: 1 }}>
              {title}
            </Heading>
            <IconButton label={t.cancel} icon={X} onPress={onClose} />
          </View>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ padding: 24, paddingTop: 8 }}
          >
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
export function Choice({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const { c } = useUI();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={{
        minHeight: 42,
        paddingHorizontal: 15,
        paddingVertical: 10,
        borderRadius: 22,
        backgroundColor: selected ? c.tint : "transparent",
      }}
    >
      <Txt
        size={14}
        weight={selected ? "500" : "400"}
        color={selected ? c.primary : c.muted}
      >
        {label}
      </Txt>
    </Pressable>
  );
}
export function RecordRow({
  record,
  onPress,
  compact = false,
  divider = true,
  receipt = false,
}: {
  record: CareRecord;
  onPress?: () => void;
  compact?: boolean;
  divider?: boolean;
  receipt?: boolean;
}) {
  const { c, t, lang } = useUI();
  const date = new Date(record.at);
  const timeLabel=record.timePrecision==='day'?date.toLocaleDateString(lang==='zh'?'zh-CN':'en-US',{month:'short',day:'numeric'}):date.toLocaleTimeString(lang==='zh'?'zh-CN':'en-US',{hour:'2-digit',minute:'2-digit',hour12:false});
  return (
    <Pressable
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityLabel={`${t.edit} ${t[record.kind]} ${record.value ?? ""}`}
      onPress={onPress}
      disabled={!onPress}
      style={({ hovered }: any) => ({
        flexDirection: "row",
        gap: 13,
        alignItems: "center",
        paddingVertical: 15,
        backgroundColor: hovered ? c.tint : "transparent",
        borderBottomWidth: divider ? 1 : 0,
        borderColor: c.line,
      })}
    >
      <CareIcon kind={record.kind} size={receipt?36:46} />
      <View style={{ flex: 1, minWidth:0, gap: receipt?6:3 }}>
        <View
          style={{
            flexDirection: "row",
            gap: 8,
            alignItems: "baseline",
            flexWrap: "wrap",
          }}
        >
          <Txt weight="500" size={15}>
            {t[record.kind]}
          </Txt>
          {record.value !== undefined && (
            <Txt size={15}>
              {record.value} {record.unit}
            </Txt>
          )}
          {receipt&&<View style={{marginLeft:'auto',paddingLeft:6,flexDirection:'row',alignItems:'center',gap:4}}><Txt size={11} color={c.muted}>{timeLabel}</Txt>{onPress&&<ChevronRight size={14} color={c.muted}/>}</View>}
        </View>
        {record.details&&<Txt size={12} color={c.muted}>{formattedDetails(record,lang)}</Txt>}
        {record.kind === "sleep" && record.value !== undefined && <Txt size={12} color={c.primary}>{new Date(Date.parse(record.at)-record.value*60000).toLocaleTimeString(lang==="zh"?"zh-CN":"en-US",{hour:"2-digit",minute:"2-digit",hour12:false})} → {date.toLocaleTimeString(lang==="zh"?"zh-CN":"en-US",{hour:"2-digit",minute:"2-digit",hour12:false})}</Txt>}
        <Txt size={12} color={c.muted} numberOfLines={compact ? 1 : 2}>
          {record.side
            ? t[record.side] + (record.note ? " · " + record.note : "")
            : record.note ||
              date.toLocaleDateString(lang === "zh" ? "zh-CN" : "en-US", {
                month: "short",
                day: "numeric",
              })}
        </Txt>
      </View>
      {!receipt&&<Txt size={12} color={c.muted}>
        {record.timePrecision === "day" ? date.toLocaleDateString(lang === "zh" ? "zh-CN" : "en-US",{month:"short",day:"numeric"}) : date.toLocaleTimeString(lang === "zh" ? "zh-CN" : "en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        })}
      </Txt>}
      {!receipt&&onPress && <ChevronRight size={17} color={c.muted} strokeWidth={1.5} />}
    </Pressable>
  );
}
export function BrandMark({ size = 56 }: { size?: number }) {
  return <Art name="baby" size={size} />;
}
export const layout = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  between: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  section: { gap: 14, marginBottom: 24 },
});
