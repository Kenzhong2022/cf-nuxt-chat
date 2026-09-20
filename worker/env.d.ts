/// <reference path="../worker-configuration.d.ts" />

// Nitro 运行时注入的全局 env（与内置 cloudflare-module 入口行为一致）
declare var __env__: Env;

// Nitro 构建期由 rollup 注入的虚拟模块，仅供编辑器类型检查使用
declare module "#nitro-internal-pollyfills" {}

declare module "#nitro-internal-virtual/public-assets" {
  /** 判断路径是否命中 public 静态资源 */
  export function isPublicAssetURL(path: string): Promise<boolean> | boolean;
}
