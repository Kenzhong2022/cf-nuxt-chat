import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  ACCESS_TOKEN_TTL_SECONDS,
} from "~~/server/utils/jwt";
import type { SignTokenPayload } from "~~/server/utils/jwt";
import {
  saveRefreshToken,
  getRefreshToken,
  revokeRefreshToken,
} from "~~/server/utils/refreshToken";

/**
 * refresh 接口请求参数
 * @param refresh_token 长期刷新令牌
 * @param client_id 客户端ID（用于校验令牌归属）
 */
interface RefreshRequest {
  refresh_token: string;
  client_id: string;
}

/**
 * refresh 接口成功响应（与 token 接口一致）
 * @param access_token 新的短期访问令牌
 * @param refresh_token 新的长期刷新令牌（轮换后旧令牌失效）
 * @param token_type 令牌类型
 * @param expires_in 过期时间（秒）
 * @param id_token 包含用户信息的ID令牌（明文对象；与 token 接口一致）
 */
interface RefreshResponse {
  access_token: string;
  refresh_token: string;
  token_type: "Bearer";
  expires_in: number;
  id_token: SignTokenPayload;
}

/**
 * refresh 接口错误响应
 * @param error 错误码
 */
interface RefreshErrorResponse {
  error: "invalid_refresh_token" | "client_mismatch";
}

export default defineEventHandler(
  async (event): Promise<RefreshResponse | RefreshErrorResponse> => {
    const body = await readBody<RefreshRequest>(event);
    const { refresh_token, client_id } = body;

    // 1. JWT 签名校验（过期/伪造在此抛出）
    let payload;
    try {
      payload = await verifyRefreshToken(refresh_token);
    } catch (err) {
      console.log("[refresh] refresh_token JWT 校验失败:", err);
      setResponseStatus(event, 401);
      return { error: "invalid_refresh_token" };
    }

    // 2. Redis 记录校验（防止已撤销/已轮换的旧令牌继续使用）
    const record = await getRefreshToken(refresh_token);
    if (!record) {
      console.log("[refresh] refresh_token 不在 Redis 中（已撤销或已轮换）");
      setResponseStatus(event, 401);
      return { error: "invalid_refresh_token" };
    }

    // 3. 客户端归属校验（防止 refresh_token 被其他客户端盗用）
    if (record.clientId !== client_id) {
      console.log(
        "[refresh] client_id 不匹配，期望:",
        record.clientId,
        "实际:",
        client_id,
      );
      setResponseStatus(event, 401);
      return { error: "client_mismatch" };
    }

    // 4. 轮换：立即撤销旧 refresh_token
    await revokeRefreshToken(refresh_token);

    // 5. 生成新 token（继承原 payload 的角色；旧版无 role 的存量 token 降级为 guest）
    const newPayload: SignTokenPayload = {
      userId: payload.userId,
      role: payload.role ?? "guest",
    };
    const access_token = await signAccessToken(newPayload);
    const new_refresh_token = await signRefreshToken(newPayload);

    // 6. 新 refresh_token 入库
    await saveRefreshToken(new_refresh_token, {
      userId: payload.userId,
      clientId: client_id,
      createdAt: Date.now(),
    });
    console.log("[refresh] 旧 refresh_token 已撤销，新 refresh_token 已签发");

    return {
      access_token,
      refresh_token: new_refresh_token,
      token_type: "Bearer",
      expires_in: ACCESS_TOKEN_TTL_SECONDS,
      id_token: newPayload,
    };
  },
);
