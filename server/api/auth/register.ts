import { setupDatabase } from "~~/server/utils/database";
import bcrypt from "bcryptjs";

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { sql } = setupDatabase();
  const { email, password, nickname } = body;

  // 参数校验
  if (!email || !password) {
    throw createError({
      statusCode: 400,
      message: "邮箱和密码不能为空"
    });
  }

  // 邮箱格式校验
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw createError({
      statusCode: 400,
      message: "邮箱格式不正确"
    });
  }

  // 密码长度校验
  if (password.length < 6) {
    throw createError({
      statusCode: 400,
      message: "密码至少6个字符"
    });
  }

  // 检查邮箱是否已注册
  const existingUser = await sql`SELECT id FROM users WHERE email = ${email}`;
  if (existingUser.length > 0) {
    throw createError({
      statusCode: 409,
      message: "该邮箱已被注册"
    });
  }

  // 密码加密
  const saltRounds = 10;
  const passwordHash = await bcrypt.hash(password, saltRounds);

  // 默认头像（基于昵称生成）
  const defaultAvatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(nickname || email)}`;

  // 插入用户
  await sql`
    INSERT INTO users (uuid, email, phone, password_hash, nickname, avatar, status, last_login_at)
    VALUES (
      gen_random_uuid(),
      ${email},
      NULL,
      ${passwordHash},
      ${nickname || email.split("@")[0]},
      ${defaultAvatar},
      1,
      NOW()
    )
  `;

  return {
    success: true,
    message: "注册成功"
  };
});