<template>
  <div class="page-card">
    <div class="mb-8">
      <h2 class="text-[30px] font-bold text-slate-800 tracking-tight mb-2">
        登录
      </h2>
      <p class="text-[15px] text-slate-500">输入您的账户信息</p>
    </div>

    <el-form
      ref="formRef"
      :model="form"
      :rules="rules"
      @submit.prevent="handleLogin"
    >
      <div>
        <el-form-item
          required
          prop="email"
          label-width="auto"
          label-position="top"
        >
          <template #label>
            <span class="text-sm font-medium text-slate-800">邮箱地址</span>
          </template>
          <el-input
            v-model="form.email"
            placeholder="name@example.com"
            size="large"
          />
        </el-form-item>
      </div>
      <div>
        <el-form-item prop="password" label-width="auto" label-position="top">
          <template #label>
            <span class="text-sm font-medium text-slate-800">密码</span>
          </template>
          <el-input
            v-model="form.password"
            type="password"
            placeholder="••••••••"
            size="large"
            show-password
          />
        </el-form-item>
      </div>

      <div class="flex justify-between items-center mt-1 mb-6">
        <el-checkbox v-model="rememberMe">
          <span class="text-sm text-slate-500">记住此设备</span>
        </el-checkbox>
        <a
          href="#"
          class="text-sm text-indigo-500 font-medium hover:text-indigo-600 no-underline"
          >忘记密码？</a
        >
      </div>

      <el-button
        type="primary"
        size="large"
        :loading="loading"
        class="w-full !h-12 !text-[15px] !font-semibold !tracking-widest"
        @click="handleLogin"
      >
        登 录
      </el-button>
    </el-form>

    <div class="text-center mt-7 text-sm text-slate-500">
      还没有账户？
      <NuxtLink
        to="/register"
        class="text-indigo-500 font-medium hover:text-indigo-600 no-underline"
      >
        创建账户
      </NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { FormInstance, FormRules } from "element-plus";

const formRef = ref<FormInstance>();
const loading = ref(false);
const rememberMe = ref(false);

const form = reactive({
  // 开发期默认填充管理员测试账号
  // email: "admin@test.com",
  // password: "123456",
  email: "",
  password: "",
});

const rules: FormRules = {
  email: [
    { required: true, message: "请输入邮箱地址", trigger: "blur" },
    { type: "email", message: "请输入有效的邮箱地址", trigger: "blur" },
  ],
  password: [
    { required: true, message: "请输入密码", trigger: "blur" },
    { min: 6, message: "密码至少6个字符", trigger: "blur" },
  ],
};

const handleLogin = async () => {
  if (!formRef.value) return;
  await formRef.value.validate(async (valid) => {
    if (valid) {
      loading.value = true;

      const route = useRoute();

      try {
        // 纯认证：成功后种 auth_session cookie
        await $fetch("/api/auth/login", {
          method: "POST",
          body: form,
        });

        // 统一回跳 authorize 发码（query 带 OAuth 参数说明来自 authorize，
        // 否则用默认客户端兜底；redirect 为业务方登录后的回跳路径）
        const clientId = route.query.client_id as string;
        const redirectUri = route.query.redirect_uri as string;

        const authorizeUrl = new URL(
          "/api/auth/authorize",
          window.location.origin,
        );
        authorizeUrl.searchParams.set("client_id", clientId);
        authorizeUrl.searchParams.set("redirect_uri", redirectUri);
        authorizeUrl.searchParams.set("response_type", "code");
        const redirect = route.query.redirect as string | undefined;
        if (redirect) authorizeUrl.searchParams.set("redirect", redirect);

        window.location.href = authorizeUrl.toString();
      } catch (error: any) {
        console.error("登录失败:", error);
        ElMessage.error(error?.response?._data?.msg || "登录失败，请重试");
      } finally {
        loading.value = false;
      }
    }
  });
};
</script>

<style scoped lang="scss">
/* 隐藏 el-form-item 必填星号 */
:deep(.el-form-item__label::before) {
  display: none;
}
</style>
