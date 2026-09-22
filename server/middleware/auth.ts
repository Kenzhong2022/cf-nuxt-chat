import { verifyAccessToken } from "~~/server/utils/jwt";

// 白名单：/api/auth/* 下的全部公开接口免校验
// （login、register、token、authorize、refresh）
// /api/test 为公开测试接口
const PUBLIC_PREFIXES = ["/api/auth/", "/api/test"];

export default defineEventHandler(async (event) => {
  const url = getRequestURL(event);

  // 仅拦截 /api/* 路由
  if (!url.pathname.startsWith("/api/")) return;

  // 白名单放行
  if (PUBLIC_PREFIXES.some((p) => url.pathname.startsWith(p))) return;

  // 提取 Authorization: Bearer <access_token>
  const authorization = getHeader(event, "authorization");
  if (!authorization || !authorization.startsWith("Bearer ")) {
    setResponseStatus(event, 401);
    return { error: "missing_token" };
  }
  const token = authorization.slice("Bearer ".length).trim();

  // 校验 access_token
  let payload: { userId: number | string };
  try {
    payload = await verifyAccessToken(token);
  } catch (err) {
    console.log("[auth] access_token 校验失败:", err);
    setResponseStatus(event, 401);
    return { error: "invalid_or_expired_token" };
  }

  // 将 userId 挂到事件上下文，后续接口可通过 event.context.userId 读取
  event.context.userId = payload.userId;
});
