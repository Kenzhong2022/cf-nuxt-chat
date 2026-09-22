// server/utils/database.ts
import { neon } from "@neondatabase/serverless";

/**
 * 初始化数据库连接
 * @returns 包含数据库连接对象的对象
 */
export const setupDatabase = () => {
  const config = useRuntimeConfig();
  // 从运行时配置中获取连接字符串
  const sql = neon(config.databaseUrl);
  return { sql };
};
