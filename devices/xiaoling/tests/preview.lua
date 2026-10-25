-- Append to hean.lua for a synthetic, offline headless screenshot.
-- Set preview_page=1..5 between the two source files to choose a page.
clock={localtime=function() return {year=2026,month=10,day=25,hour=19,min=30} end}
function on_start()
 data={date="2026-10-25",name="宝宝",ageDays=57,consumedMl=540,feedCount=7,preparedMl=600,leftoverMl=60,completeMilkCount=7,urinations=9,diaperChanges=5,sleepMinutes=180,cloudSyncLabel="19:30",phoneSyncLabel="10/25 19:30",version="01234567890123456789",pendingPhoneCount=0,
  trend={startDate="2026-10-19",endDate="2026-10-25",milkMl={480,560,510,json.null,450,520,540},diaperChanges={4,5,0,json.null,6,4,5},sleepMinutes={180,150,210,165,120,195,180}}}
 page=preview_page or 1;draw()
end
function on_tick() end
