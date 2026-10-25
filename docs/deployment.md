# 部署与真机打包

## 两种服务入口

需要 Node.js 24、npm、Python 3；iPhone 原生构建需要 macOS、Xcode 和自己的 Apple 签名账户。

```sh
npm --prefix mobile ci
npm --prefix server ci
cp server/.env.example server/.env
cp mobile/.env.example mobile/.env
```

`node server/index.mjs` / `npm --prefix server start` 是简单模型代理，默认 8787，使用 `APP_TOKEN`。小聆需要完整 gateway：它在内部随机端口启动模型代理，对外提供访客身份、护理回执、只读摘要和私有音频。

在服务端 `.env` 配置自己的供应商凭据及以下参数。使用 gateway 时将模板的 `PORT=8787` 改为 `8790`；`PUBLIC_ORIGIN` 必须与 Agent 的音乐源域名相同。

```dotenv
PORT=8790
PUBLIC_ORIGIN=https://hean.example.com
STATE_DIRECTORY=/var/lib/hean
ALLOWED_ORIGINS=https://hean.example.com
```

`hean.example.com` 是占位符，部署时替换为真实 HTTPS 域名。服务在 127.0.0.1 监听。运行 `npm --prefix server run gateway`；服务端密钥只在服务机器上配置。gateway 内部生成模型代理的 APP_TOKEN，不把它当成手机访客令牌。

部署目录应保留仓库相对布局，包括 `server/`、共享领域代码 `mobile/src/` 及 `devices/xiaoling/hean.lua` 公共模板。语音打开看板由服务器渲染该模板，签发五分钟下载票据；不要上传已填入家庭凭据的 Lua 作为模板。`PUBLIC_ORIGIN` 也用于看板下载，必须是与 Agent 配置一致的 HTTPS 源站。

最小 systemd 示例（先创建低权限 `hean` 用户，安装依赖和 Node 24）：

```ini
[Unit]
Description=Hean gateway
After=network-online.target
[Service]
User=hean
WorkingDirectory=/opt/hean/current/server
EnvironmentFile=/etc/hean.env
Environment=STATE_DIRECTORY=/var/lib/hean
ExecStart=/usr/local/bin/node gateway.mjs
StateDirectory=hean
UMask=0077
Restart=on-failure
TimeoutStopSec=280
NoNewPrivileges=yes
[Install]
WantedBy=multi-user.target
```

Nginx 在配置自己的证书后代理到 gateway。音频需要保留 Range，模型入口不能缓冲；默认代理会传递 Authorization 与 Range。

```nginx
location / {
    proxy_pass http://127.0.0.1:8790;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_buffering off;
    proxy_read_timeout 180s;
    client_max_body_size 65m;
}
```

检查 `/health` 返回成功，未授权的 `/api/display/summary`、`/mcp/hean` 返回 401。仅健康检查正常不代表模型、语音、媒体播放全部通过。

## 手机先同步，助手再配对

1. 手机配置 `EXPO_PUBLIC_API_URL` 为服务 HTTPS 源站，gateway 模式设置 `EXPO_PUBLIC_GUEST_AUTH=true`。原有简单代理模式使用 APP_TOKEN。
2. 打开禾安，在设置中启用助手同步，等待首个宝宝档案上传。同步默认是明确开启的功能。
3. 在服务器执行下面的管理员工具，列出已经同步的 owner/profile。它直接操作指定 SQLite 文件，不启动第二个 voiceStore 实例，也不打断正在处理的回执。

```sh
node tools/assistant-admin.mjs list --state /var/lib/hean
mkdir -m 700 /private/hean-pair
node tools/assistant-admin.mjs pair --state /var/lib/hean \
  --owner OWNER_ID --profile PROFILE_ID \
  --origin https://hean.example.com --out /private/hean-pair
```

工具生成两个 0600 文件，不向终端打印令牌：`assistant-link.json` 可记录和查询当前宝宝；`display-link.json` 只能读摘要。原始文件供自己的设备配置使用，不能提交 Git。已有文件不会被覆盖。也可用已认证手机调用 `POST /api/voice/pair` 和 `/api/voice/display-pair`，请求体为 `{"profileKey":"PROFILE_ID"}`。

将 voice token 作为平台自定义模型的 Bearer API Key，base URL 为 `https://你的域名/api/voice`，模型 `hean-care`。具体平台和看板步骤见[小聆教程](xiaoling-development.md)。访客凭据绑定此安装，当前不提供账号找回、跨手机家庭成员管理；卸载前需备份。

## iOS Release 防错构建

环境变量参与 JS 打包。只运行 Xcode Release 而没传入服务地址，可能把 `localhost:8787` 写进真机包。

首次生成原生工程：

```sh
cd mobile
npx expo prebuild --platform ios
cd ..
```

使用带检查的构建脚本，替换域名和团队 ID：

```sh
EXPO_PUBLIC_API_URL=https://hean.example.com \
EXPO_PUBLIC_GUEST_AUTH=true IOS_TEAM_ID=YOURTEAMID \
node tools/build-ios-release.mjs
```

脚本拒绝占位域名、非 HTTPS、缺失身份配置和无效团队 ID；调用 Release 构建后检查 main.jsbundle 中的实际 API 地址。`--dry-run` 仅核对配置与命令。构建产物默认在忽略的 `.codex/ios-release`，再通过 Xcode Devices 或 `xcrun devicectl device install app` 安装。设备需解锁；不要提交签名文件和生成的 ios 目录。

## 数据边界、备份与回滚

- 手机保存完整本地记录和媒体；助手同步上传护理快照、待核对信息与回执。照片/视频文件没有自动云备份功能。
- 云端保存原话优先于推理。状态为 processing / saved / review / failed；只有手机落盘后回执才标记 phone_persisted。
- 停机升级前先观察处理队列，等待处理结束，或给服务足够的退出时间。用 SQLite backup API 备份 voice.sqlite/access.sqlite；不能仅复制运行中的主文件而漏掉 WAL。
- 代码按 release 目录部署，保留前一版本和环境变量备份。回滚代码不覆盖新产生的家庭数据；数据库迁移要单独核对兼容性。
- 调试日志可能含 ASR 原话、临时音频地址，放私有目录。仓库忽略规则只是防误提交，发布前仍须检查差异。
