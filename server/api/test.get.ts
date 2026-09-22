/**
 * 公开测试接口（已加入中间件白名单，无需登录）
 * url: /api/test?name=xxx
 * 用途：验证服务连通性，query 参数原样回显
 */
export default defineEventHandler((event) => {
  const query = getQuery(event);
  return {
    ok: true,
    service: "cf-nuxt-chat",
    time: new Date().toISOString(),
    query,
  };
});
