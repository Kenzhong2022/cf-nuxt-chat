import { setupDatabase } from "~~/server/utils/database";
import {
  signAccessToken,
  signRefreshToken,
  ACCESS_TOKEN_TTL_SECONDS,
} from "~~/server/utils/jwt";
import { redeemAuthCode } from "~~/server/utils/oauthCode";
import { saveRefreshToken } from "~~/server/utils/refreshToken";
import type { SignTokenPayload } from "~~/server/utils/jwt";

/**
 * token 接口请求参数
 * @param client_id 客户端ID
 * @param code 授权码
 * @param redirect_uri 回调地址
 */
interface TokenRequest {
  client_id: string;
  code: string;
  redirect_uri: string;
}

/**
 * token 接口成功响应
 * @param access_token 短期访问令牌
 * @param refresh_token 长期刷新令牌
 * @param token_type 令牌类型
 * @param expires_in 过期时间（秒）
 * @param id_token 包含用户信息的ID令牌（明文对象；本项目未做 OIDC 签名，
 *                 角色等权威声明以 access_token 验签结果为准）
 */
interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: "Bearer";
  expires_in: number;
  id_token: SignTokenPayload;
}

/**
 * token 接口错误响应
 * @param error 错误码
 */
interface TokenErrorResponse {
  error: "invalid_code";
}

export default defineEventHandler(
  async (event): Promise<TokenResponse | TokenErrorResponse> => {
    const body = await readBody<TokenRequest>(event);
    const { client_id, code, redirect_uri } = body;
    console.log(body, "body");
    const codeInfo = await redeemAuthCode(code, client_id, redirect_uri);
    console.log(codeInfo, "codeInfo");
    if (!codeInfo) {
      console.log("[token] code 无效或已过期:", code);
      setResponseStatus(event, 400);
      return { error: "invalid_code" };
    }
    // 授权码信息中携带 role（登录时写入）；缺失时回查数据库兜底
    const { sql } = setupDatabase();
    let role = codeInfo.role;
    if (!role) {
      const rows = (await sql`
        SELECT r.code AS role_code
        FROM users u LEFT JOIN roles r ON r.id = u.role_id
        WHERE u.id = ${codeInfo.userId}
      `) as unknown as { role_code: string | null }[];
      role = (rows[0]?.role_code ?? "guest") as SignTokenPayload["role"];
    }

    // 生成JWT长短token（payload 携带角色编码）
    const payload: SignTokenPayload = { userId: codeInfo.userId, role };
    const access_token = await signAccessToken(payload);
    const refresh_token = await signRefreshToken(payload);
    const expires_in = ACCESS_TOKEN_TTL_SECONDS;

    await saveRefreshToken(refresh_token, {
      userId: codeInfo.userId,
      clientId: client_id,
      createdAt: Date.now(),
    });
    console.log("[token] refresh_token 已存入 Redis");

    const response: TokenResponse = {
      access_token,
      refresh_token,
      token_type: "Bearer",
      expires_in,
      id_token: payload,
    };
    console.log("[token] 返回响应:", {
      ...response,
      access_token: access_token.slice(0, 20) + "...",
      refresh_token: refresh_token.slice(0, 20) + "...",
    });
    return response;
  },
);
