import { setupDatabase } from "~~/server/utils/database";
import { verifyAccessToken } from "~~/server/utils/jwt";
import { generateAuthCode, saveAuthCode } from "~~/server/utils/oauthCode";
import { isSessionActive } from "~~/server/utils/session";

/** 认证中心自身会话 cookie 名（登录接口种下，见 server/api/auth/login.ts） */
const SESSION_COOKIE = "auth_session";

/**
 * oauth_clients 表行结构
 * @param client_id 客户端ID（主键）
 * @param redirect_uris 回调地址白名单（text[] 数组，线上可直接改表实时生效）
 */
interface OAuthClientRow {
  client_id: string;
  redirect_uris: string[];
}

/**
 * 查询 OAuth 客户端及其回调白名单
 * @param clientId 客户端ID
 * @returns 客户端行；不存在或已被停用（enabled = false）时返回 null
 */
async function getOAuthClient(
  clientId: string,
): Promise<OAuthClientRow | null> {
  const { sql } = setupDatabase();
  const rows = (await sql`
    SELECT client_id, redirect_uris
    FROM oauth_clients
    WHERE client_id = ${clientId} AND enabled = true
  `) as unknown as OAuthClientRow[];
  return rows[0] ?? null;
}

/**
 * 校验回调地址是否在白名单内
 * 规则：白名单条目整串精确匹配优先；未命中时放行同一主域名的子域名
 * （适配 Cloudflare Pages / Netlify 预览部署生成的 hash 子域名），
 * 但协议和路径必须与白名单条目完全一致，防止开放重定向
 * @param whitelist 白名单地址数组（来自 oauth_clients.redirect_uris）
 * @param redirectUri 业务方传入的回调地址
 * @returns 是否允许回调
 */
function isAllowedRedirectUri(
  whitelist: string[],
  redirectUri: string,
): boolean {
  let target: URL;
  try {
    target = new URL(redirectUri);
  } catch {
    return false;
  }
  return whitelist.some((allowed) => {
    let base: URL;
    try {
      base = new URL(allowed);
    } catch {
      return false;
    }
    // host 含端口，endsWith 带 "." 边界保证只放行真正的子域名
    // （如 061113ef.my-nuxt-app-cw9.pages.dev），拼接域名不会误放行
    const hostMatch =
      target.protocol === base.protocol &&
      (target.host === base.host || target.host.endsWith(`.${base.host}`));
    return hostMatch && target.pathname === base.pathname;
  });
}

/**
 * 未登录时跳转登录页，原样携带 OAuth 参数，
 * 登录成功后登录页会带着参数回跳本接口继续发放授权码
 */
function redirectToLogin(
  event: Parameters<Parameters<typeof defineEventHandler>[0]>[0],
  params: { client_id: string; redirect_uri: string; redirect?: string },
) {
  const url = new URL("/login", getRequestURL(event).origin);
  url.searchParams.set("client_id", params.client_id);
  url.searchParams.set("redirect_uri", params.redirect_uri);
  url.searchParams.set("response_type", "code");
  if (params.redirect) url.searchParams.set("redirect", params.redirect);
  return sendRedirect(event, url.toString());
}

/**
 * OAuth 2.0 授权码发放入口
 * url: /api/auth/authorize?client_id=&redirect_uri=&response_type=code&redirect=
 *
 * 流程:
 *   1. 校验客户端与回调地址
 *   2. 读取认证中心会话 cookie：无效/缺失 → 跳登录页（保留 OAuth 参数）
 *   3. 会话有效 → 用会话中真实的 userId/role 生成随机授权码存 Redis，
 *      302 回业务方回调（redirect 参数透传，业务方 CallBack 登录后回跳用）
 */
export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const { client_id, response_type, redirect_uri, redirect } = query;

  if (response_type !== "code") return { error: "仅支持 code 模式" };
  const client = await getOAuthClient(client_id as string);
  if (!client) return { error: "非法客户端" };
  if (!isAllowedRedirectUri(client.redirect_uris, redirect_uri as string))
    return { error: `非法回调地址：${redirect_uri} 未在数据库白名单中匹配` };

  // 读取会话：过期/伪造/缺失/已被吊销统一视为未登录
  const session = getCookie(event, SESSION_COOKIE);
  let payload: Awaited<ReturnType<typeof verifyAccessToken>> | null = null;
  if (session) {
    try {
      const verified = await verifyAccessToken(session);
      // 验签通过后还需 Redis 会话存在（登出即删键，即时失效）
      payload = (await isSessionActive(verified.jti)) ? verified : null;
    } catch {
      payload = null;
    }
  }
  if (!payload) {
    return redirectToLogin(event, {
      client_id: client_id as string,
      redirect_uri: redirect_uri as string,
      redirect: redirect as string | undefined,
    });
  }

  // 用会话中的真实用户信息发放授权码（随机码，redis 内统一过期策略）
  const code = generateAuthCode();
  await saveAuthCode(code, {
    userId: payload.userId,
    role: payload.role ?? "guest",
    clientId: client_id as string,
    redirectUri: redirect_uri as string,
    createdAt: new Date(),
  });

  const url = new URL(redirect_uri as string);
  url.searchParams.set("code", code);
  if (redirect) url.searchParams.set("redirect", redirect as string);
  return sendRedirect(event, url.toString());
});
