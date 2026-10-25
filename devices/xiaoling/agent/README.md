# 禾安小聆语音 Agent

基于官方 Agent SDK 0.1.1，保留官方 ASR、TTS、打断和默认设备工具。在默认工具准备后注入 `hean_play_audio_link` / `hean_stop_audio`，使其在 Lua 看板运行时仍可用。护理路由由独立禾安模型入口处理。

## 构建与部署

```sh
python3 bootstrap.py
python3 configure.py --product-id YOUR_LISTENAI_PRODUCT_ID --origin https://hean.example.com
npm ci
npm run typecheck
npm test
ling app build --release
ling app deploy --version 0.1.5 --activate
```

`bootstrap.py` 下载官方 0.1.1 SDK 并核验固定 SHA-256。`vendor/`、`sdk/`、`node_modules/` 和 `dist/` 均为忽略的生成文件。`listenai.toml` 与 `config.local.ts` 保存自己的产品 ID 和 HTTPS 源站，两者都被忽略；API Key 通过用户本人运行 `ling login` 输入，不写入项目。

2026-10-25 验证版本 `v0.1.5`。部署只更新当前产品测试链，未刷写固件。回滚可在聆思平台选择此前版本；不要退回只调用专用音乐 MCP 的 v0.1.1–v0.1.3，它们不能在此设备的小应用模式播放。

## 音频

`hean_play_audio_link` 验证固定 HTTPS 域名、`abc/lubinghua/playlist` 曲目 ID 和 64 位临时票据；不接受任意 URL、重定向参数或内网地址。通过官方 `emitTTSStreamUrl` 将用户 MP3 交给设备音频播放器，不调用收费音乐搜索，也不合成歌曲。

音频使用设备语音播放通道，因此唤醒会中断歌曲。停止请求利用同一语音生命周期；没有承诺暂停后续播、后台混音或离线播放。没有播放器真实回执时，不把发送指令等同于已出声。

## 播报与异步记录

`LazyResponseProvider` 在产生文字后才打开官方 TTS 流，避免上下文准备与慢解析时空音频连接先超时。服务器先持久保存原话，复杂记录约 200 ms 后回复收到，后台继续处理；明确的即时奶量可直接校验保存并读回数量。详见[完整开发教程](../../../docs/xiaoling-development.md)。
