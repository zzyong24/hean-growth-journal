import {test} from 'node:test';import assert from 'node:assert/strict';import {occurrences,validReminder,remindersOnDate} from './reminders/plan';
const plan={id:'ad',title:'AD',start:'2026-09-01',end:'2026-09-05',time:'09:00',mode:'days' as const,interval:1,enabled:true};
test('daily plan includes end date and skips past occurrences',()=>{const xs=occurrences(plan,new Date('2026-09-02T10:00:00'));assert.equal(xs.length,3);assert.equal(xs[0].getDate(),3);assert.equal(xs[0].getHours(),9);assert.equal(xs[2].getDate(),5)});
test('every two days anchors to start and pause yields no notifications',()=>{assert.deepEqual(occurrences({...plan,interval:2},new Date('2026-08-31T00:00:00')).map(d=>d.getDate()),[1,3,5]);assert.equal(occurrences({...plan,enabled:false}).length,0)});
test('hour interval ends at end date and invalid plans are rejected',()=>{assert.equal(occurrences({...plan,start:'2026-09-01',end:'2026-09-01',mode:'hours',interval:6},new Date('2026-09-01T00:00:00')).length,3);for(const r of [{...plan,interval:0},{...plan,time:'25:00'},{...plan,end:'2026-08-01'},{...plan,start:'2026-02-30'}])assert.equal(validReminder(r),false)});

test('calendar includes historical plans and respects recurrence boundaries',()=>{
 const r={id:'calendar',title:'洗澡',start:'2026-09-01',end:'2026-09-10',time:'09:00',mode:'days' as const,interval:2,enabled:true};
 assert.equal(remindersOnDate([r],'2026-09-03').length,1);
 assert.equal(remindersOnDate([r],'2026-09-04').length,0);
 assert.equal(remindersOnDate([r],'2026-09-11').length,0);
 assert.equal(remindersOnDate([{...r,enabled:false}],'2026-09-03').length,0);
});
