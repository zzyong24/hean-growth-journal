import { CareRecord, uid } from './domain';
// Deliberately narrow: corrections, questions, multiple events and ambiguous amounts go to AI.
export function quickBottle(text: string, now = new Date()): CareRecord | null {
  const match = /^(?:宝宝)?(?:刚刚|刚)?(?:喝了|喝奶|瓶喂)\s*(\d+(?:\.\d+)?)\s*(?:毫升|ml)(?:奶)?[。！!]?$/i.exec(text.trim());
  if (!match || Number(match[1]) <= 0 || Number(match[1]) > 2000) return null;
  return { id:uid(),kind:'bottle',at:now.toISOString(),value:Number(match[1]),unit:'ml',note:'',sourceText:text };
}
