// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },
  routeRules: {
    "/": { redirect: "/login" },
  },

  runtimeConfig: {
    databaseUrl: process.env.NUXT_DATABASE_URL,
    jwt: {
      accessSecret: process.env.NUXT_JWT_ACCESS_SECRET,
      refreshSecret: process.env.NUXT_JWT_REFRESH_SECRET,
    },
  },

  nitro: {
    preset: "cloudflare_module",

    // 自定义 Worker 入口：负责把 /room/:id 的 WebSocket 升级请求路由到
    // 对应的 ChatRoom Durable Object，其余请求仍交给 Nitro 处理
    entry: "{{ rootDir }}/worker/index.ts",

    cloudflare: {
      deployConfig: true,
      nodeCompat: true,
    },
  },

  modules: ["@element-plus/nuxt", "@nuxtjs/tailwindcss"],
  elementPlus: {
    // 自动导入所有组件
    importStyle: "scss",
  },
});
