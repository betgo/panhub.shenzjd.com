import { isReshareableDriver } from "../config";
import { reshareEnabled } from "../api/reshare";
import { useTransfer } from "../composables/useTransfer";
import type { DailyResourceItem } from "../api/daily";

/** 与精选一致：按盘型名识别可转存驱动；补上 UC（RESHAREABLE_DRIVERS 已含） */
export function driverFromPlatform(platform: string): string | null {
  const p = String(platform || "").toLowerCase();
  if (p.includes("xunlei") || p.includes("thunder")) return "xunlei";
  if (p.includes("quark")) return "quark";
  if (p.includes("baidu")) return "baidu";
  if (p === "uc" || p.includes("uc盘") || p.includes("uc网盘")) return "uc";
  return null;
}

export function canReshareDaily(item: { platform: string; shareUrl: string }): boolean {
  if (!reshareEnabled()) return false;
  const d = driverFromPlatform(item.platform);
  if (isReshareableDriver(d)) return true;
  try {
    const host = new URL(item.shareUrl).hostname;
    if (
      host.includes("xunlei") ||
      host.includes("quark") ||
      host.includes("baidu") ||
      host.includes("uc.cn")
    ) {
      return true;
    }
  } catch {
    /* ignore */
  }
  return false;
}

export function passcodeOf(item: DailyResourceItem): string {
  const code = item.passcode || "";
  return code && !item.shareUrl.includes(code) ? code : "";
}

/** 左键：reshare 开着且盘型可转则走获取弹窗，否则新窗打开分享链。修饰键/中键保留原生打开。 */
export async function openOrTransferDaily(
  item: DailyResourceItem,
  ev?: MouseEvent,
): Promise<void> {
  if (ev && (ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey || ev.button === 1)) {
    return;
  }
  ev?.preventDefault();
  if (canReshareDaily(item)) {
    const { requestTransfer } = useTransfer();
    await requestTransfer({
      url: item.shareUrl,
      name: item.name,
      password: passcodeOf(item) || item.passcode,
    });
    return;
  }
  window.open(item.shareUrl, "_blank", "noopener,noreferrer");
}
