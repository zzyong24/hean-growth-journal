import {createContext,useContext} from "react";
import {Copy,Palette,copy,themes} from "./i18n";
export const UIContext = createContext<{
  c: Palette;
  t: Copy;
  lang: "zh" | "en";
}>({ c: themes.peach, t: copy("zh"), lang: "zh" });
export const useUI = () => useContext(UIContext);
