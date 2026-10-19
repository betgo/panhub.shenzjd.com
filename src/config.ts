/**
 * 接口地址（硬编码，指向 PanHub 官方服务）
 *
 * 本工程是 PanHub 开源的**纯静态前台**，只做两件事：
 *   1. 调 API 搜索
 *   2. 调 API「获取」（转存归因）
 * 登录交给 wx-auth 公共组件，数据由官方 API 提供。
 *
 * 为什么写死地址：搜索与「获取」是强登录接口，登录态由官方服务统一校验，
 * 换地址并不能绕过校验；写死可避免部署方误配导致页面白屏。
 */
export const API_BASE = "https://panhub.shenzjd.com/api";

/** wx-auth 公共登录服务（登录态唯一签发方） */
export const WX_AUTH_API_BASE = "https://wx-auth.shenzjd.com";

/**
 * wx-auth-sdk UMD 包（全局单例 window.WxAuth）的 CDN 候选列表。
 *
 * 容灾（对齐官方站 2026-09-20）：unpkg 主源、jsdelivr 备源——服务器在海外，
 * 约七成用户在中国，unpkg 一旦不可达（TCP 黑洞时 onerror/onload 都不触发），
 * 认证弹窗这条硬门槛会直接不可用。按列表顺序尝试，单个失败/超时立即切下一个。
 *
 * 版本下限（对齐官方站 2026-09-24）：匿名票据 getOrCreateAnonTicket 需
 * SDK ≥1.2.44——unpkg 锁 ^1.2.44（minor 自动跟进），jsdelivr 锁 @1（major
 * 锁定）。major breaking 不会静默上线。
 */
export const WX_AUTH_SDK_URLS: readonly string[] = [
  "https://unpkg.com/wx-auth-sdk@^1.2.44/dist/wx-auth.umd.js",
  "https://cdn.jsdelivr.net/npm/wx-auth-sdk@1/dist/wx-auth.umd.js",
];

/** 主源（旧配置名保留：app 内动态补插兜底仍先试主源） */
export const WX_AUTH_SDK_URL = WX_AUTH_SDK_URLS[0];

export const SITE_NAME = "PanHub";

/** 每轮搜索的累计结果上限（与后端默认一致：达到后出现「继续」） */
export const MAX_RESULTS_PER_ROUND = 90;


/**
 * 二次转存后端（你的账号转存再分享）
 *
 * 优先级：构建时 VITE_RESHARE_API_BASE → 运行时 localStorage.RESHARE_API_BASE → 默认 Vercel 正式地址
 * GitHub Pages 是 https，必须填 https 公网地址，不能用 http://127.0.0.1（会被混合内容拦截）。
 * 本地用 http 预览时可在控制台：localStorage.setItem("RESHARE_API_BASE","http://127.0.0.1:8787")
 */
/** 正式二次转存 API（Vercel production） */
const DEFAULT_RESHARE_API_BASE = "https://panhub-reshare.vercel.app";

function readReshareBase(): string {
  const fromEnv = String(import.meta.env.VITE_RESHARE_API_BASE || "").trim().replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  if (typeof localStorage !== "undefined") {
    const fromLs = String(localStorage.getItem("RESHARE_API_BASE") || "").trim().replace(/\/$/, "");
    if (fromLs) return fromLs;
  }
  return DEFAULT_RESHARE_API_BASE;
}

export const RESHARE_API_BASE = readReshareBase();

/** 是否启用二次转存（有 base 即开） */
export const USE_RESHARE = Boolean(RESHARE_API_BASE);

/**
 * 二次转存兜底目标盘：链接盘型未知时用迅雷；
 * 已知盘型（百度 / 夸克 / 迅雷）一律同盘转存，见 resolveReshareTargetDriver。
 */
export const RESHARE_TARGET_DRIVER = "xunlei";

/** 已接入二次转存的源盘（同盘进同盘） */
export const RESHAREABLE_DRIVERS = ["xunlei", "baidu", "quark"] as const;
export type ReshareableDriver = (typeof RESHAREABLE_DRIVERS)[number];

export function isReshareableDriver(id: string | null | undefined): id is ReshareableDriver {
  return Boolean(id && (RESHAREABLE_DRIVERS as readonly string[]).includes(id));
}

/**
 * 按源链接域名决定 target_driver：
 * pan.baidu.com → baidu，pan.quark.cn → quark，pan.xunlei.com → xunlei；
 * 识别不出时返回兜底盘（迅雷）。传 null/空且只要「是否可转存」时请配合 isReshareableDriver(driverOf(url))。
 */
export function resolveReshareTargetDriver(
  urlOrHint?: string | null,
): string {
  const raw = String(urlOrHint || "").trim().toLowerCase();
  if (raw.includes("pan.baidu.com") || raw === "baidu") return "baidu";
  if (raw.includes("pan.quark.cn") || raw === "quark") return "quark";
  if (raw.includes("pan.xunlei.com") || raw === "xunlei") return "xunlei";
  return RESHARE_TARGET_DRIVER;
}
