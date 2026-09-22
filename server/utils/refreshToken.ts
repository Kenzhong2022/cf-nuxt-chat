// 刷新令牌工具：基于 Redis 存储与撤销
// server/utils/refreshToken.ts
import { redis } from "./redis";

/**
 * 刷新令牌记录
 * @param userId 用户ID
 * @param clientId 客户端ID
 * @param createdAt 创建时间
 */
export interface RefreshTokenRecord {
  userId: number | string;
  clientId: string;
  createdAt: number;
}

const REFRESH_TOKEN_KEY_PREFIX = "oauth:refresh_token:";
const REFRESH_TOKEN_EXPIRE_SECONDS = 7 * 24 * 60 * 60; // 7天过期，与 refresh_token JWT 有效期一致

/** 存储刷新令牌到 Redis */
export async function saveRefreshToken(
  refreshToken: string,
  record: RefreshTokenRecord,
): Promise<void> {
  const key = `${REFRESH_TOKEN_KEY_PREFIX}${refreshToken}`;
  await redis.set(key, JSON.stringify(record), {
    ex: REFRESH_TOKEN_EXPIRE_SECONDS,
  });
}

/** 查询刷新令牌记录
 * @param refreshToken 刷新令牌
 * @returns 令牌记录或null（不存在/已过期）
 */
export async function getRefreshToken(
  refreshToken: string,
): Promise<RefreshTokenRecord | null> {
  const key = `${REFRESH_TOKEN_KEY_PREFIX}${refreshToken}`;
  const raw = await redis.get(key);
  if (!raw) return null;
  return raw as RefreshTokenRecord;
}

/** 撤销刷新令牌（登出/刷新时调用） */
export async function revokeRefreshToken(refreshToken: string): Promise<void> {
  await redis.del(`${REFRESH_TOKEN_KEY_PREFIX}${refreshToken}`);
}
