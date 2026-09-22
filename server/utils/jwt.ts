import { SignJWT, jwtVerify } from "jose";
import { v4 as uuidv4 } from "uuid";
import type { RoleCode } from "~~/types/database/user.type";

// ============================================
// 有效期配置（jose 格式字符串，秒数常量给接口响应）
// ============================================

/** access_token 有效期（jose 格式） */
const ACCESS_TOKEN_TTL = "2h";
/** refresh_token 有效期（jose 格式） */
const REFRESH_TOKEN_TTL = "7d";

/** access_token 有效期秒数（token/refresh 接口 expires_in 字段使用） */
export const ACCESS_TOKEN_TTL_SECONDS = 2 * 60 * 60;
/** refresh_token 有效期秒数 */
export const REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60;

// ============================================
// payload 类型
// ============================================

/** 签发 token 时传入的业务 payload（jti/iat/exp 由 signXxx 内部注入） */
export interface SignTokenPayload {
  /** 用户 ID（bigint 经 Neon 驱动转为字符串） */
  userId: string;
  /** 角色编码（roles.code），业务方据此做服务端鉴权 */
  role: RoleCode;
}

/**
 * 校验通过后返回的完整 payload
 * - jti: token 唯一标识（签发时注入，可用于黑名单撤销）
 * - iat/exp: 签发/过期时间（秒级时间戳，jose 自动注入）
 * - role: 可选——兼容本次改造前签发的存量旧 token（无 role 声明）
 */
export interface VerifiedTokenPayload {
  userId: string;
  role?: RoleCode;
  jti: string;
  iat: number;
  exp: number;
}

/** 将字符串密钥编码为 jose HS256 签名所需的 Uint8Array */
function toSecretKey(secret: string): Uint8Array {
  return new TextEncoder().encode(secret);
}

// ============================================
// 签发
// ============================================

/**
 * 签发短期 access_token（默认 2h）
 * @param payload 业务声明（userId + role）
 */
export async function signAccessToken(
  payload: SignTokenPayload,
): Promise<string> {
  const config = useRuntimeConfig();
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setJti(uuidv4())
    .setExpirationTime(ACCESS_TOKEN_TTL)
    .sign(toSecretKey(config.jwt.accessSecret));
}

/**
 * 签发长期 refresh_token（默认 7d，仅用于刷新 access_token）
 * @param payload 业务声明（userId + role，刷新时原样继承）
 */
export async function signRefreshToken(
  payload: SignTokenPayload,
): Promise<string> {
  const config = useRuntimeConfig();
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setJti(uuidv4())
    .setExpirationTime(REFRESH_TOKEN_TTL)
    .sign(toSecretKey(config.jwt.refreshSecret));
}

// ============================================
// 校验
// ============================================

/**
 * 校验 access_token 签名与有效期，返回完整 payload
 * @throws JWTExpired（jose）已过期 / JWTInvalid 签名无效或格式错误
 */
export async function verifyAccessToken(
  token: string,
): Promise<VerifiedTokenPayload> {
  const config = useRuntimeConfig();
  const { payload } = await jwtVerify(
    token,
    toSecretKey(config.jwt.accessSecret),
  );
  return payload as unknown as VerifiedTokenPayload;
}

/**
 * 校验 refresh_token 签名与有效期，返回完整 payload
 * @throws JWTExpired（jose）已过期 / JWTInvalid 签名无效或格式错误
 */
export async function verifyRefreshToken(
  token: string,
): Promise<VerifiedTokenPayload> {
  const config = useRuntimeConfig();
  const { payload } = await jwtVerify(
    token,
    toSecretKey(config.jwt.refreshSecret),
  );
  return payload as unknown as VerifiedTokenPayload;
}
