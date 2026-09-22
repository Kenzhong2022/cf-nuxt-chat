<template>
  <div class="page-card">
    <!-- 右侧表单区域 -->
    <div class="flex-1 flex items-center justify-center bg-white p-10">
      <div class="w-full max-w-[400px]">
        <div class="mb-8">
          <h2 class="text-[30px] font-bold text-slate-800 tracking-tight mb-2">
            创建账户
          </h2>
          <p class="text-[15px] text-slate-500">注册一个新的账户</p>
        </div>

        <el-form
          ref="formRef"
          :model="form"
          :rules="rules"
          class="flex flex-col"
          @submit.prevent="handleRegister"
        >
          <el-form-item
            required
            prop="nickname"
            label-width="auto"
            label-position="top"
          >
            <template #label>
              <span class="text-sm font-medium text-slate-800">昵称</span>
            </template>
            <el-input
              v-model="form.nickname"
              placeholder="给自己起个名字"
              size="large"
            />
          </el-form-item>

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

          <el-form-item prop="password" label-width="auto" label-position="top">
            <template #label>
              <span class="text-sm font-medium text-slate-800">密码</span>
            </template>
            <el-input
              v-model="form.password"
              type="password"
              placeholder="至少6位字符"
              size="large"
              show-password
            />
          </el-form-item>

          <el-form-item
            prop="confirmPassword"
            label-width="auto"
            label-position="top"
          >
            <template #label>
              <span class="text-sm font-medium text-slate-800">确认密码</span>
            </template>
            <el-input
              v-model="form.confirmPassword"
              type="password"
              placeholder="请再次输入密码"
              size="large"
              show-password
            />
          </el-form-item>

          <div class="mb-6">
            <el-checkbox v-model="agreeTerms">
              <span class="text-sm text-slate-500">
                我已阅读并同意
                <a href="#" class="text-indigo-500 no-underline">服务条款</a>
                和
                <a href="#" class="text-indigo-500 no-underline">隐私政策</a>
              </span>
            </el-checkbox>
          </div>

          <el-button
            type="primary"
            size="large"
            :loading="loading"
            class="w-full !h-12 !text-[15px] !font-semibold !tracking-widest"
            @click="handleRegister"
          >
            注 册
          </el-button>
        </el-form>

        <p class="text-center mt-7 text-sm text-slate-500">
          已有账户？
          <NuxtLink
            to="/login"
            class="text-indigo-500 font-medium hover:text-indigo-600 no-underline"
          >
            立即登录
          </NuxtLink>
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from "vue";
import type { FormInstance, FormRules } from "element-plus";
const formRef = ref<FormInstance>();
const loading = ref(false);
const agreeTerms = ref(false);

const form = reactive({
  nickname: "",
  email: "",
  password: "",
  confirmPassword: "",
});

const validateConfirmPassword = (_rule: any, value: string, callback: any) => {
  if (value !== form.password) {
    callback(new Error("两次输入的密码不一致"));
  } else {
    callback();
  }
};

const rules: FormRules = {
  nickname: [
    { required: true, message: "请输入昵称", trigger: "blur" },
    { min: 2, max: 20, message: "昵称长度为 2-20 个字符", trigger: "blur" },
  ],
  email: [
    { required: true, message: "请输入邮箱地址", trigger: "blur" },
    { type: "email", message: "请输入有效的邮箱地址", trigger: "blur" },
  ],
  password: [
    { required: true, message: "请输入密码", trigger: "blur" },
    { min: 6, message: "密码至少6个字符", trigger: "blur" },
  ],
  confirmPassword: [
    { required: true, message: "请再次输入密码", trigger: "blur" },
    { validator: validateConfirmPassword, trigger: "blur" },
  ],
};

const handleRegister = () => {
  // TODO: 注册逻辑
};
</script>

<style scoped>
:deep(.el-form-item__label::before) {
  display: none;
}
</style>
