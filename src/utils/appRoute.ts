/**
 * 轻量路径状态（不用 vue-router）。
 * Hermes 部署在站点根路径 / ，GitHub Pages 在 /panhub.shenzjd.com/ 。
 */
const PAGES_PREFIX = "/panhub.shenzjd.com";

/** 站点根路径，始终以 / 结尾（Pages 为 /panhub.shenzjd.com/ ） */
export function getSiteBasePath(): string {
  if (typeof window === "undefined") return "/";
  const path = window.location.pathname;
  if (path === PAGES_PREFIX || path.startsWith(`${PAGES_PREFIX}/`)) {
    return `${PAGES_PREFIX}/`;
  }
  return "/";
}

/** 去掉站点前缀后的应用路由，如 "/" 或 "/daily" */
export function getAppRoute(): string {
  if (typeof window === "undefined") return "/";
  const path = window.location.pathname;
  let rest = path;
  if (path === PAGES_PREFIX || path.startsWith(`${PAGES_PREFIX}/`)) {
    rest = path.slice(PAGES_PREFIX.length) || "/";
  }
  rest = rest.replace(/\/+$/, "") || "/";
  if (!rest.startsWith("/")) rest = `/${rest}`;
  return rest;
}

export function isDailyRoute(): boolean {
  return getAppRoute() === "/daily";
}

export function buildAppHref(
  routePath: string,
  query?: Record<string, string | undefined | null>,
): string {
  const base = getSiteBasePath();
  const rel = routePath.replace(/^\/+/, "");
  const pathname = rel ? `${base}${rel}` : base;
  const qs = new URLSearchParams();
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null && v !== "") qs.set(k, v);
    }
  }
  const q = qs.toString();
  return q ? `${pathname}?${q}` : pathname;
}

export function navigateApp(
  routePath: string,
  query?: Record<string, string | undefined | null>,
  opts?: { replace?: boolean },
): void {
  const href = buildAppHref(routePath, query);
  if (opts?.replace) window.history.replaceState(null, "", href);
  else window.history.pushState(null, "", href);
}
