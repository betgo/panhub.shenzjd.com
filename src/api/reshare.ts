/**
 * 二次转存客户端：POST 创建任务 + 轮询直到 done/failed
 */
import { RESHARE_API_BASE, RESHARE_TARGET_DRIVER } from "../config";

export type ReshareResult = {
  driver: string;
  share_url: string;
  passcode?: string;
  name?: string;
  expires_at?: string;
  file_id?: string;
};

export type ReshareTaskView = {
  task_id: string;
  status: string;
  result?: ReshareResult | null;
  error?: { code?: string; message?: string } | null;
  progress?: { step?: string; message?: string } | null;
};

function base(): string {
  // 运行时再读一次 localStorage，方便不重新构建就改地址
  let b = RESHARE_API_BASE;
  if (typeof localStorage !== "undefined") {
    const ls = String(localStorage.getItem("RESHARE_API_BASE") || "").trim().replace(/\/$/, "");
    if (ls) b = ls;
  }
  return b.replace(/\/$/, "");
}

export function reshareEnabled(): boolean {
  return Boolean(base());
}

export async function createAndWaitReshare(input: {
  url: string;
  name?: string;
  tid?: string;
  driverHint?: string;
  expireDays?: number;
  signal?: AbortSignal;
}): Promise<ReshareResult> {
  const root = base();
  if (!root) throw new Error("未配置二次转存服务地址（RESHARE_API_BASE）");

  const createRes = await fetch(`${root}/api/v1/reshare`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      upstream: {
        url: input.url,
        name: input.name,
        tid: input.tid,
        driver_hint: input.driverHint || RESHARE_TARGET_DRIVER,
      },
      target_driver: RESHARE_TARGET_DRIVER,
      options: { expire_days: input.expireDays ?? 7 },
    }),
    signal: input.signal,
  });
  const created = (await createRes.json().catch(() => ({}))) as ReshareTaskView & {
    cached?: boolean;
    poll_after_ms?: number;
  };
  if (!createRes.ok && createRes.status !== 202) {
    throw new Error(
      (created as any)?.error?.message ||
        (created as any)?.message ||
        `二次转存创建失败 HTTP ${createRes.status}`,
    );
  }
  if (created.status === "done" && created.result?.share_url) {
    return created.result;
  }
  const taskId = created.task_id;
  if (!taskId) throw new Error("二次转存未返回 task_id");

  const started = Date.now();
  const timeoutMs = 3 * 60_000;
  let delay = Math.max(800, created.poll_after_ms || 1500);

  while (Date.now() - started < timeoutMs) {
    if (input.signal?.aborted) throw new Error("已取消");
    await new Promise((r) => setTimeout(r, delay));
    const pollRes = await fetch(`${root}/api/v1/reshare/${encodeURIComponent(taskId)}`, {
      headers: { Accept: "application/json" },
      signal: input.signal,
    });
    const view = (await pollRes.json().catch(() => ({}))) as ReshareTaskView;
    if (!pollRes.ok) {
      throw new Error(`二次转存查询失败 HTTP ${pollRes.status}`);
    }
    if (view.status === "done" && view.result?.share_url) return view.result;
    if (view.status === "failed") {
      throw new Error(view.error?.message || view.progress?.message || "二次转存失败");
    }
    delay = 1500;
  }
  throw new Error("二次转存超时，请稍后重试");
}
