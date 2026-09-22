import { setupDatabase } from "~~/server/utils/database";
import { saveSession } from "~~/server/utils/session";
import bcrypt from "bcryptjs";
import { createError } from "h3";
import { signAccessToken, ACCESS_TOKEN_TTL_SECONDS } from "~~/server/utils/jwt";
import type { UserWithRoleRow, RoleCode } from "~~/types/database/user.type";
import type { LoginResp } from "~~/types/dto/auth.dto";
/**
 * 认证中心登录接口（纯认证，不签发业务 token）
 * url: /api/auth/login
 *
 * 职责边界（OAuth 授权码模式各接口分工）:
 *   - 本接口: 邮箱密码校验 + 种认证中心会话 cookie（authorize 据此识别已登录用户）
 *   - /api/auth/authorize: 已登录会话 → 发放授权码
 *   - /api/auth/token: 授权码 → 业务方 access_token / refresh_token
 *
 * 因此本接口不返回 access_token/refresh_token/code，
 * 登录页登录成功后统一回跳 authorize 走发码流程
 */
export default defineEventHandler(async (event): Promise<LoginResp> => {
  const body = await readBody(event);
  const { sql } = setupDatabase();
  const { email, password } = body;
  if (!email || !password) {
    throw createError({
      statusCode: 400,
      message: "邮箱或密码不能为空",
    });
  }

  // 查询用户（联查角色编码，role_id 为空或角色被删时降级为 guest）
  const res: UserWithRoleRow[] = (await sql`
    SELECT u.*, r.code AS role_code
    FROM users u
    LEFT JOIN roles r ON r.id = u.role_id
    WHERE u.email = ${email} AND u.deleted_at IS NULL
  `) as UserWithRoleRow[];

  const user = res[0];
  if (!user) {
    throw createError({
      statusCode: 400,
      message: "用户不存在",
    });
  }
  const isMatch = await bcrypt.compare(password, user.password_hash);
  if (!isMatch) {
    throw createError({
      statusCode: 400,
      message: "密码错误",
    });
  }

  const role: RoleCode = user.role_code ?? "guest";
  // 更新最后登录时间 last_login_at
  await sql`
    UPDATE users
    SET last_login_at = NOW()
    WHERE id = ${user.id}
  `;

  // 种认证中心自身会话 cookie（复用带 role 的 access token，authorize 据此发码）
  const sessionToken = await signAccessToken({
    userId: String(user.id),
    role,
  });
  // 会话写入 Redis（有状态化）：authorize 校验存在性，登出/封号可即时吊销
  await saveSession(sessionToken);
  setCookie(event, "auth_session", sessionToken, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: ACCESS_TOKEN_TTL_SECONDS,
  });

  return {
    code: 200,
    msg: "登录成功",
    data: {
      user: {
        ...user,
        role,
      },
    },
  };
});
