import { Platform } from "react-native";
import { File } from "expo-file-system";
import { Media } from "./api";
export async function readMedia(
  uri: string,
  type: Media["type"],
  mime: string,
): Promise<Media> {
  mime = mime.split(";")[0];
  let data: string;
  if (Platform.OS === "web") {
    const blob = await (await fetch(uri)).blob();
    if (blob.size > 30 * 1024 * 1024) throw new Error("TOO_LARGE");
    data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    if (data.startsWith("data:application/octet-stream"))
      data = data.replace("application/octet-stream", mime);
  } else {
    const f = new File(uri);
    if (f.size > 30 * 1024 * 1024) throw new Error("TOO_LARGE");
    data = `data:${mime};base64,${await f.base64()}`;
  }
  data = data.replace(/^data:[^,]*,/, `data:${mime};base64,`);
  return { uri, type, mime, data };
}
