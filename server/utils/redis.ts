import { Redis } from "@upstash/redis";

// 从环境变量读取配置
const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;

if (!url || !token) {
  console.warn("[Redis] 环境变量未配置，Redis 功能将不可用");
}

// 导出单例客户端
export const redis = new Redis({ url, token });
