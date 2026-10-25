<div align="center">
  <img src="mobile/assets/brand/hean-icon.png" alt="禾安成长日记图标：禾苗环抱襁褓中的宝宝" width="168" />
  <h1>禾安成长日记</h1>
  <p>把日常照护记下来，需要时再找得回。</p>
  <p>
    <a href="https://github.com/zzyong24/hean-growth-journal">GitHub</a> ·
    <a href="https://github.com/zzyong24/hean-growth-journal/blob/main/LICENSE">MIT License</a>
  </p>
</div>

# 禾安成长日记

禾安成长日记是一款面向婴幼儿家庭的 iPhone 日常记录应用。它把喂养、睡眠、尿布、测量和观察整理到一条可回看、可纠正的时间线上，也支持语音、图片和视频作为记录入口。

> 本项目处于开发和测试阶段。仓库公开不代表 App Store 已上架，也不构成医疗或育儿建议。

## 能做什么

- 记录瓶喂、亲喂、吸奶、尿布、睡眠、测量、辅食、用药、补剂和观察；文字、语音、图片可辅助整理。
- 一顿奶从开始冲泡到完成、取消和撤销；分别统计准备、实际喝下和剩余。小便次数与换尿布次数也分开。
- 时间线、趋势、成长报告、CSV 导出与待核对队列；不确定的信息保留原话，支持纠正。
- 成长相册支持照片、视频与 Live Photo，支持删除 APP 内媒体，保留系统相册原件。
- 可选云端助手同步：小聆记录和查询护理信息，手机下次打开后接收回执。
- 小聆 Lua 数据看板、云端及设备缓存、自定义人设、用户提供的私有儿歌；看板与语音共存。

## 技术栈与数据范围

Expo / React Native + TypeScript；本地媒体存储；Node.js 24 + Fastify + SQLite；可选聆思 Agent SDK 与 LingClaw Lua 看板。

数据默认保存在手机。启用助手同步后，护理快照与回执会同步到自己配置的服务器；AI 功能会发送本次输入、宝宝档案及相关近期记录给所选模型服务。当前不是完整家庭账户系统，也不提供完整照片视频云备份。

## 教程

完整入口见 [开发文档](docs/README.md)，重点包括 [小聆开发与定制](docs/xiaoling-development.md)、[部署与 iOS 打包](docs/deployment.md)、[纸质本与相册导入](docs/data-import.md)、[验收与限制](docs/testing.md)、[本次更新](docs/releases/2026-10-25.md)。

## 快速开始

需要 Node.js 24 或更新版本。

```sh
npm --prefix mobile ci
npm --prefix server ci
npm run dev
```

Metro 会提供 iOS 与 Web 开发入口。Web 预览地址由 Expo 在终端显示。要连接本机模型代理，按下一节配置服务；真机开发时，将客户端 API 地址设为开发电脑在局域网内可访问的地址。

## 配置 AI 服务

```sh
cp server/.env.example server/.env
cp mobile/.env.example mobile/.env
```

只在 `server/.env` 填写你自己的模型供应商凭据。客户端 `.env` 只放服务地址和本地配对令牌；**切勿把供应商 API Key 放进 `mobile/.env`**。启动服务后，再按需配置：

- 服务端：`DUDU_API_KEY`、`DASHSCOPE_API_KEY` 或其他模板中列出的供应商设置。
- 客户端：`EXPO_PUBLIC_API_URL` 指向服务端；`EXPO_PUBLIC_APP_TOKEN` 与服务端 `APP_TOKEN` 一致。只有当服务端明确提供访客令牌接口时，才将 `EXPO_PUBLIC_GUEST_AUTH=true`。

模型请求可能包含宝宝档案及近期记录。没有配置模型凭据时，应用仍可使用本地记录和有限的规则解析；这不等于 AI 功能已连接。

## 检查

```sh
npm run check
npm run build
```

`npm run check` 会执行移动端类型检查、移动端测试和服务端测试。Web 构建不代替 iPhone 真机、原生权限或 App Store 验收。

## 隐私与安全

- 不要提交 `.env`、真实家庭记录、宝宝照片/视频、数据库、运行日志、设备配置或签名凭据。
- 仓库内示例与测试数据应保持合成数据。
- AI 服务连接前先核对将发送的数据范围，并确认供应商的数据处理方式适合你的家庭。
- 本项目不是医疗设备；记录、汇总和模型回答不能替代专业医疗判断。

## 项目状态

已在开发用 iPhone 与小聆 Arcs-Mini3 上验证记录、同步、看板、语音和私有曲库。小聆看板重启后仍需 USB 重新载入，儿歌需要网络；异步任务结束会更新看板/APP，当前不会主动向已结束的对话补播。复杂识别仍可能需要核对。更多边界见 [测试与验收](docs/testing.md)。

GitHub Actions 会运行自动化检查；真机、模型效果、原生权限与供应商费用仍需每个部署自行验收。欢迎通过 Issues 提交问题。

## 许可证

应用代码采用 MIT License。字体资源保留其各自的第三方许可，见 [THIRD-PARTY-NOTICES.txt](THIRD-PARTY-NOTICES.txt)。
