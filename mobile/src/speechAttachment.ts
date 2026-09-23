// Dictation supplies text; it must not replace an image/video already in the composer.
export function dictationAttachment<T extends {type:string}>(selected:T|null):T|null {
 return selected&&selected.type!=='audio'?selected:null;
}
