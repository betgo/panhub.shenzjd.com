/**
 * 二次转存客户端（urldb 契约）
 *
 * POST /api/v1/reshare  → { success, data: { task_id, status } }
 * GET  /api/v1/reshare/:id → { success, data: { status, share_url?, passcode?, error? } }
 *
 * 鉴权令牌绝不能进前端：RESHARE_API_BASE 必须指向「藏密钥的代理」
 *（Hermes Cloudflare tunnel / 本机 scripts/urldb-reshare-proxy.mjs；Vercel 仅可选备选）。
 */
import {
  RESHARE_API_BASE,
  RESHARE_TARGET_DRIVER,
  resolveReshareTargetDriver,
} from "../config";

export type ReshareResult = {
  driver: string;
  share_url: string;
  passcode?: string;
  name?: string;
  expires_at?: string;
  file_id?: string;
  save_url?: string;
};

type UrldbEnvelope<T> = {
  success?: boolean;
  message?: string;
  code?: number;
  data?: T;
};

type CreateData = { task_id?: number | string; status?: string };
type PollData = {
  task_id?: number | string;
  status?: string;
  share_url?: string;
  passcode?: string;
  save_url?: string;
  error?: string | { code?: string; message?: string };
  item_status?: string;
};

function base(): string {
  let b = RESHARE_API_BASE;
  if (typeof localStorage !== "undefined") {
    const ls = String(localStorage.getItem("RESHARE_API_BASE") || "")
      .trim()
      .replace(/\/$/, "");
    if (ls) b = ls;
  }
  return b.replace(/\/$/, "");
}

export function reshareEnabled(): boolean {
  return Boolean(base());
}

function errMessage(payload: UrldbEnvelope<unknown>, fallback: string): string {
  const d = payload?.data as PollData | undefined;
  if (d && typeof d.error === "string" && d.error) return d.error;
  if (d && d.error && typeof d.error === "object" && d.error.message) {
    return String(d.error.message);
  }
  if (payload?.message) return String(payload.message);
  return fallback;
}

export async function createAndWaitReshare(input: {
  url: string;
  name?: string;
  tid?: string;
  /** Extract code when URL has no ?pwd= */
  passcode?: string;
  /** 源盘提示；未传则按 url 域名推断 */
  driverHint?: string;
  /** 目标盘（urldb 侧用 pan_type；与源盘同盘） */
  targetDriver?: string;
  expireDays?: number;
  signal?: AbortSignal;
}): Promise<ReshareResult> {
  const root = base();
  if (!root) throw new Error("未配置二次转存服务地址（RESHARE_API_BASE）");

  const pass = String(input.passcode || "").trim();
  let url = String(input.url || "").trim();
  if (pass && url && !/[?&](?:pwd|password)=/i.test(url)) {
    url += (url.includes("?") ? "&" : "?") + `pwd=${encodeURIComponent(pass)}`;
  }

  const inferred = resolveReshareTargetDriver(input.driverHint || url);
  const panType = String(input.targetDriver || inferred || RESHARE_TARGET_DRIVER)
    .trim()
    .toLowerCase();

  const createRes = await fetch(`${root}/api/v1/reshare`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      url,
      ...(pass ? { pwd: pass } : {}),
      ...(input.name ? { title: input.name } : {}),
      ...(panType ? { pan_type: panType } : {}),
    }),
    signal: input.signal,
  });

  const created = (await createRes.json().catch(() => ({}))) as UrldbEnvelope<CreateData>;
  if (!createRes.ok) {
    throw new Error(errMessage(created, `二次转存创建失败 HTTP ${createRes.status}`));
  }
  if (created.success === false) {
    throw new Error(errMessage(created, "二次转存创建失败"));
  }

  const data = created.data || (created as unknown as CreateData);
  const taskId = data.task_id;
  if (taskId === undefined || taskId === null || taskId === "") {
    throw new Error("二次转存未返回 task_id");
  }

  // 若创建响应已是终态（代理偶发同步完成）
  const early = data as PollData;
  if (early.status === "done" && early.share_url) {
    return {
      driver: panType,
      share_url: String(early.share_url),
      passcode: early.passcode || pass || undefined,
      name: input.name,
      save_url: early.save_url,
    };
  }

  const started = Date.now();
  const timeoutMs = 3 * 60_000;
  let delay = 1500;

  while (Date.now() - started < timeoutMs) {
    if (input.signal?.aborted) throw new Error("已取消");
    await new Promise((r) => setTimeout(r, delay));
    const pollRes = await fetch(`${root}/api/v1/reshare/${encodeURIComponent(String(taskId))}`, {
      headers: { Accept: "application/json" },
      signal: input.signal,
    });
    const view = (await pollRes.json().catch(() => ({}))) as UrldbEnvelope<PollData>;
    if (!pollRes.ok) {
      throw new Error(errMessage(view, `二次转存查询失败 HTTP ${pollRes.status}`));
    }
    const pd = view.data || (view as unknown as PollData);
    const status = String(pd.status || "");
    if (status === "done" && pd.share_url) {
      return {
        driver: panType,
        share_url: String(pd.share_url),
        passcode: pd.passcode || pass || undefined,
        name: input.name,
        save_url: pd.save_url,
      };
    }
    if (status === "failed") {
      throw new Error(errMessage({ ...view, data: pd }, "二次转存失败"));
    }
    delay = 1500;
  }
  throw new Error("二次转存超时，请稍后重试");
}
