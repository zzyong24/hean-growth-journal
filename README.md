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

- 记录瓶喂、亲喂、吸奶、尿布、睡眠、体温、身高体重、辅食、用药和日常观察。
- 通过文字或语音整理候选记录；用户可以检查、修改后再保存。
- 按日期回看时间线、趋势和成长报告，并导出数据。
- 数据默认保存在设备本地。可选 AI 功能会把本次输入、宝宝档案及相关近期记录发送到你配置的模型服务；请先阅读服务商的隐私政策，不要填写不愿发送的数据。
- 服务器端模型凭据仅放在服务端环境变量中，不放进移动客户端。

## 技术栈

Expo / React Native + TypeScript；本地记录与媒体存储；可选 Node.js 模型代理服务。项目不附带云同步、家庭共享或生产级账号系统。

## 快速开始

需要 Node.js 24 或更新版本。

```sh
npm --prefix mobile install
npm --prefix server install
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

当前代码包含本地记录、时间线、导出、报告、媒体入口和可配置模型代理。模型兼容层与自动化测试已实现；实际凭据下的供应商认证、模型效果、费用、原生 iOS 权限和真机行为仍需由使用者单独验证。路线图和讨论欢迎通过 GitHub Issues 提交。

## 许可证

应用代码采用 MIT License。字体资源保留其各自的第三方许可，见 [THIRD-PARTY-NOTICES.txt](THIRD-PARTY-NOTICES.txt)。
