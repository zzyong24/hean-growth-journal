# 测试与验收

```sh
npm --prefix mobile ci
npm --prefix server ci
npm run check
npm run build
python3 devices/xiaoling/agent/bootstrap.py
npm --prefix devices/xiaoling/agent ci
npm --prefix devices/xiaoling/agent run typecheck
npm --prefix devices/xiaoling/agent test
```

Node 24 是必需条件：服务使用内置 node:sqlite，也直接加载可擦除类型的 TypeScript 领域代码。测试使用合成数据和本地替身；缺凭据测试会隔离相关环境，不能依赖开发机恰好没有 API Key。

## 关键自动化覆盖

- 冲奶开始不计摄入；结束、剩余、实际量、取消、撤销和冲突校验。
- 缺少冲泡量不会伪造剩余；尿次与换尿布次数独立。
- 原话持久化、慢解析先确认、后台完成、请求重试幂等、不同真实事件不合并。
- 手机落盘后再确认；版本冲突转 review；云端未确认结果能跨手机旧快照持续显示。
- 显示凭据不能写入、不能跨宝宝读取；摘要不泄漏原话或附件。
- 相同心跳复用缓存，真实编辑/确认会失效，跨中国时区午夜更新日期。
- 相册引用清理、Live Photo 伴随媒体、删除失败重试。
- 临时音乐票据范围和期限、路径约束、Range 与越界请求。
- LazyResponse 不提前发空 TTS URL，文字、完成与取消事件保持 SDK 生命周期。

Lua 缓存测试需要另外下载官方模拟器，按官方系统版本选择可执行文件：

```sh
cat devices/xiaoling/hean.lua devices/xiaoling/tests/cache.lua > /private/tmp/hean-cache-test.lua
/path/to/lingclaw-sdk --headless /private/tmp/hean-cache-test.lua /private/tmp/hean-cache-test.png
```

该测试使用合成数据，不把真实配对 Lua 拼进测试文件。

## 必须做的真机检查

| 场景 | 通过依据 |
|---|---|
| 保持看板后语音查询 | 后台实际读取、设备播报正确且看板仍刷新 |
| 新增真实护理记录 | 只有一个事件、真实 receipt saved、读回数量、看板更新 |
| 慢解析 | 先听到“收到，正在保存”，处理中不谎称成功，稍后回执完成或明确失败 |
| 手机暂时关闭 | 云端记录可查；手机下次打开后同步并确认落盘 |
| 音乐 | 服务 GET、设备 PLAYING、人确认出声三者同时成立 |
| 唤醒打断音乐 | 能再次查询或记录；看板持续运行 |
| 删除临时媒体 | APP 不再显示、引用正确清理、系统相册原图还在 |
| 重启与断网 | 重新载入看板后显示可辨识缓存，恢复联网更新，跨天不串数据 |

自动化不能证明麦克风、音量或扬声器真的工作。不要向家庭时间线加虚构喂养作验收；用隔离测试档案，或核对用户真实发生的下一笔记录。

## 当前限制

- 开发版 USB Lua 看板重启后要重新载入；没有固件开机自启动方案。
- 曲库文件私有、需要联网；没有离线歌曲、断点续播或后台混音。
- 复杂语音解析仍依赖模型，ASR 也可能误听；原话与失败回执必须可查。
- 异步任务完成会更新云端/看板/APP，尚不主动向结束的对话追加播报。
- 手机同步是打开 APP 后的行为，不保证 iOS 后台常驻。
- 访客身份不是完整家庭账号系统；没有完整媒体云备份或已上线 App Store 承诺。
