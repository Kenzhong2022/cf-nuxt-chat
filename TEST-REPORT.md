# WebSocket 聊天服务测试报告

> 测试日期：2026-09-17
> 测试环境：Windows / wrangler 4.133.0 / node v22.18.0 / 本地 workerd（`npx wrangler --cwd .output dev`）

## 一、被测系统

本项目为纯后端 WebSocket 服务，不包含前端 UI：

| 组件 | 文件 | 职责 |
|---|---|---|
| Worker 入口 | `worker/index.ts` | `/room/:roomId` 的 WebSocket 升级请求路由到对应 DO；其余请求交给 Nitro |
| 房间 DO | `worker/chat-room.ts` | `ChatRoom` Durable Object，每个 roomId 一个独立实例，房间内广播/私聊/在线列表 |
| 配置 | `nuxt.config.ts` / `wrangler.jsonc` | `nitro.entry` 指向自定义入口；声明 `CHAT_ROOM` 绑定与 `exports.ChatRoom`（sqlite 存储） |

## 二、消息协议

客户端 → 服务端：

```jsonc
{ "type": "join", "name": "昵称" }            // 加入/改名
{ "type": "chat", "text": "hello" }           // 房间内广播
{ "type": "dm", "to": "<成员id>", "text": "hi" } // 对单个成员私聊
"ping"                                        // 心跳（纯文本）
```

服务端 → 客户端：

```jsonc
{ "type": "welcome", "id": "...", "members": [...] } // 连接后推送自己的 id + 在线列表
{ "type": "presence", "members": [...] }             // 在线列表变更
{ "type": "joined", "member": { "id", "name" } }     // 有人加入
{ "type": "left", "member": { "id", "name" } }       // 有人离开
{ "type": "chat", "from", "text", "ts" }             // 广播消息
{ "type": "dm", "from", "text", "ts" }               // 私聊消息
{ "type": "error", "message": "..." }                // 错误提示
"pong"                                               // 心跳自动应答
```

## 三、测试用例与结果

测试脚本为临时 Node 脚本（`test-ws.mjs`，测试后已删除），使用 Node 内置 `WebSocket` 同时建立多条连接，验证消息路由行为。

| # | 用例 | 方法 | 结果 |
|---|---|---|---|
| 1 | 同房间广播 | roomA 中 A1 发送 `chat`，断言 A2 收到 | ✅ PASS |
| 2 | 广播不发给发送者 | 断言 A1 自己收不到该 `chat` | ✅ PASS |
| 3 | **房间隔离** | roomB 的 B1 断言收不到 roomA 的任何 `chat` | ✅ PASS |
| 4 | 私聊送达 | A1 → A2 发送 `dm`，断言 A2 收到 | ✅ PASS |
| 5 | **私聊第三人不可见** | 房间内 A3 断言收不到 A1→A2 的 `dm` | ✅ PASS |
| 6 | 离开通知 | A2 关闭连接，A1/A3 收到 `left` | ✅ PASS |
| 7 | 在线列表更新 | A2 离开后的最终 `presence` 不含 A2 | ✅ PASS |
| 8 | welcome 携带成员列表 | A2 连接后 `welcome.members` 非空 | ✅ PASS |
| 9 | 心跳 | 发送 `ping`，收到 `pong`（runtime 自动应答，不唤醒休眠 DO） | ✅ PASS |
| 10 | HTTP 层不受影响 | `GET /` 返回 200，Nuxt 页面正常渲染 | ✅ PASS |

**结论：10/10 全部通过。**

## 四、测试过程中发现并修复的问题

| 问题 | 原因 | 修复 |
|---|---|---|
| 成员断开后 `presence` 在线列表仍包含该成员 | `webSocketClose` 触发时该连接仍在 `ctx.getWebSockets()` 中（readyState 为 CLOSED） | `members()` 按 `readyState === OPEN` 过滤后再返回 |

## 五、构建产物验证

- `npm run build` 成功；`.output/server/index.mjs` 正确具名导出：`export { ChatRoom, ... as default }`
- Nitro 自动生成的 `.output/server/wrangler.json` 包含 `durable_objects.bindings` 与 `exports.ChatRoom`（sqlite）
- `wrangler dev` 绑定面板确认 `env.CHAT_ROOM (ChatRoom) Durable Object local` 加载正常

## 六、已知限制 / 注意事项

1. **`nuxt dev` 下 WebSocket 不可用**：`nitro-cloudflare-dev` 的 platform proxy 不支持 Durable Object 绑定。本地联调请用：
   ```bash
   npm run build
   npx wrangler --cwd .output dev
   ```
2. 部署后正式地址形如 `wss://cf-nuxt-chat.<子域>.workers.dev/room/<roomId>`，另一个前端项目直接 `new WebSocket(...)` 接入。
3. 免费计划要求 DO 使用 sqlite 存储，配置中已通过 `exports.ChatRoom.storage = "sqlite"` 声明。
4. 消息文本长度服务端截断保护：`chat`/`dm` 最长 2000 字符，昵称最长 32 字符。
