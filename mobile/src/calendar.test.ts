import test from 'node:test';import assert from 'node:assert/strict';import {monthDays,shiftMonth} from './calendar';import {parseLocal} from './domain';
test('month grid covers leap February with Monday start and switches years',()=>{const days=monthDays(new Date(2024,1,15));assert.equal(days.filter(Boolean).length,29);assert.equal(days.length%7,0);assert.equal(shiftMonth(new Date(2026,11,31),1).getFullYear(),2027);assert.equal(shiftMonth(new Date(2026,0,31),1).getDate(),1);});
test('a naked number is not an observation; bathing is a daily observation',()=>{assert.deepEqual(parseLocal('3'),[]);assert.equal(parseLocal('刚给宝宝洗澡了')[0].kind,'note');});

import {birthFacts} from './birthFacts';
test('lunar zodiac uses lunar year rather than Gregorian January',()=>{assert.equal(birthFacts('2026-02-16')?.animal,'蛇');assert.equal(birthFacts('2026-02-17')?.animal,'马');assert.equal(birthFacts('2026-09-01')?.sign,'处女座');});

import {validBirthTime} from './domain';
test('birth time accepts precise seconds and legacy minutes',()=>{assert.equal(validBirthTime('08:35:59'),true);assert.equal(validBirthTime('08:35'),true);assert.equal(validBirthTime('08:35:60'),false);});
