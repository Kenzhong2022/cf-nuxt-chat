// 授权码工具：生成、存储、兑换、撤销
// server/utils/oauthCode.ts
import { v4 as uuidv4 } from "uuid";
import { redis } from "./redis";
import type { RoleCode } from "~~/types/database/user.type";

/**
 * 授权码实体
 * @param userId 用户ID
 * @param clientId 客户端ID
 * @param issuer 发布者
 * @param redirectUri 回调地址
 * @param role 用户角色编码（兑换 token 时透传进 JWT payload）
 * @param scope 授权范围
 * @param createdAt 创建时间
 */
interface OAuthCode {
  userId: string;
  role: RoleCode;
  clientId: string;
  issuer?: string;
  redirectUri: string;
  scope?: string;
  createdAt: Date;
}

const AUTH_CODE_KEY_PREFIX = "oauth:code:";
const AUTH_CODE_EXPIRE_SECONDS = 3000; // 5分钟过期

/**
 * @returns 生成的授权码（UUIDv4）
 * @description 用于客户端请求授权时，生成唯一标识，后续兑换时校验客户端与回调地址
 */
export function generateAuthCode(): string {
  return uuidv4();
}

/**
 * @param code 授权码
 * @param data 授权码实体
 * @description 存储授权码到 Redis
 * @throws 存储失败时抛出异常
 */
export async function saveAuthCode(
  code: string,
  data: OAuthCode,
): Promise<void> {
  const key = `${AUTH_CODE_KEY_PREFIX}${code}`;
  await redis.set(key, JSON.stringify(data), {
    ex: AUTH_CODE_EXPIRE_SECONDS,
  });
}

/**
 * @description 兑换授权码（校验客户端与回调地址，校验通过后一次性消费）
 * @param code 授权码
 * @param clientId 客户端ID
 * @param redirectUri 回调地址
 * @returns 授权码实体或null（不存在时）
 */
export async function redeemAuthCode(
  code: string,
  clientId: string,
  redirectUri: string,
): Promise<OAuthCode | null> {
  const key = `${AUTH_CODE_KEY_PREFIX}${code}`;
  const raw = await redis.get(key);
  if (!raw) return null; // 授权码不存在
  const data = raw as OAuthCode;
  // 校验客户端和回调地址
  if (data.clientId !== clientId || data.redirectUri !== redirectUri) {
    throw new Error("client_id or redirect_uri not match");
  }
  await redis.del(key);
  return data;
}

/**
 * @param code 授权码
 * @description 手动撤销授权码
 * @throws 撤销失败时抛出异常
 */
export async function revokeAuthCode(code: string): Promise<void> {
  await redis.del(`${AUTH_CODE_KEY_PREFIX}${code}`);
}
