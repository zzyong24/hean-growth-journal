import test from "node:test";
import assert from "node:assert/strict";
import { dayAnalytics, weekAnalytics, trendQuestion } from "./analytics";
import { CareRecord, parseLocal } from "./domain";
const r = (
  kind: CareRecord["kind"],
  at: string,
  value?: number,
): CareRecord => ({
  id: kind + at,
  kind,
  at: new Date(at).toISOString(),
  value,
  note: "",
  sourceText: "",
});
test("unrecorded categories stay null and nursing never becomes milk", () => {
  const d = dayAnalytics(
    [r("nursing", "2026-09-07T09:00:00", 20)],
    new Date("2026-09-07T12:00:00"),
  );
  assert.equal(d.milk, null);
  assert.equal(d.nursing, 20);
  assert.equal(d.sleep, null);
  assert.equal(d.feeds, 1);
});
test("sleep is split at midnight and overlapping records are not double counted", () => {
  const rows = [
    r("sleep", "2026-09-07T01:00:00", 120),
    r("sleep", "2026-09-07T00:45:00", 30),
  ];
  assert.equal(dayAnalytics(rows, new Date("2026-09-06T12:00:00")).sleep, 60);
  assert.equal(dayAnalytics(rows, new Date("2026-09-07T12:00:00")).sleep, 60);
});
test("seven days include empty days and AI summary preserves missing-data distinction", () => {
  const now = new Date("2026-09-07T12:00:00");
  const rows = [r("bottle", "2026-09-07T09:00:00", 75)];
  const week = weekAnalytics(rows, now);
  assert.equal(week.length, 7);
  assert.equal(week[0].milk, null);
  assert.equal(week[6].milk, 75);
  const text = trendQuestion(rows, "milk", "zh", now);
  assert.match(text, /最近7天/);
  assert.ok(!text.includes("2026-09-06"));
  assert.deepEqual(parseLocal(text), []);
  assert.deepEqual(parseLocal(trendQuestion(rows,"milk","en",now)), []);
});
