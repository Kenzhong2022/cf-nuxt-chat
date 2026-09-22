export default defineNitroPlugin(async () => {
  // 如果 redis 未初始化（环境变量缺失），跳过
  if (!redis) {
    console.warn("[Redis Plugin] Redis 客户端未初始化，跳过连接测试");
    return;
  }

  try {
    // 发送 PING 命令测试连接
    const pong = await redis.ping();

    if (pong === "PONG") {
      console.log("✅ [Redis] 连接成功！Upstash Redis 已就绪");
    } else {
      console.error("❌ [Redis] 连接异常，响应:", pong);
    }
  } catch (error) {
    console.error("❌ [Redis] 连接失败:", error);
  }
});
