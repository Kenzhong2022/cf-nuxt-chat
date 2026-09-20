/// <reference path="../worker-configuration.d.ts" />
/// <reference path="./env.d.ts" />
import "#nitro-internal-pollyfills";
import { useNitroApp } from "nitropack/runtime";
import { isPublicAssetURL } from "#nitro-internal-virtual/public-assets";
import { ChatRoom } from "./chat-room";

const nitroApp = useNitroApp();

/** 从 /room/<roomId> 路径中提取 roomId，不匹配则返回 null */
function roomIdFromPath(pathname: string): string | null {
  const match = pathname.match(/^\/room\/([^/]+)\/?$/);
  return match ? decodeURIComponent(match[1]) : null;
}

// TODO(鉴权): 握手准入校验 —— 等登录中心接口定稿后启用
// 设计：前端连接改为 /room/<roomId>?t=<token>，握手阶段验证身份 + 房间准入，
//      不通过直接拒绝升级（拿不到 101），C 标签页猜到 roomId 也进不来。
//
// /** 调登录中心验证 token，返回用户信息（含 uid）；失败返回 null */
// async function verifyToken(token: string, env: Env): Promise<{ uid: string } | null> {
//   if (!token) return null;
//   const res = await fetch(`${env.AUTH_BASE}/internal/verify-token`, {
//     method: "POST",
//     headers: { "content-type": "application/json" },
//     body: JSON.stringify({ token })
//     // 登录中心内部查 Redis，Worker 不直接碰 Redis
//   });
//   if (!res.ok) return null;
//   return (await res.json()) as { uid: string };
// }
//
// /** 校验用户是否可访问该房间（成员表建议存在 ChatRoom DO 的 SQLite 里，由 DO 自查） */
// async function canAccessRoom(
//   uid: string,
//   roomId: string,
//   env: Env
// ): Promise<boolean> {
//   const stub = env.CHAT_ROOM.get(env.CHAT_ROOM.idFromName(roomId));
//   const res = await stub.fetch(
//     new Request(`https://internal/check-member?uid=${encodeURIComponent(uid)}`, {
//       headers: { "x-internal": "1" } // DO 需校验此头，拒绝外部直接调用
//     })
//   );
//   return res.ok;
// }

/** 把普通 HTTP 请求交给 Nitro（Nuxt SSR / server 路由）处理，逻辑与 cloudflare_module 内置入口一致 */
async function fetchHandler(
  request: Request,
  env: Env,
  ctx: ExecutionContext
): Promise<Response> {
  let body: ArrayBuffer | undefined;
  if (request.method !== "GET" && request.method !== "HEAD") {
    body = await request.arrayBuffer();
  }
  globalThis.__env__ = env;
  const url = new URL(request.url);
  return nitroApp.localFetch(url.pathname + url.search, {
    context: {
      waitUntil: (promise: Promise<unknown>) => ctx.waitUntil(promise),
      _platform: {
        cf: (request as any).cf,
        cloudflare: { request, env, context: ctx, url }
      }
    },
    host: url.hostname,
    protocol: url.protocol,
    method: request.method,
    headers: request.headers,
    body: body ? Buffer.from(body) : undefined
  } as any);
}

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    // WebSocket 升级请求 -> 按 roomId 路由到对应的 Durable Object（每个房间一个实例，天然隔离）
    if (request.headers.get("upgrade")?.toLowerCase() === "websocket") {
      const url = new URL(request.url);
      const roomId = roomIdFromPath(url.pathname);
      if (!roomId) {
        return new Response("unknown room", { status: 404 });
      }

      // TODO(鉴权): 握手准入校验 —— 等登录中心接口定稿后取消注释启用
      // const user = await verifyToken(url.searchParams.get("t") ?? "", env);
      // if (!user) {
      //   return new Response("unauthorized", { status: 401 });
      // }
      // if (!(await canAccessRoom(user.uid, roomId, env))) {
      //   return new Response("forbidden", { status: 403 });
      // }
      // // 校验通过后把身份传给 DO，供 webSocketMessage 里标记消息发送者
      // const authed = new Request(request, { headers: new Headers(request.headers).set("x-uid", user.uid) });
      // return env.CHAT_ROOM.get(env.CHAT_ROOM.idFromName(roomId)).fetch(authed);

      const id = env.CHAT_ROOM.idFromName(roomId);
      return env.CHAT_ROOM.get(id).fetch(request);
    }

    // 静态资源
    if (env.ASSETS && isPublicAssetURL(new URL(request.url).pathname)) {
      return env.ASSETS.fetch(request);
    }

    // 其余 HTTP 请求交给 Nitro
    return fetchHandler(request, env, ctx);
  }
};

// Durable Object 类必须从 Worker 入口具名导出，wrangler 才能绑定 ChatRoom
export { ChatRoom };
