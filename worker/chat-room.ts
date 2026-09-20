/// <reference path="../worker-configuration.d.ts" />
import { DurableObject } from "cloudflare:workers";

/** 房间成员（连接级别的身份信息，持久化在 WebSocket attachment 上，支持 hibernation） */
interface Member {
  id: string;
  name: string;
}

/**
 * 聊天房间 Durable Object —— 每个 roomId 对应一个独立实例，天然隔离。
 *
 * 客户端 -> 服务端消息协议（JSON）：
 *   { type: "join", name: string }          加入/改名（连接后默认匿名，可发 join 设置昵称）
 *   { type: "chat", text: string }          广播给房间内其他人
 *   { type: "dm", to: string, text: string } 对某个成员私聊（to 为对方 id），房间内其他人不可见
 *
 * 服务端 -> 客户端消息协议（JSON）：
 *   { type: "welcome", id, members }  连接建立后推送：自己的 id + 当前在线列表
 *   { type: "presence", members }     在线列表变更
 *   { type: "joined", member }        有人加入
 *   { type: "left", member }          有人离开
 *   { type: "chat", from, text, ts }  广播消息
 *   { type: "dm", from, text, ts }    私聊消息
 *   { type: "error", message }        错误提示
 */
export class ChatRoom extends DurableObject {
  // TODO(鉴权): 启用握手准入后本类需配套实现：
  //   1. fetch() 开头区分内部请求：headers.get("x-internal") === "1" 且
  //      pathname === "/check-member" 时，查 SQLite 成员表返回 200/403，
  //      该请求不走 WS 升级逻辑（外部无法伪造，因为 x-internal 只在 Worker 内部调用出现）
  //   2. 成员表（SQLite）：CREATE TABLE IF NOT EXISTS members (uid TEXT PRIMARY KEY)
  //   3. 房间创建者/成员同步：由登录中心或 HTTP API（server/ 路由）调 stub 写入
  //   4. Member.name 改为取自 token 里的用户资料，不再接受客户端 join 消息自报

  constructor(state: DurableObjectState, env: Env) {
    super(state, env);
    // 应用层心跳：客户端发 "ping"，运行时直接回 "pong"，不会唤醒休眠的 DO，零成本
    this.ctx.setWebSocketAutoResponse(
      new WebSocketRequestResponsePair("ping", "pong")
    );
  }

  /** 处理 WebSocket 升级请求（由 worker/index.ts 转发进来） */
  fetch(request: Request): Response {
    if (request.headers.get("upgrade")?.toLowerCase() !== "websocket") {
      return new Response("expected websocket upgrade", { status: 426 });
    }

    const { 0: client, 1: server } = new WebSocketPair();
    const member: Member = { id: crypto.randomUUID(), name: "匿名" };
    // 把身份挂在连接上，DO 休眠/唤醒后可通过 deserializeAttachment 恢复
    server.serializeAttachment(member);
    this.ctx.acceptWebSocket(server);

    server.send(
      JSON.stringify({ type: "welcome", id: member.id, members: this.members() })
    );
    this.broadcast({ type: "joined", member }, server);

    return new Response(null, { status: 101, webSocket: client });
  }

  webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): void {
    let msg: { type?: string; name?: string; text?: string; to?: string };
    try {
      msg = JSON.parse(typeof message === "string" ? message : "");
    } catch {
      ws.send(JSON.stringify({ type: "error", message: "invalid JSON" }));
      return;
    }

    const self = this.memberOf(ws);

    switch (msg.type) {
      case "join": {
        self.name = String(msg.name ?? "").trim().slice(0, 32) || self.name;
        ws.serializeAttachment(self);
        this.broadcast({ type: "joined", member: self }, ws);
        this.broadcastPresence();
        break;
      }
      case "chat": {
        const text = String(msg.text ?? "").slice(0, 2000);
        if (text) {
          this.broadcast(
            { type: "chat", from: self, text, ts: Date.now() },
            ws
          );
        }
        break;
      }
      case "dm": {
        const text = String(msg.text ?? "").slice(0, 2000);
        const target = this.ctx
          .getWebSockets()
          .find((w) => this.memberOf(w).id === msg.to && w !== ws);
        if (!target || !text) {
          ws.send(
            JSON.stringify({ type: "error", message: "对方不在线或消息为空" })
          );
          return;
        }
        target.send(
          JSON.stringify({ type: "dm", from: self, text, ts: Date.now() })
        );
        break;
      }
    }
  }

  webSocketClose(ws: WebSocket): void {
    const member = this.memberOf(ws);
    this.broadcast({ type: "left", member }, ws);
    this.broadcastPresence();
  }

  webSocketError(): void {
    // 连接异常断开时 runtime 也会触发 close，这里无需额外处理
  }

  // ---------- 内部工具 ----------

  /** 读取某条连接上挂的成员身份 */
  private memberOf(ws: WebSocket): Member {
    return (ws.deserializeAttachment() as Member) ?? { id: "", name: "匿名" };
  }

  /** 当前房间内所有在线成员（过滤掉已关闭/正在关闭的连接） */
  private members(): Member[] {
    return this.ctx
      .getWebSockets()
      .filter((w) => w.readyState === WebSocket.OPEN)
      .map((w) => this.memberOf(w));
  }

  /** 广播给房间内除 except 外的所有连接 */
  private broadcast(payload: unknown, except?: WebSocket): void {
    const data = JSON.stringify(payload);
    for (const w of this.ctx.getWebSockets()) {
      if (w === except) continue;
      try {
        w.send(data);
      } catch {
        // 已关闭的连接忽略，runtime 会回收
      }
    }
  }

  private broadcastPresence(): void {
    this.broadcast({ type: "presence", members: this.members() });
  }
}
