/** Asia/Shanghai 日期对齐：与官网一样用 UTC 毫秒 + 8 小时（288e5）再读 UTC 日历。 */

const SHANGHAI_OFFSET_MS = 288e5;

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function shifted(ts: number): Date {
  return new Date(ts + SHANGHAI_OFFSET_MS);
}

/** 时间戳所在上海日历日的 00:00（以 epoch ms 表示） */
export function shanghaiDayStart(ts: number): number {
  const d = shifted(ts);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - SHANGHAI_OFFSET_MS;
}

/** YYYY-MM-DD（上海日历） */
export function shanghaiDateKey(ts: number): string {
  const d = shifted(ts);
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}

/** HH:MM（上海时区） */
export function shanghaiHm(ts: number | null | undefined): string {
  if (!ts) return "";
  const d = shifted(ts);
  return `${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}`;
}

/** 「今天」/「昨天」/「M月D日」或「YYYY年M月D日」 */
export function shanghaiDayLabel(ts: number): string {
  const key = shanghaiDateKey(ts);
  const today = shanghaiDateKey(Date.now());
  const yesterday = shanghaiDateKey(shanghaiDayStart(Date.now()) - 864e5);
  if (key === today) return "今天";
  if (key === yesterday) return "昨天";
  const d = shifted(ts);
  const md = `${d.getUTCMonth() + 1}月${d.getUTCDate()}日`;
  const thisYear = shifted(shanghaiDayStart(Date.now())).getUTCFullYear();
  return d.getUTCFullYear() === thisYear ? md : `${d.getUTCFullYear()}年${md}`;
}

export function itemTimestamp(item: { createdAt?: number; publishedAt?: number }): number {
  return item.createdAt || item.publishedAt || 0;
}
