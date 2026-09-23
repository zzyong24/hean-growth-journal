/// <reference types="node" />
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseLocal,
  validateRecord,
  mergeRecords,
  statsForDay,
  validBirthday,
} from "./domain";
const now = "2026-09-07T10:00:00.000Z";
test("paragraph splits feeding and diaper", () => {
  const r = parseLocal("喝了90毫升，换了尿布", now);
  assert.deepEqual(
    r.map((x) => x.kind),
    ["bottle", "diaper"],
  );
  assert.equal(r[0].value, 90);
});
test("ambiguous remaining volume never becomes known intake", () => {
  const r = parseLocal("喝了70毫升剩10毫升", now);
  assert.equal(r[0].value, undefined);
  assert.equal(r[0].kind, "note");
});
test("relative time is retained", () =>
  assert.equal(
    parseLocal("10分钟前喝了80ml", now)[0].at,
    "2026-09-07T09:50:00.000Z",
  ));
test("unrecognized time must stay reviewable", () =>
  assert.equal(parseLocal("昨天八点喝了80毫升", now)[0].kind, "note"));
test("questions do not create events", () =>
  assert.equal(parseLocal("今天喝了多少奶？", now).length, 0));
test("negated feeding not logged as intake", () =>
  assert.equal(parseLocal("没喝90毫升", now)[0].kind, "note"));
test("nursing is not counted as bottle volume", () => {
  const rs = parseLocal("左边亲喂15分钟", now);
  assert.equal(rs[0].kind, "nursing");
  assert.equal(statsForDay(rs, new Date(now)).milk, 0);
  assert.equal(rs[0].side, "left");
});
test("candidate validation rejects invalid amount", () =>
  assert.equal(
    validateRecord({
      id: "1",
      kind: "bottle",
      at: now,
      value: -10,
      note: "",
      sourceText: "",
    }),
    false,
  ));
test("confirmation is idempotent", () => {
  const r = parseLocal("喝了90ml", now);
  assert.equal(mergeRecords(r, r).length, 1);
});
test("empty stats retain missing data distinction", () => {
  const s = statsForDay([], new Date(now));
  assert.equal(s.count, 0);
  assert.equal(s.bottles, 0);
});
test("prepared milk is not consumed milk", () =>
  assert.equal(parseLocal("冲了90毫升奶", now)[0].kind, "note"));
test("planned feeding is not a past event", () =>
  assert.equal(parseLocal("明天喝90毫升", now)[0].kind, "note"));

test("birthday validation rejects impossible dates", () => {
  assert.equal(validBirthday("2026-02-30"), false);
  assert.equal(validBirthday("2026-07-01"), true);
});

test("birth time validation and inclusive calendar age in the selected timezone", async () => {
  const { validBirthTime, ageDays } = await import("./domain");
  assert.equal(validBirthTime("23:59"), true);
  assert.equal(validBirthTime("24:00"), false);
  assert.equal(validBirthTime("10:61"), false);
  const profile={name:'Test',birthday:'2026-08-30',birthTime:'23:59',bornAt:'2026-08-30T15:59:00Z'};
  assert.equal(ageDays(profile,new Date('2026-09-08T17:40:00Z'),'Asia/Shanghai'),11);
  assert.equal(ageDays(profile,new Date('2026-09-08T15:59:59Z'),'Asia/Shanghai'),10);
  assert.equal(ageDays(profile,new Date('2026-09-08T16:00:00Z'),'Asia/Shanghai'),11);
  assert.equal(ageDays(profile,new Date('2026-08-30T15:59:59Z'),'Asia/Shanghai'),1);
  assert.equal(ageDays(profile,new Date('2026-09-08T17:40:00Z'),'America/Los_Angeles'),10);
  assert.equal(ageDays({...profile,bornAt:undefined},new Date('2026-09-08T17:40:00Z'),'Asia/Shanghai'),11);

});
test("attachment events validate while rejecting invalid attachment metadata", () => {
  const r = {
    id: "test",
    kind: "note",
    at: new Date().toISOString(),
    note: "A moment",
    sourceText: "",
    attachments: [
      { id: "media-1", type: "image", mime: "image/png", name: "photo.png" },
    ],
  };
  assert.equal(validateRecord(r), true);
  assert.equal(
    validateRecord({
      ...r,
      attachments: [{ ...r.attachments[0], id: "../escape" }],
    }),
    false,
  );
  assert.equal(mergeRecords([], [r as any])[0].attachments?.[0].id, "media-1");
});
