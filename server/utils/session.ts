// 认证中心会话工具：登录态写入 Redis，支持服务端吊销
// server/utils/session.ts
import { redis } from "./redis";
import {
  verifyAccessToken,
  ACCESS_TOKEN_TTL_SECONDS,
  type VerifiedTokenPayload,
} from "./jwt";

const SESSION_KEY_PREFIX = "auth:session:";

/**
 * 登录成功后将会话写入 Redis（有状态化：使 auth_session 可被服务端吊销）
 * @param token 登录时签发的 auth_session JWT（借其 jti 作为会话键）
 * @returns 解析出的 payload（免得调用方再验一次）
 * @description TTL 与 cookie maxAge 保持一致，Redis 过期即会话失效，
 *              与 JWT 自身 exp 双保险
 */
export async function saveSession(
  token: string,
): Promise<VerifiedTokenPayload> {
  const payload = await verifyAccessToken(token);
  await redis.set(
    `${SESSION_KEY_PREFIX}${payload.jti}`,
    JSON.stringify({ userId: payload.userId, role: payload.role }),
    { ex: ACCESS_TOKEN_TTL_SECONDS },
  );
  return payload;
}

/**
 * 校验会话是否有效（Redis 中仍存在）
 * @param jti JWT 中的会话唯一标识
 * @description 登出/吊销/Redis 过期后返回 false，
 *              供 authorize 在验签之后做二次确认
 */
export async function isSessionActive(jti: string): Promise<boolean> {
  return (await redis.exists(`${SESSION_KEY_PREFIX}${jti}`)) === 1;
}

/**
 * 吊销会话（登出、封号、改密时调用）
 */
export async function revokeSession(jti: string): Promise<void> {
  await redis.del(`${SESSION_KEY_PREFIX}${jti}`);
}
