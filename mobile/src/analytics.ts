import {milkBalance,eliminationSummary} from "./care/details";
import { CareRecord } from "./domain";
export type Metric = "milk" | "nursing" | "sleep" | "diapers" | "urinations";
export function dayBounds(date: Date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}
export function sleepMinutes(
  records: CareRecord[],
  start: number,
  end: number,
) {
  const spans = records
    .filter((r) => r.kind === "sleep" && r.value)
    .map((r) => [
      Math.max(start, Date.parse(r.at) - r.value! * 60000),
      Math.min(end, Date.parse(r.at)),
    ])
    .filter(([a, b]) => b > a)
    .sort((a, b) => a[0] - b[0]);
  let total = 0,
    a = 0,
    b = 0;
  for (const [x, y] of spans) {
    if (x > b) {
      total += b - a;
      a = x;
      b = y;
    } else b = Math.max(b, y);
  }
  return (total + b - a) / 60000;
}
export function dayAnalytics(records: CareRecord[], date: Date) {
  const { start, end } = dayBounds(date);
  const rows = records.filter((r) => {
    const at = Date.parse(r.at);
    return r.kind === "sleep"
      ? at > +start && at - (r.value || 0) * 60000 < +end
      : at >= +start && at < +end;
  });
  const sum = (kind: CareRecord["kind"]) => {
    const rs = rows.filter((r) => r.kind === kind);
    return rs.length ? rs.reduce((n, r) => n + (r.value || 0), 0) : null;
  };
  return {
    date: start,
    rows,
    milk: sum("bottle"),
    nursing: sum("nursing"),
    sleep: rows.some((r) => r.kind === "sleep")
      ? sleepMinutes(rows, +start, +end)
      : null,
    diapers: eliminationSummary(rows).changes.total,
    urinations: eliminationSummary(rows).urinations.total,
    elimination: eliminationSummary(rows),
    feeds: rows.filter((r) => r.kind === "bottle" || r.kind === "nursing")
      .length,
  };
}
export function weekAnalytics(records: CareRecord[], now = new Date()) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() - 6 + i);
    return dayAnalytics(records, d);
  });
}
export function trendQuestion(
  records: CareRecord[],
  metric: Metric,
  language: "zh" | "en",
  now = new Date(),
) {
  const zh = language === "zh";
  const labels = {
    milk: zh ? "瓶喂奶量" : "bottle milk",
    nursing: zh ? "亲喂时长" : "nursing duration",
    sleep: zh ? "睡眠时长" : "sleep duration",
    diapers: zh ? "换尿布次数" : "diaper changes",
    urinations: zh ? "小便次数" : "urinations",
  };
  return zh ? `最近7天的${labels[metric]}有什么变化？` : `How has ${labels[metric]} changed in the last seven days?`;
}

export function periodAnalytics(records:CareRecord[],days:number,now=new Date()){
 return Array.from({length:days},(_,i)=>{const date=new Date(now);date.setDate(date.getDate()-days+1+i);return dayAnalytics(records,date)});
}
export function feedingSummary(records:CareRecord[],days:number,now=new Date()){
 const start=new Date(now);start.setDate(start.getDate()-days+1);start.setHours(0,0,0,0);
 const rows=records.filter(r=>r.kind==='bottle'&&Date.parse(r.at)>=+start&&Date.parse(r.at)<=+now);
 const values=rows.map(r=>r.value||0);const total=values.reduce((a,b)=>a+b,0);
 const balances=rows.map(milkBalance).filter(b=>b!==null);
 const prepared=balances.reduce((n,b)=>n+b.prepared,0),leftover=balances.reduce((n,b)=>n+b.leftover,0);
 return {preparedCount:balances.length,prepared:balances.length?prepared:null,leftover:balances.length?leftover:null,leftoverRate:prepared>0?leftover/prepared:null,count:rows.length,total:rows.length?total:null,average:rows.length?total/rows.length:null,min:rows.length?Math.min(...values):null,max:rows.length?Math.max(...values):null};
}
