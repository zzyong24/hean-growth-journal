-- Hean information screen, LingClaw API 4+. Filled locally by install.py.
local endpoint = "__HEAN_DISPLAY_URL__"
local token = "__HEAN_DISPLAY_TOKEN__"
local data, request_id = nil, nil
local elapsed, redraw, page, offline = 30000, 0, 1, false
local interval, cached, save_elapsed, saved_version = 3000, false, 10000, nil
local fields={"date","name","ageDays","consumedMl","feedCount","preparedMl","leftoverMl","completeMilkCount","urinations","diaperChanges","sleepMinutes","bottlePreparedMl","cloudSyncLabel","phoneSyncLabel","version","pendingPhoneCount"}
local function valid(v)
 if type(v)~="table" or type(v.name)~="string" or #v.name>32 or type(v.date)~="string" or not string.match(v.date,"^%d%d%d%d%-%d%d%-%d%d$") or type(v.version)~="string" or #v.version~=20 then return false end
 if type(v.cloudSyncLabel)~="string" or #v.cloudSyncLabel>8 or type(v.phoneSyncLabel)~="string" or #v.phoneSyncLabel>40 then return false end
 for i=3,12 do local v=v[fields[i]];if v~=nil and (type(v)~="number" or v<0 or v>1000000 or v~=v) then return false end end
 return true
end
local function same_day()
 local now=clock and clock.localtime()
 return now and data and data.date==string.format("%04d-%02d-%02d",now.year,now.month,now.day)
end
local function persist()
 if not data or not storage or save_elapsed<10000 or data.version==saved_version then return end
 local value={schema=1};for _,k in ipairs(fields) do if data[k]~=nil then value[k]=data[k] end end
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
local function draw()
 screen.begin(bg)
 screen.rect(0,0,app.width,3,peach)
 text("禾安 · 成长日记",12,14,peach)
 local now=clock and clock.localtime()
 text(now and string.format("%02d:%02d",now.hour,now.min) or "--:--",180,14,muted)
 text(data and (data.name.." · 第"..number(data.ageDays).."天") or "陪伴宝宝的每一天",12,44)
 card(12,74,216,78,tint)
 if page==1 then
  text("今日实际奶量",24,82,muted)
  local x=big(data and data.consumedMl,26,106);text("ml",math.min(x+5,199),126,peach)
  card(12,160,103,43,sage); card(124,160,104,43,0xF5EFE8)
  text("小便 "..number(data and data.urinations).." 泡\n换尿布 "..number(data and data.diaperChanges).." 次",20,164)
  text("睡眠 "..number(data and data.sleepMinutes).." 分\n瓶喂 "..number(data and data.feedCount).." 次",131,164)
 else
  text("已知剩余奶量",24,82,muted)
  local x=big(data and data.leftoverMl,26,106);text("ml",math.min(x+5,199),126,peach)
  text("仅统计 "..number(data and data.completeMilkCount).." 次完整记录",16,163,muted)
  text(data and type(data.bottlePreparedMl)=="number" and ("进行中 · 已冲 "..number(data.bottlePreparedMl).." ml") or "按功能键返回今日概览",16,185)
 end
 local footer
 if data and not same_day() then footer="日期已变化 · 等待更新"
 elseif offline then footer="离线缓存 · "..(data and data.cloudSyncLabel or "待联网")
 elseif cached then footer="缓存已载入 · 正在更新"
 elseif not data then footer="正在同步禾安…"
 elseif math.floor(redraw/10000)%2==0 then footer="云端更新 "..data.cloudSyncLabel
 else footer="按键切页 · 小聆语音记" end
 text(footer,12,216,muted)
 screen.present()
end
local function refresh()
 if request_id or not http or app.api_version<4 or string.sub(token,1,2)=="__" then return end
 local url=endpoint
 if data then url=url.."?since="..data.version end
 request_id=http.get(url,{headers={Authorization="Bearer "..token},timeout_ms=8000,max_response_bytes=4096})
 elapsed=0
end
function on_start()
 if storage then local value=storage.load();if valid(value) and value.schema==1 then data=value;cached=true;saved_version=value.version end end
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
function on_button_click(id) if id=="function" then page=3-page;draw();if elapsed>5000 then refresh() end end end
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
