import React from "react";
import { StyleSheet, TextInputProps } from "react-native";
import {
  ConfigProvider,
  Input,
  DatePicker,
  TimePicker,
  Modal,
  Button as AntButton,
  theme,
} from "antd";
import zhCN from "antd/locale/zh_CN";
import enUS from "antd/locale/en_US";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import "dayjs/locale/zh-cn";
import { useUI } from "./themeContext";
dayjs.extend(customParseFormat);
function ControlsTheme({ children }: { children: React.ReactNode }) {
  const { c, lang } = useUI();
  return (
    <ConfigProvider
      locale={lang === "zh" ? zhCN : enUS}
      theme={{
        algorithm:
          c.bg === "#19221F" ? theme.darkAlgorithm : theme.defaultAlgorithm,
        components: {
          DatePicker: {
            cellWidth: 36,
            cellHeight: 30,
            textHeight: 36,
            fontSize: 14,
          },
          Modal: { titleFontSize: 22 },
        },
        token: {
          colorPrimary: c.primary,
          colorLink: c.primary,
          colorBgContainer: c.bg,
          colorBgElevated: c.surface,
          colorText: c.ink,
          colorTextPlaceholder: c.muted,
          colorTextSecondary: c.muted,
          colorBorder: c.line,
          borderRadius: 13,
          fontSize: 16,
          controlHeight: 48,
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif',
          zIndexPopupBase: 10000,
        },
      }}
    >
      {children}
    </ConfigProvider>
  );
}
export function AppTextInput(p: TextInputProps) {
  const style = { ...StyleSheet.flatten(p.style) } as React.CSSProperties;
  delete (style as any).textAlignVertical;
  if (!style.borderWidth) Object.assign(style, {border: "none", boxShadow: "none", outline: "none"});
  if (typeof style.lineHeight === "number")
    style.lineHeight = `${style.lineHeight}px`;
  const props = {
    variant: (style.borderWidth ? "outlined" : "borderless") as
      "outlined" | "borderless",
    "aria-label": p.accessibilityLabel,
    value: p.value,
    onFocus: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => p.onFocus?.(e as any),
    onBlur: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => p.onBlur?.(e as any),
    placeholder: p.placeholder,
    disabled: p.editable === false,
    maxLength: p.maxLength,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      p.onChangeText?.(e.target.value),
    style,
  };
  return (
    <ControlsTheme>
      {p.multiline ? (
        <Input.TextArea {...props} autoSize={{ minRows: 2, maxRows: 5 }} />
      ) : (
        <Input
          {...props}
          inputMode={p.keyboardType === "decimal-pad" ? "decimal" : "text"}
        />
      )}
    </ControlsTheme>
  );
}
export function DateControl({
  value,
  onChange,
  label,
  withTime,
  withSeconds,
  maxDate,
}: {
  value: string;
  onChange: (s: string) => void;
  label: string;
  withTime?: boolean;
  withSeconds?: boolean;
  maxDate?: string;
}) {
  const { lang } = useUI();
  const timeFormat = withSeconds ? "HH:mm:ss" : "HH:mm";
  const format = withTime ? `YYYY-MM-DD ${timeFormat}` : "YYYY-MM-DD";
  const parsed = dayjs(withSeconds && value.length===16 ? value+":00" : value, format, true).locale(
    lang === "zh" ? "zh-cn" : "en",
  );
  const date = parsed.isValid() ? parsed : null;
  return (
    <ControlsTheme>
      <div
        style={{ display: "flex", gap: 10, width: "100%", flexWrap: "wrap" }}
      >
        <DatePicker
          aria-label={label}
          value={date}
          format="YYYY-MM-DD"
          allowClear={false}
          maxDate={maxDate ? dayjs(maxDate) : undefined}
          style={{ flex: "1 1 180px", minWidth: 0 }}
          onChange={(d) => {
            if (d)
              onChange(
                d.format("YYYY-MM-DD") +
                  (withTime ? " " + (date?.format(timeFormat) || (withSeconds ? "12:00:00" : "12:00")) : ""),
              );
          }}
        />
        {withTime && (
          <TimePicker
            aria-label={lang === "zh" ? "时分" : "Time"}
            value={date}
            format={timeFormat}
            allowClear={false}
            needConfirm={false}
            style={{ flex: "1 1 110px", minWidth: 0 }}
            onChange={(d) => {
              if (d)
                onChange(
                  (date || dayjs()).format("YYYY-MM-DD") +
                    " " +
                    d.format(timeFormat),
                );
            }}
          />
        )}
      </div>
    </ControlsTheme>
  );
}
export function WebSheet({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <ControlsTheme>
      <Modal
        open
        title={title}
        onCancel={onClose}
        footer={null}
        width={460}
        centered
        styles={{
          body: { maxHeight: "78dvh", overflowY: "auto", paddingTop: 14 },
          header: { fontFamily: "BabySerif", marginBottom: 12 },
        }}
      >
        {children}
      </Modal>
    </ControlsTheme>
  );
}

export function WebButton({
  label,
  onPress,
  icon,
  secondary,
  disabled,
  small,
  danger,
  style,
}: {
  label: string;
  onPress: () => void;
  icon?: React.ReactNode;
  secondary?: boolean;
  disabled?: boolean;
  small?: boolean;
  danger?: boolean;
  style?: any;
}) {
  const { c } = useUI();
  return (
    <ControlsTheme>
      <AntButton
        aria-label={label}
        type={secondary ? "default" : "primary"}
        danger={danger}
        disabled={disabled}
        onClick={onPress}
        icon={icon}
        style={{
          width: "100%",
          height: small ? 44 : 52,
          borderRadius: small ? 15 : 17,
          fontSize: small ? 13 : 16,
          background: secondary ? c.tint : undefined,
          borderColor: secondary ? "transparent" : undefined,
          color: secondary ? c.primary : undefined,
          ...StyleSheet.flatten(style),
        }}
      >
        {label}
      </AntButton>
    </ControlsTheme>
  );
}

export function TimeControl({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (s: string) => void;
  label: string;
}) {
  const parsed = dayjs(value, "HH:mm", true);
  return (
    <ControlsTheme>
      <TimePicker
        aria-label={label}
        value={parsed.isValid() ? parsed : null}
        format="HH:mm"
        needConfirm={false}
        allowClear={false}
        style={{ width: "100%" }}
        onChange={(d) => {
          if (d) onChange(d.format("HH:mm"));
        }}
      />
    </ControlsTheme>
  );
}
