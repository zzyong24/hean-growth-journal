-- Hean information screen, LingClaw API 4+. Filled locally by install.py.
local endpoint = "__HEAN_DISPLAY_URL__"
local token = "__HEAN_DISPLAY_TOKEN__"
local data, request_id = nil, nil
local elapsed, redraw, page, offline = 30000, 0, 1, false
local interval, cached, save_elapsed, saved_version = 3000, false, 10000, nil
local fields={"date","name","ageDays","consumedMl","feedCount","preparedMl","leftoverMl","completeMilkCount","urinations","diaperChanges","sleepMinutes","bottlePreparedMl","cloudSyncLabel","phoneSyncLabel","version","pendingPhoneCount"}
local trend_fields={"milkMl","diaperChanges","sleepMinutes"}
local titles={"今日概览","奶量走势","换尿布趋势","睡眠时长","冲泡与剩余"}
local function valid_trend(v,date)
 if type(v)~="table" or type(v.startDate)~="string" or not string.match(v.startDate,"^%d%d%d%d%-%d%d%-%d%d$") or v.endDate~=date then return false end
 for _,k in ipairs(trend_fields) do
  local a=v[k];if type(a)~="table" or #a~=7 then return false end
  for i=1,7 do local n=a[i];if n~=json.null and (type(n)~="number" or n<0 or n>1000000 or n~=n) then return false end end
 end
 return true
end
local function valid(v)
 if type(v)~="table" or type(v.name)~="string" or #v.name>32 or type(v.date)~="string" or not string.match(v.date,"^%d%d%d%d%-%d%d%-%d%d$") or type(v.version)~="string" or #v.version~=20 then return false end
 if type(v.cloudSyncLabel)~="string" or #v.cloudSyncLabel>8 or type(v.phoneSyncLabel)~="string" or #v.phoneSyncLabel>40 then return false end
 for i=3,12 do local v=v[fields[i]];if v~=nil and (type(v)~="number" or v<0 or v>1000000 or v~=v) then return false end end
 return v.trend==nil or valid_trend(v.trend,v.date)
end
local function same_day()
 local now=clock and clock.localtime()
 return now and data and data.date==string.format("%04d-%02d-%02d",now.year,now.month,now.day)
end
local function persist()
 if not data or not storage or save_elapsed<10000 or data.version==saved_version then return end
 local value={schema=2};for _,k in ipairs(fields) do if data[k]~=nil then value[k]=data[k] end end
 -- Device storage only accepts flat scalar values (32 entries / 1024 bytes).
 if data.trend then
  value.trendStart=data.trend.startDate
  for _,k in ipairs(trend_fields) do value["t_"..k]=json.encode(data.trend[k]) end
 end
 local encoded=json.encode(value);if not encoded or #encoded>1024 then return end
 local ok=storage.save(value,604800);save_elapsed=0;if ok then saved_version=data.version end
end
local bg, ink, muted, peach, tint, sage = 0xFFFCF7, 0x47372E, 0x8A7668, 0xBD674A, 0xF7E5D8, 0xEDF1E5
local function text(v,x,y,c) screen.text(v,x,y,c or ink) end
local function number(v) if type(v)=="number" then return tostring(math.floor(v+0.5)) end return "--" end
local function card(x,y,w,h,c)
 screen.rect(x+4,y,w-8,h,c); screen.rect(x,y+4,w,h-8,c)
end
local segments={['0']="abcedf",['1']="bc",['2']="abged",['3']="abgcd",['4']="fgbc",['5']="afgcd",['6']="afgecd",['7']="abc",['8']="abcdefg",['9']="abfgcd",['-']="g"}
local positions={a={4,0,16,4},b={20,4,4,14},c={20,22,4,14},d={4,36,16,4},e={0,22,4,14},f={0,4,4,14},g={4,18,16,4}}
local function big(v,x,y)
 local s=number(v); if #s>5 then s="99999" end
 for i=1,#s do
  local code=segments[string.sub(s,i,i)] or "g"
  for j=1,#code do local p=positions[string.sub(code,j,j)];screen.rect(x+(i-1)*30+p[1],y+p[2],p[3],p[4],peach) end
 end
 return x+#s*30
end
local function short_name(s)
 local p=utf8.offset(s,5);return p and string.sub(s,1,p-1) or s
end
local function status()
 if offline then return " · 离线缓存" end
 if cached then return " · 缓存" end
 if not data then return " · 同步中" end
 return ""
end
-- Three-pixel strips approximate a line using the public rectangle API.
-- At most 66 strips + 7 points, safely below the device's 128-rectangle limit.
local function line(x0,y0,x1,y1)
 for x=x0,x1-1,3 do
  local next_x=math.min(x+3,x1)
  local a=math.floor(y0+(y1-y0)*(x-x0)/(x1-x0))
  local b=math.floor(y0+(y1-y0)*(next_x-x0)/(x1-x0))
  screen.rect(x,math.min(a,b),next_x-x+1,math.abs(b-a)+2,peach)
 end
end
local function graph(key,unit,bars)
 local trend=data and data.trend
 local values=trend and trend[key]
 text("近7天 · "..unit..(status()~="" and status() or " · 空白未记录"),12,43,muted)
 text("今天 "..number(values and values[7]).." "..unit,12,67,ink)
 local maximum,count=0,0
 if values then for i=1,7 do if type(values[i])=="number" then maximum=math.max(maximum,values[i]);count=count+1 end end end
 local step=key=="milkMl" and 100 or key=="sleepMinutes" and 60 or 5
 local ceiling=math.max(step,math.ceil(maximum/step)*step)
 local top,bottom,left,right=111,175,31,217
 screen.rect(left,top,right-left+1,1,tint)
 screen.rect(left,143,right-left+1,1,tint)
 screen.rect(left,bottom,right-left+1,1,muted)
 if count>0 then
  text(number(ceiling),12,91,muted)
  for i=1,7 do
   local x=left+(i-1)*31
   screen.rect(x,bottom,1,4,muted)
   if type(values[i])=="number" then
    local y=bottom-math.floor(values[i]/ceiling*(bottom-top))
    if bars then screen.rect(x-7,y,15,math.max(2,bottom-y),i==7 and peach or 0xD5B393)
    else
     if i>1 and type(values[i-1])=="number" then line(x-31,bottom-math.floor(values[i-1]/ceiling*(bottom-top)),x,y) end
     screen.rect(x-2,y-2,5,5,peach)
    end
   end
  end
 else text("暂无明确记录",65,132,muted) end
 text(trend and string.sub(trend.startDate,6):gsub("-","/") or "--/--",24,184,muted)
 text(trend and string.sub(trend.endDate,6):gsub("-","/") or "--/--",181,184,muted)
end
local function draw()
 screen.begin(bg)
 screen.rect(0,0,app.width,3,peach)
 text("禾安 · "..titles[page],12,14,peach)
 local now=clock and clock.localtime()
 text(now and string.format("%02d:%02d",now.hour,now.min) or "--:--",180,14,muted)
 if page==1 then
  text(data and (short_name(data.name).." · "..number(data.ageDays).."天"..status()) or "正在同步禾安…",12,44)
  card(12,74,216,78,tint)
  text("今日实际奶量",24,82,muted)
  local x=big(data and data.consumedMl,26,106);text("ml",math.min(x+5,199),126,peach)
  card(12,160,103,43,sage); card(124,160,104,43,0xF5EFE8)
  text("小便 "..number(data and data.urinations).." 泡\n换尿布 "..number(data and data.diaperChanges).." 次",20,164)
  text("睡眠 "..number(data and data.sleepMinutes).." 分\n瓶喂 "..number(data and data.feedCount).." 次",131,164)
 elseif page==2 then graph("milkMl","ml",false)
 elseif page==3 then graph("diaperChanges","次",true)
 elseif page==4 then graph("sleepMinutes","分钟",true)
 else
  text("成对记录"..status(),12,44,muted)
  card(12,74,216,78,tint)
  text("已知剩余奶量",24,82,muted)
  local x=big(data and data.leftoverMl,26,106);text("ml",math.min(x+5,199),126,peach)
  text("已冲泡 "..number(data and data.preparedMl).." ml",16,162,muted)
  local unknown=data and math.max(0,(data.feedCount or 0)-(data.completeMilkCount or 0))
  text(data and type(data.bottlePreparedMl)=="number" and ("进行中 · 已冲 "..number(data.bottlePreparedMl).." ml") or (number(data and data.completeMilkCount).."次完整 · "..number(unknown).."次未知"),16,183)
 end
 for i=1,#titles do screen.rect(82+(i-1)*16,206,10,3,i==page and peach or tint) end
 text("短按切页 · 长按3秒退出",12,218,muted)
 screen.present()
end
local function refresh()
 if request_id or not http or app.api_version<4 or string.sub(token,1,2)=="__" then return end
 local url=endpoint
 -- A legacy/corrupt cache without trends needs a full payload, even if its
 -- summary version matches. Otherwise an unchanged response cannot repair it.
 if data and data.trend then url=url.."?since="..data.version end
 request_id=http.get(url,{headers={Authorization="Bearer "..token},timeout_ms=8000,max_response_bytes=4096})
 elapsed=0
end
function on_start()
 if storage then
  local value=storage.load()
  if type(value)=="table" and value.schema==2 and type(value.trendStart)=="string" then
   local trend={startDate=value.trendStart,endDate=value.date}
   for _,k in ipairs(trend_fields) do if type(value["t_"..k])=="string" then trend[k]=json.decode(value["t_"..k]) end end
   if valid_trend(trend,value.date) then value.trend=trend end
  end
  if valid(value) and (value.schema==1 or value.schema==2) then data=value;cached=true;saved_version=value.schema==2 and value.trend and value.version or nil end
 end
 if data and not same_day() then data=nil;saved_version=nil end
 draw();refresh()
end
function on_tick(dt_ms)
 elapsed=elapsed+dt_ms;redraw=redraw+dt_ms;save_elapsed=save_elapsed+dt_ms
 -- Never label yesterday's cached total as today's milk.
 if data and not same_day() then data=nil;cached=false;saved_version=nil;elapsed=interval end
 if elapsed>=interval then refresh() end
 persist()
 if redraw%1000<dt_ms then draw() end
end
-- A 3-second hold belongs to the firmware and exits the app; it does not emit
-- this click callback. Do not fake exit by blanking the screen or crashing Lua.
function on_button_click(id) if id=="function" then page=page%#titles+1;draw() end end
function on_http_response(id,response)
 if id~=request_id then return end
 request_id=nil
 if response.error or response.status~=200 then offline=true;interval=math.min(interval*2,60000);draw();return end
 local value,err=json.decode(response.body)
 if type(value)=="table" then for _,k in ipairs(fields) do if value[k]==json.null then value[k]=nil end end end
 if not err and type(value)=="table" and value.unchanged and data and value.version==data.version then
  if type(value.cloudSyncLabel)=="string" and #value.cloudSyncLabel<=8 then data.cloudSyncLabel=value.cloudSyncLabel end
  if type(value.phoneSyncLabel)=="string" and #value.phoneSyncLabel<=40 then data.phoneSyncLabel=value.phoneSyncLabel end
  offline=false;cached=false;interval=3000;draw();return
 end
 if err or not valid(value) then offline=true;interval=math.min(interval*2,60000);draw();return end
 -- The service bounds names and only returns typed summary fields.
 data=value;offline=false;cached=false;interval=3000;persist();draw()
end
