<template>
  <div class="container">
    <!-- 左侧品牌面板 -->
    <div class="brand-panel">
      <div class="brand-overlay" />
      <div class="brand-content">
        <div class="brand-logo">
          <div class="logo-icon">A</div>
          <h1>AuthCenter</h1>
        </div>
        <p>统一身份认证平台，连接你的数字世界</p>
        <div class="feature-list">
          <div class="feature-item">
            <div class="feature-dot" />
            <span>安全可靠的身份验证</span>
          </div>
          <div class="feature-item">
            <div class="feature-dot" />
            <span>多平台无缝接入</span>
          </div>
          <div class="feature-item">
            <div class="feature-dot" />
            <span>企业级数据加密保护</span>
          </div>
        </div>
      </div>
      <div class="deco-circle deco-1" />
      <div class="deco-circle deco-2" />
      <div class="deco-circle deco-3" />
    </div>

    <!-- 右侧内容区，统一使用前进动画 -->
    <div class="content-wrap">
      <slot />
    </div>
  </div>
</template>

<style lang="scss">
@use "sass:map";
/* 全局重置 & 基础样式 */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family:
    system-ui,
    -apple-system,
    "Segoe UI",
    Roboto,
    Helvetica,
    sans-serif;
  background: #fff;
}

.container {
  display: flex;
  min-height: 100vh;
}

/* ========== 左侧品牌面板样式 ========== */
.brand-panel {
  flex: 0 0 46%;
  position: relative;
  background: linear-gradient(160deg, #0f172a 0%, #1e1b4b 40%, #312e81 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.brand-overlay {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(
      ellipse at 20% 50%,
      rgba(99, 102, 241, 0.15) 0%,
      transparent 60%
    ),
    radial-gradient(
      ellipse at 80% 20%,
      rgba(139, 92, 246, 0.08) 0%,
      transparent 50%
    );
}

.brand-content {
  position: relative;
  z-index: 1;
  max-width: 420px;
  padding: 40px;
  color: #fff;
}

.brand-logo {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 32px;
}

.logo-icon {
  width: 48px;
  height: 48px;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8px 24px rgba(99, 102, 241, 0.4);
  font-size: 24px;
  font-weight: bold;
}

.brand-content > p {
  color: rgba(255, 255, 255, 0.7);
  font-size: 16px;
  line-height: 1.6;
  margin-bottom: 48px;
}

.feature-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.feature-item {
  display: flex;
  align-items: center;
  gap: 14px;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.6);
}

.feature-dot {
  width: 8px;
  height: 8px;
  background: #6366f1;
  border-radius: 50%;
  box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.3);
}

/* 装饰圆圈 */
.deco-circle {
  position: absolute;
  border-radius: 50%;
  border: 5px solid rgba(255, 255, 255, 0.06);
}

.deco-1 {
  width: 600px;
  height: 600px;
  top: -200px;
  right: -300px;
}

.deco-2 {
  width: 400px;
  height: 400px;
  right: -150px;
  bottom: -150px;
}

.deco-3 {
  width: 300px;
  height: 300px;
  top: 40%;
  left: -120px;
}

/* ========== 右侧内容容器 ========== */
.content-wrap {
  flex: 1;
  background: #fff;
  padding: 40px;
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 页面卡片通用样式 */
.page-card {
  width: 100%;
  max-width: 400px;
  background: #fff;
  border-radius: 24px;
  box-shadow: 0 20px 35px -12px rgba(0, 0, 0, 0.1);
  padding: 2rem;
}

.page-card h2 {
  font-size: 30px;
  color: #1e293b;
  margin-bottom: 8px;
  font-weight: 600;
}

.page-card p {
  color: #64748b;
  font-size: 15px;
  margin-bottom: 32px;
}

/* 表单样式 */
.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: #334155;
  margin-bottom: 8px;
}

.form-group input {
  width: 100%;
  padding: 12px 16px;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  font-size: 15px;
  transition: all 0.2s;
  outline: none;
  background: #f8fafc;
}

.form-group input:focus {
  border-color: #6366f1;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
  background: #fff;
}

.btn-primary {
  width: 100%;
  padding: 12px;
  background: #6366f1;
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
  margin-bottom: 16px;
}

.btn-primary:hover {
  background: #4f46e5;
}

.btn-link {
  background: none;
  border: none;
  color: #6366f1;
  font-size: 14px;
  cursor: pointer;
  padding: 8px 16px;
  font-weight: 500;
  transition: color 0.2s;
  width: 100%;
}

.btn-link:hover {
  color: #4f46e5;
  text-decoration: underline;
}

// 1. 定义动画参数 Map
$transition-configs: (
  enter: (
    startX: 0,
    endX: 0,
    startOpacity: 0,
    endOpacity: 1,
    timing: ease-in,
    duration: 0.75s,
    scaleFrom: 0.1,
    scaleTo: 1,
  ),
  leave: (
    startX: 0,
    endX: -100%,
    startOpacity: 1,
    endOpacity: 0.8,
    timing: ease-out,
    duration: 0.75s,
    scaleFrom: 1,
    scaleTo: 0.5,
  ),
);

// 2. 定义混合器
@mixin slideTransition($key) {
  $config: map.get($transition-configs, $key);
  @if not $config {
    @error "未知键名 '#{$key}'";
  }

  $startX: map.get($config, startX);
  $endX: map.get($config, endX);
  $startOpacity: map.get($config, startOpacity);
  $endOpacity: map.get($config, endOpacity);
  $timing: map.get($config, timing);
  $duration: map.get($config, duration);
  $scaleFrom: map.get($config, scaleFrom);
  $scaleTo: map.get($config, scaleTo);

  $name: unique-id(); // 或 fallback 方案
  @at-root {
    @keyframes #{$name} {
      0% {
        transform: translateX($startX) scale($scaleFrom);
        opacity: $startOpacity;
      }
      100% {
        transform: translateX($endX) scale($scaleTo);
        opacity: $endOpacity;
      }
    }
  }

  animation: #{$name} $duration $timing forwards;
}

// 3. 定义 Vue 过渡类
.slide-forward-enter-active {
  @include slideTransition(enter);
}
.slide-forward-leave-active {
  @include slideTransition(leave);
}

/* 移动端适配: 隐藏左侧品牌区 */
@media (max-width: 768px) {
  .brand-panel {
    display: none;
  }
}
</style>
